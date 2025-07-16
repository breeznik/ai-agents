// @ts-nocheck
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import z from "zod";
import * as readline from "node:readline/promises";
import { jsonParser, normalizeToYYYYMMDD, parseLLMResponse, titleSanitizer } from "@/utils/helpers.js";
import { agent_intro, BookingConfirmationInstruction, bundleInstruction, classifyInstruction, contactInfoInstruction, indiScheduleInstruction, PaymentProcessingInformation, productTypeInstruction } from "@/utils/instructions.js";
import { interrupt } from "@langchain/langgraph";
import { toolMap } from "./mcp.client";
import axios from "axios";
import { createAgent, localLLM } from "./local.llm";

export const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

dotenv.config();
// let currentNode = null;
let memory = [];
const messageObj = (role, input) => ({ role, content: input });

// --- LLM Setup ---
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o",
});

const cartDataSchema = z.object({
  adulttickets: z.number(),
  amount: z.number(),
  arrivalscheduleid: z.number(),
  cartitemid: z.number(),
  childtickets: z.number(),
  departurescheduleid: z.number(),
  groupbooking: z.enum(["Y", "N"]),
  groupid: z.string(),
  infanttickets: z.number(),
  optional: z.object({
    occasioncomment: z.string(),
    paddlename: z.string(),
    specialoccasion: z.string(),
  }),
  passengers: z.array(z.object({
    dob: z.string(),
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    passengertype: z.enum(["ADULT", "CHILD", "INFANT"]),
    phone: z.string(),
    title: z.enum(["MR", "MRS", "MISS", "MASTER"]),
  })),
  primarycontact: z.object({
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    phone: z.string(),
    title: z.enum(["MR", "MRS", "MISS", "MASTER"]),
  }),
  productid: z.enum(["ARRIVALONLY", "DEPARTURELOUNGE", "ARRIVALBUNDLE"]),
  referencenumber: z.string(),
  secondarycontact: z.object({
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    phone: z.string(),
    title: z.enum(["MR", "MRS", "MISS", "MASTER"]),
  })
});

const stateSchema = z.object({
  sessionid: z.string(),
  input: z.string(),
  flow: z.enum(["booking", "general"]),
  done: z.boolean(),
  currentNode: z.string().optional(), // <--- NEW
  cart: z.record(z.string(),cartDataSchema),
  currentCartId: z.number().default(0),
  totalAmount: z.number(),
  collected: z.object({
    A: z.any(),
    D: z.any(),
  }).default({
    A: null,
    D: null,
  }),
  scheduleData: z.object({
    A: z.any(),
    D: z.any(),
  }),
  productid: z.enum(["ARRIVALONLY", "DEPARTURELOUNGE", "ARRIVALBUNDLE", ""]).default(""),
  reseravationData: z.any(),
  proceedToPayment: z.boolean(),
  paymentInformation: z.any(),
  messages: z.array(),
  paymentHtml: z.string().optional(),
  confirmCart: z.any()
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
  // console.log(res.content);
  const flow = res.content.toLowerCase();
  // console.log("llm flow : ", flow);

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
    responseHandler["A"] = await toolMap["getSchedule"].func({ ...state.collected.A, sessionid: state.sessionid });
    responseHandler["A"] = await jsonParser(responseHandler["A"][0])
  }
  if (state.productid === "DEPARTURELOUNGE" || state.productid === "ARRIVALBUNDLE") {
    responseHandler["D"] = await toolMap["getSchedule"].func({ ...state.collected.D, sessionid: state.sessionid });
    responseHandler["D"] = await jsonParser(responseHandler["D"][0])
  }
  // console.log("response getschedule", responseHandler)
  return {
    done: true,
    scheduleData: responseHandler,
    currentNode: "schedulecall",
  };
};

const reserveStep = async (state) => {
  if(state.reseravationData){
    return {
      currentNode: "reservation"
    }
  }
  const direction = state.productid === "ARRIVALONLY" ? "A" : "D";

  const response = await toolMap["reserveLounge"].func({
    adulttickets: state.collected[direction].tickets.adulttickets,
    childtickets: state.collected[direction].tickets.childtickets,
    scheduleData: state.scheduleData,
    productid: state.productid, 
    sessionid: state.sessionid
  });
  // console.log("reserver response : ", response);
  const reseravationData = await jsonParser(response[0]);
  return { 
    reseravationData: reseravationData, 
    currentNode: "reservation",
    currentCartId: reseravationData.cartitemid,
   };
};

