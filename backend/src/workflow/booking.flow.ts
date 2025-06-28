// @ts-nocheck
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import z from "zod";
import * as readline from "node:readline/promises";

import { jsonParser } from "@/utils/helpers.js";
import { agent_intro, classifyInstruction, contactInfoInstruction, indiScheduleInstruction, productTypeInstruction } from "@/utils/instructions.js";
import { interrupt } from "@langchain/langgraph";
import { toolMap } from "./mcp.client";

export const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

dotenv.config();
let currentNode = null;
const memory = [];
const messageObj = (role, input) => ({ role, content: input });

// --- LLM Setup ---
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o",
});

const stateSchema = z.object({
  input: z.string(),
  flow: z.enum(["booking", "general"]),
  done: z.boolean(),
  currentNode: z.string().optional(), // <--- NEW
  collected: z.object({
    A: z.any(),
    D: z.any(),
  }),
  scheduleData: z.object({
    A: z.any(),
    D: z.any(),
  }),
  productid: z.enum(["ARRIVALONLY", "DEPARTURE", "ARRIVALBUNDLE"]),
  contactInfo: z.object({
    title: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  reseravationData: z.any(),
  messages: z.array(),
});

const classify = async (state) => {
  const prompt = messageObj(
    "system",
    `
    ${classifyInstruction}`
  );
  const userMessage = messageObj("user", state.input);
  memory.push(userMessage);

  const res = await llm.invoke([...memory, prompt]);
  console.log(res.content);
  const flow = res.content.toLowerCase();
  console.log("llm flow : ", flow);

  return { flow };
};

const scheduleStep = async (state) => {
  const responseHandler = {
    A: null,
    D: null,
  };
  if (
    state.productid === "ARRIVALONLY" ||
    state.productid === "ARRIVALBUNDLE"
  ) {
    responseHandler["A"] = await toolMap["getSchedule"].func(state.collected.A);
    responseHandler["A"] = await jsonParser(responseHandler["A"][0])
  }
  if (state.productid === "DEPARTURE" || state.productid === "ARRIVALBUNDLE") {
    responseHandler["D"] = await toolMap["getSchedule"].func(state.collected.D);
    responseHandler["D"] = await jsonParser(responseHandler["D"][0])
  }

  console.log("respionse getschedule", responseHandler)
  return {
    done: true,
    scheduleData: responseHandler,
    currentNode: "schedulecall",
  };
};

const reserveStep = async (state) => {
  console.log(state);
  const direction = state.productid === "ARRIVALONLY" ? "A" : "D";
  console.log('reserposen payload', state)
  const response = await toolMap["reserveLounge"].func({
    adulttickets: state.collected[direction].tickets.childtickets,
    childtickets: state.collected[direction].tickets.adulttickets,
    scheduleData: { A: state.scheduleData.A, D: null },
    productid: state.productid,
  });
  console.log("reserver response : ", response);
  return { reseravationData: response, currentNode: "reservation" };
};

const answerGeneral = async (state) => {
  const res = await llm.invoke(memory);
  const asistantMessage = messageObj("assistant", res.content);
  memory.push(asistantMessage);

  console.log("general answer : ", res.content);
  return {};
};

const infoCollector = async (state) => {
  currentNode = "scheduleinfo";
  const isBundle = state.productid === "ARRIVALBUNDLE";
  let currentDirection;

  if (isBundle) {
    if (!state.collected.A) {
      currentDirection = "ARRIVAL";
    } else if (!state.collected.D) {
      currentDirection = "DEPARTURE";
    }
  }

  const prompt = `${agent_intro} 
  ${isBundle ? bundleInstruction(currentDirection) : indiScheduleInstruction}
  `;

  const userMessage = messageObj("user", state.input);
  memory.push(userMessage);

  const response = await llm.invoke([...memory, messageObj("system", prompt)]);
  let parsed = await jsonParser(response.content);

  // console.log("🔍 Parsed object:", parsed);

  memory.push(messageObj("assistant", parsed.message));

  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }
  // Update collected directions
  const updatedCollected = {
    ...state.collected,
    A: parsed.collected["A"],
    D: parsed.collected["D"],
  };

  const isArrivalDone = updatedCollected.A;
  const isDepartureDone = updatedCollected.D;
  let done = parsed.done;

  if (isBundle) {
    done = isArrivalDone && isDepartureDone;
  }

  // console.log("state done : ", done, updatedCollected);
  return {
    done,
    collected: updatedCollected,
    currentNode: "scheduleinfo",
  };
};

const productType = async (state) => {
  currentNode = "startBooking";
  const prompt = `${agent_intro} ${productTypeInstruction}`;
  const userMessage = messageObj("user", state.input);
  const systemMessage = messageObj("system", prompt);
  memory.push(userMessage);
  const response = await llm.invoke([...memory, systemMessage]);
  let parsed = await jsonParser(response.content);
  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }
  return {
    done: parsed.done,
    collected: { ...state.collected, productid: parsed.collected.productid },
    productid: parsed.collected.productid,
    currentNode: "startBooking",
  };
};