const answerGeneral = async (state) => {
  const res = await llm.invoke(memory);
  const asistantMessage = messageObj("assistant", res.content);
  memory.push(asistantMessage);

  // console.log("general answer : ", res.content);
  return {productid:''};
};

const infoCollector = async (state) => {
  // currentNode = "scheduleinfo";
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
  // const response = await llm.invoke([messageObj("system", prompt)]);
  let parsed = await jsonParser(response.content);

  // console.log("🔍 Parsed object of schedule info:", parsed);

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

  return {
    done,
    collected: updatedCollected,
    currentNode: "scheduleinfo",
  };
};

const productType = async (state) => {
  // currentNode = "startBooking";
  const prompt = `${agent_intro} ${productTypeInstruction}`;
  const userMessage = messageObj("user", state.input);
  const systemMessage = messageObj("system", prompt);
  memory.push(userMessage);
  const response = await llm.invoke([...memory, systemMessage]);
  let parsed = await jsonParser(response.content);
  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }
  // console.log("productID::", state.productid,parsed.productid);

  let sessionid = state.sessionid;
  if(!state.sessionid){
    const loginReq = {
      failstatus: 0,
      request: {
        getpaymentgateway: "Y",
        languageid: 'en',
        marketid: 'JAM',
        password: process.env.STATIC_PASSWORD,
        username: process.env.STATIC_USERNAME
      }
    }
    sessionid = await axios.post(`${process.env.DEVSERVER}/login`, loginReq)
    sessionid = sessionid?.data?.data?.sessionid
  }
  return {
    sessionid: sessionid,
    done: parsed.done,
    // collected: { ...state.collected, productid: parsed.collected.productid },
    productid: parsed.productid,
    currentNode: "startBooking",
  };
};

const contactHandler = async (state) => {
  const userMessage = messageObj("user", state.input);
  memory.push(userMessage);

  // currentNode = "contactinfo";
  const direction = state.productid === "ARRIVALONLY" ? "A" : "D";
  const adulttickets = state.collected[direction].tickets.adulttickets
  const childtickets = state.collected[direction].tickets.childtickets

  const prompt = `${agent_intro} ${contactInfoInstruction(adulttickets, childtickets)}`;
  const response = await llm.invoke([...memory, messageObj("system", prompt)]);
  let parsed = await jsonParser(response.content);

  memory.push(messageObj("assistant", parsed.message));

  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }

  const passengers = []

  const passengersDetails = parsed.passengerDetails || [];

  for(let i = 0; i < adulttickets; i++){
    const passenger = {
      title: titleSanitizer(passengersDetails.adults[i].title),
      firstname: passengersDetails.adults[i].firstname,
      lastname: passengersDetails.adults[i].lastname,
      email: passengersDetails.adults[i].email,
      phone: parsed.contact.phone,
      dob: normalizeToYYYYMMDD(passengersDetails.adults[i].dob),
      passengertype: "ADULT",
    }
    passengers.push(passenger);
  }

  for(let i = 0; i < childtickets; i++){
    const passenger = {
      title: titleSanitizer(passengersDetails.children[i].title),
      firstname: passengersDetails.children[i].firstname,
      lastname: passengersDetails.children[i].lastname,
      email: passengersDetails.children[i].email,
      phone: parsed.contact.phone,
      dob: normalizeToYYYYMMDD(passengersDetails.children[i].dob),
      passengertype: "CHILD",
    }
    passengers.push(passenger);
  }

  const primaryContact = {
    title: titleSanitizer(parsed.contact.title),
    firstname: parsed.contact.firstname,
    lastname: parsed.contact.lastname,
    email: parsed.contact.email,  
    phone: parsed.contact.phone,
  }

  const cartItems = {
    adulttickets: adulttickets,
    amount: state.reseravationData.retail,
    arrivalscheduleid: state?.reseravationData?.arrivalscheduleid || 0,
    cartitemid: state.currentCartId,
    childtickets: childtickets,
    departurescheduleid: state?.reseravationData?.departurescheduleid || 0,
    groupbooking: "N",
    groupid: "NA",
    infanttickets: 0,
    optional: { occasioncomment: "", paddlename: "AI Agent", specialoccasion: "VACATION" },
    passengers: passengers,
    primarycontact: primaryContact,
    productid: state.productid,
    referencenumber: '',
    secondarycontact: {
      email: "",
      firstname: "",
      lastname: "",
      phone: "",
      title: "MR"
    }
  }

  const cart = {...state.cart,
    [state.currentCartId]: cartItems
  }

  // console.log("Contact handler cart:", cart);


  return {
    done: parsed.done,
    cart: cart,
    collected:{ A:null, D:null },
    scheduleData:{ A:null, D:null },
    productid:'',
    reseravationData:null,
    currentNode: "contactinfo",
  };
};

const setContactStep = async (state) => {

  const primaryContactsFromCurrentCart = state.cart[state.currentCartId]?.primarycontact;
  const response = await toolMap["setcontact"].func({
    firstname: primaryContactsFromCurrentCart.firstname,
    lastname: primaryContactsFromCurrentCart.lastname,
    email: primaryContactsFromCurrentCart.email,
    phone: primaryContactsFromCurrentCart.phone,
    cartitemid: state.currentCartId,
    sessionid: state.sessionid
  });
  // console.log("setcontact response ", response);
  return {
    done: true,
    currentNode: "setcontact",
  };
};

const carthandler = async (state) => {
  // currentNode = "cartconfirmation";
  const userMessage = messageObj("user", state.input);
  memory.push(userMessage);
  const cartdata = [];
  let totalAmount = 0;

  for (const cartitemid in state.cart){
    const item = state.cart[cartitemid];
    const cartItem = {
      producttype: item.productid,
      passengersCount: item.passengers.length,
      amount: item.amount,
      cartitemid: item.cartitemid,
    }
    totalAmount = totalAmount + item.amount;
    cartdata.push(cartItem);
  }

  const prompt = `${agent_intro} ${BookingConfirmationInstruction(cartdata, totalAmount)}`;
  const response = await llm.invoke([...memory, messageObj("system", prompt)]);
  let parsed = await jsonParser(response.content);
  memory.push(messageObj("assistant", parsed.message));
  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }

  const newNode = parsed.done ? parsed.proceedToPayment ? "paymentinfo" : "startBooking" : "cartconfirmation";
  // currentNode = newNode;
  if(parsed.done && !parsed.proceedToPayment){
    memory = [memory[memory.length - 1]];
  }


  // console.log("cart handler State::",state)

  return{
    done: parsed.done,
    proceedToPayment: parsed.proceedToPayment,
    currentNode: "cartconfirmation",
    totalAmount: totalAmount,
    currentCartId:0
  }

}

const productSuccess = async (state) => {
  console.log("congrats your product is booked");
  return {};
};

const callpayment = async (state) => {
  let response = await toolMap["payment"].func({ state });
  response = await jsonParser(response[0]);
  console.log("payment response" , response)
  console.log("callpayment response ", response);
  
  return { }
};


const paymentHandler = async (state) => {
  const userMessage = messageObj("user", state.input);
  memory.push(userMessage)
  // currentNode = 'paymentinfo';
  const prompt = `${agent_intro} ${PaymentProcessingInformation}`;
  const response = await llm.invoke([...memory, messageObj("system", prompt)]);
  let parsed = await jsonParser(response.content);

  memory.push(messageObj("assistant", parsed.message));

  if (!parsed?.done) {
    return interrupt({ prompt: parsed.message });
  }

  console.log("payment handler response", parsed);

  return {
    done: parsed.done,
    paymentInformation: parsed.paymentInformation,
    currentNode: "paymentinfo"
  }
}

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
graph.addNode("cartconfirmation",carthandler)
graph.addNode("paymentinfo", paymentHandler)
graph.addNode("callpayment", callpayment);

graph.addConditionalEdges(START, (state) => {
  return state.currentNode || "classify";
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
graph.addConditionalEdges("paymentinfo", (state) => {
  return state.done ? "callpayment" : "paymentinfo"
});

graph.addConditionalEdges("cartconfirmation",(state)=>{
  return state.done ? (state.proceedToPayment ? "paymentinfo" : "startBooking"): "cartconfirmation";
})

graph.addEdge("general", END);
graph.addEdge("schedulecall", "reservation");
graph.addEdge("reservation", "contactinfo");
graph.addEdge("setcontact", "cartconfirmation");
graph.addEdge("callpayment", "productend")
graph.addEdge("productend", END)

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

  // console.log("🎯 Final State:", state);
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