const contactHandler = async (state) => {
  const userMessage = messageObj("user", state.input);
  memory.push(userMessage);

  currentNode = "contactinfo";
  const prompt = `${agent_intro} ${contactInfoInstruction}`;
  const response = await llm.invoke([...memory, messageObj("system", prompt)]);
  let parsed = await jsonParser(response.content);

  memory.push(messageObj("assistant", parsed.message));

  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }

  return {
    done: parsed.done,
    contactInfo: parsed.contact,
    currentNode: "contactinfo",
  };
};
const setContactStep = async (state) => {
  const response = await toolMap["setcontact"].func({
    ...state.contactInfo,
    reseravationData: state.reseravationData.cartitemid,
  });
  console.log("setcontact response ", response);
  return {};
};

const productSuccess = async (state) => {
  console.log("congrats your product is booked");
  return {};
};

const graph = new StateGraph({
  state: stateSchema,
  messages: memory,
});

graph.addNode("classify", classify);
graph.addNode("general", answerGeneral);
graph.addNode("startBooking", productType);
graph.addNode("schedulecall", scheduleStep);
graph.addNode("reservation", reserveStep);
graph.addNode("scheduleinfo", infoCollector);
graph.addNode("contactinfo", contactHandler);
graph.addNode("setcontact", setContactStep);
graph.addNode("productend", productSuccess);
graph.addNode("paymenthadnler", () => { });
// graph.addNode("callapayment", callpayment);
graph.addConditionalEdges(START, (state) => {
  return currentNode || "classify";
});

graph.addConditionalEdges("classify", (state) => {
  if (state.flow) return state.flow === "booking" ? "startBooking" : "general";
  return "classify";
});

graph.addConditionalEdges("startBooking", (state) => {
  return state.done ? "scheduleinfo" : "startBooking";
});

graph.addConditionalEdges("scheduleinfo", (state) => {
  return state.done ? "schedulecall" : "scheduleinfo";
});

graph.addConditionalEdges("contactinfo", (state) => {
  return state.done ? "setcontact" : "contactinfo";
});

graph.addEdge("setcontact", "paymenthadnler");

graph.addConditionalEdges("paymenthadnler", (state) => {
  state.done ? "callpaymnet" : "paymenthadnler";
});

graph.addEdge("general", END);
graph.addEdge("schedulecall", "reservation");
graph.addEdge("reservation", "contactinfo");
graph.addEdge("setcontact", "productend");
graph.addEdge("productend", END);

export const compiledGraph = graph.compile({
  checkpointer: new MemorySaver(),
  start: (state) => state.currentNode || START,
});

async function run(input, previousState = {}) {
  const cfg = { configurable: { thread_id: "booking-session" } };

  const initState = {
    ...previousState,
    input,
  };

  const state = await compiledGraph.invoke(initState, cfg);

  if (state.__interrupt__) {
    const prompt = state.__interrupt__[0].value.prompt;
    const reply = await terminal.question(`🧠 ${prompt} `);
    // 👇 Re-invoke with updated state, continuing from last point
    return await run(reply, {
      ...state,
      input: reply,
    });
  }

  console.log("🎯 Final State:", state);
}
// --- Main Loop ---
async function mainLoop() {
  while (true) {
    const input = await terminal.question("you: ");
    if (input.toLowerCase().trim() === "exit") {
      console.log("👋 Exiting...");
      process.exit(0);
    }
    await run(input);
  }
}

mainLoop();
