// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Message } from "./Messages";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, clearMessages } from "../store/slices/ChatReducer";
import axios from "axios";
import { devServer, staticLoginCred } from "../utils/constants";

const LOUNGE = [
  { name: "Club Mobay / Sangster Intl (SIA)", value: "SIA" },
  { name: "Club Kingston / Norman Manley Intl (NMIA)", value: "NMIA" },
];

const TabStrucutre = {
  name: "",
  value: "",
};

const suggestionGroups = {
  quickStart: [
    "Book both arrival and departure lounges",
    "Book a departure lounge",
    "Book an arrival lounge",
  ],
  locationSpecific: [
    "Help me find a lounge at Sangster International (SIA)",
    "Help me find a lounge at Norman Manley International (NMIA)",
  ],
  utility: [
    "Check lounge availability for my flight",
    "Add lounge to my booking cart",
    "I want to see flights for my travel date",
    "How many tickets can I book?",
  ],
  timeSensitive: ["I want to book a lounge for today"],
};
const loginObj = {
  username: staticLoginCred.username,
  sessionid: staticLoginCred.sesionId,
};
const productidConstant = {
  ARRIVALONLY: "ARRIVALONLY",
  DEPARTURELOUNGE: "DEPARTURELOUNGE",
  ARRIVALBUNDLE: "ARRIVALBUNDLE",
};

const airportClubs = {
  NMIA: "Club Kingston / Norman Manley Intl",
  SIA: "Club Mobay / Sangster Intl",
};

const systemInstruction = `
Flight Lounge Booking Asistant System Instruction

# Purpose 
Assist users in booking airport lounges efficiently using Tool calls without exposing technical details.

## Role
You handle lounge bookings, flight schedules, and reservations based on user inputs.

## Constraints
- Keep responsed to one Sentences, do not inlcude other details.
- Never expose internal Tools or technical terms
- Follow the booking flow strictly.
- before asking for departure flight call "getSchedule".

## Behaviour
- Prioritize completing the booking process quickly
- Always determine the next required step immediatly.
- before asking for departure flight call "getSchedule".


## Tools Avaialable
- **getLounge** - Fetch Available lounges
- **getSchedule** - Retrieve flight schedules using airportid, direction ("A" or "D"), and travel date , must be called for each schedule step.
- **getReservation** - Confirm booking using flightId and passenger counts.

LOUNGE -
  NAME- Club Mobay / Sangster Intl , ID -  "SIA",
  NAME - Club Kingston / Norman Manley Intl , ID - "NMIA"
  
---

## Booking Flow - ARRIVALONLY OR DEPARTURELOUNGE

### Step 1: Lounge Selection
- If lounge is not provided, call **getLounge** immediately.

### step 2: Travel Date
- Once launge is Selected, ask for Travel Date.
- Reject past dates.
- go to step 3

## step 3:
- Call **getSchedule** , and give prompt for selecting the Flight.
- step 3 is not skipable.

### step 4: Passenger Info
- Ask for number of adult and children.

### step 5: Rservation
- Call **getReservation** with scheduleId and passenger counts.

## Booking Flow - ARRIVALBUNDLE

note - if the user have given you data for someparts then you can skip it, but if you were to execute step then you have to call the tool mentioned in that step first.

note - even though all the information is given ,  getSchedule tool call is mendatory when asking for departure flight details.


1. call Tool "getLounge" and ask for arrival lounge. 
2. get Travel Date for arrival. 
3. Call Tool "getSchedule" [mendatory].
4. call Tool "getLounge" and ask for departure lounge. 
5. get Travel Date For Departure. 
6. Call Tool "getSchedule" for departure [mendatory].
7. Ask for passanger count for - adult and children. - 
8. Once all required data (arrival and departure flight IDs, passenger count) is available, call 'getReserve' to complete the booking.

    Current Date: ${new Date().toISOString().split("T")[0]}
`;

const groq = createGroq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  baseURL: "https://api.anthropic.com/v1",
});

const xai = createXai({
  apiKey: import.meta.env.VITE_XAI_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
});

const openAI = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  compatibility: "strict",
});

// === Dynamic Model Map ===
const modelOptions = {
  "gpt-4.1-mini": {
    instance: openAI("gpt-4.1-mini"),
    label: "gpt-4.1 mini",
  },
  groq: {
    instance: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    label: "Groq",
  },
  "gemini-2.0-flash": {
    instance: google("gemini-2.0-flash"),
    label: "Gemini 2.0 Flash",
  },
  "gemini-2.0-flash-lite": {
    instance: google("gemini-2.0-flash-lite"),
    label: "Gemini 2.0 Flash Lite",
  },
  "gemini-1.5-flash": {
    instance: google("gemini-1.5-flash"),
    label: "Gemini 1.5 Flash",
  },
  "gemini-1.5-flash-8b": {
    instance: google("gemini-1.5-flash-8b"),
    label: "Gemini 1.5 Flash 8B",
  },
  "gemini-1.5-pro": {
    instance: google("gemini-1.5-pro"),
    label: "Gemini 1.5 Pro",
  },
  "Gemini 2.5 Pro Preview": {
    instance: google("gemini-2.5-pro-preview-05-06"),
    label: "gemini-2.5-pro-preview-05-06",
  },
};

async function getSchedule(direction, airportid, traveldate, loginDetails) {
  const request = {
    username: loginObj.username,
    sessionid: loginObj.sessionid,
    failstatus: 0,
    request: {
      direction: direction,
      airportid: airportid,
      traveldate: traveldate,
    },
  };
  const response = await axios.post(
    devServer("getSchedule"),
    request
  );
  return response.data.data;
}

async function checkAvailbility(
  productid,
  arrivalscheduleid,
  departurescheduleid,
  adulttickets,
  childtickets
) {
  const request = {
    username: loginObj.username,
    sessionid: loginObj.sessionid,
    failstatus: 0,
    request: {
      cartitemid: 0,
      productid: productid,
      ticketsrequested: adulttickets + childtickets,
      adulttickets: adulttickets,
      childtickets: childtickets,
      paymenttype: "GUESTCARD",
      distributorid: "",
      arrivalscheduleid: arrivalscheduleid,
      departurescheduleid: departurescheduleid,
    },
  };
  console.log(request, "request for reserve");
  const response = await axios.post(
    devServer("reservecartitem"),
    request
  );
  console.log("check avialability response , nikhil", response);

  return {
    data: response.data,
    statusMessage: response?.statusMessage || response.data.statusMessage,
    request,
  };
}

const Chat = () => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [currentModel, setCurrentModel] = useState("gemini-2.0-flash");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { messages, trigger } = useSelector((state) => state.chat);
  const dispatch = useDispatch();
  let refResponseHolder = useRef({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const sendMessages = async (
    overrideInput?: string,
    bypassAddition = false
  ) => {
    const inputValue = (overrideInput || input).trim();
    if (!inputValue) return;

    const selected = modelOptions[currentModel];
    if (!selected) return;

    setLoading(true);
    setIsTyping(true);

    try {
      const newMessages = [...messages, { role: "user", content: inputValue }];
      if (!bypassAddition) {
        dispatch(addMessage({ role: "user", content: inputValue }));
      }

      let toolCalled = null;
      const messageToFilter = !bypassAddition ? newMessages : messages;
      const contextMessages = messageToFilter.map((messageObj) => {
        const { componentalData, ...rest } = messageObj;
        return rest;
      });

      const { text } = await generateText({
        messages: contextMessages,
        model: selected.instance,
        system: systemInstruction,
        maxSteps: 5,
        maxRetries: 2,
        tools: {
          getLounge: tool(getLoungeDeclaration),
          getSchedule: tool(getScheduleDeclaration),
          getReservation: tool(getReservationDeclaration),
        },
        onStepFinish({ toolResults, result }) {
          toolResults.forEach((indiTool) => {
            toolCalled = {
              name: indiTool.toolName,
              result: indiTool.result,
            };
            console.log({
              [indiTool.toolName]: indiTool.args,
              response: indiTool.result,
            });

            if (indiTool.toolName === "getSchedule") {
              if (indiTool?.result?.airlines) {
                refResponseHolder[indiTool.toolName] = {
                  ...(refResponseHolder[indiTool.toolName] || {}),
                  [indiTool.args.direction]: indiTool.result.flightschedule,
                };
              }
              console.log("hello", indiTool, refResponseHolder);
            } else if (indiTool.toolName === "checkAvailbility") {
              refResponseHolder[indiTool.toolName] = indiTool.result;
            }
          });
        },
      });

      console.log("new text from asistant", text);

      dispatch(
        addMessage({
          role: "assistant",
          content: text,
          componentalData: toolCalled,
        })
      );

      setInput("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (messages?.length > 0) {
      sendMessages(messages[messages.length - 1].content, true);
    }
  }, [trigger]);

  const isPast = (yyyymmdd) => {
    const inputDate = new Date(
      yyyymmdd.toString().slice(0, 4),
      yyyymmdd.toString().slice(4, 6) - 1,
      yyyymmdd.toString().slice(6, 8)
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate < today;
  };

  const functions = {
    getSchedule: async ({ direction, airportid, traveldate }) => {
      if (!direction || !airportid || !traveldate) {
        return {
          message: "Please provide all the details to fetch airline info",
        };
      } else if (isPast(traveldate)) {
        return {
          message:
            "I'm sorry, but bookings can only be made for today or future dates.",
        };
      } else {
        return getSchedule(direction, airportid, traveldate, loginObj);
      }
    },
    getReservation: async ({
      productid,
      arrivalFlightId,
      departureFlightId,
      adulttickets,
      childtickets,
    }) => {
      let departurescheduleid = null;
      let arrivalscheduleid = null;
      console.log(
        "nikhil here",
        refResponseHolder,
        arrivalFlightId,
        departureFlightId,
        productid
      );

      if (
        productid === productidConstant.ARRIVALONLY ||
        productid === productidConstant.ARRIVALBUNDLE
      ) {
        if (!refResponseHolder["getSchedule"]?.["A"]) {
          console.log("return called arrival");
          return {
            instruction:
              "call getSchedule for provided date without confirmation arrival",
          };
        }

        for (const scheduleObj of refResponseHolder["getSchedule"]?.["A"]) {
          if (scheduleObj.flightId === arrivalFlightId) {
            arrivalscheduleid = scheduleObj.scheduleId;
            break;
          }
        }
      }

      if (
        productid === productidConstant.DEPARTURELOUNGE ||
        productid === productidConstant.ARRIVALBUNDLE
      ) {
        if (!refResponseHolder["getSchedule"]?.["D"]) {
          console.log("return called deprature");
          return {
            instruction:
              "call getSchedule for provided date without confirmation departure",
          };
        }

        for (const scheduleObj of refResponseHolder["getSchedule"]?.["D"]) {
          if (scheduleObj.flightId === departureFlightId) {
            departurescheduleid = scheduleObj.scheduleId;
            break;
          }
        }
      }

      console.log(
        "nikhil",
        arrivalscheduleid,
        departurescheduleid,
        refResponseHolder["getSchedule"]?.["D"],
        refResponseHolder["getSchedule"]?.["A"],
        refResponseHolder
      );
      console.log(
        "log from fucntion ",
        productid,
        arrivalscheduleid,
        departurescheduleid,
        adulttickets,
        childtickets
      );
      return checkAvailbility(
        productid,
        arrivalscheduleid,
        departurescheduleid,
        adulttickets,
        childtickets
      );
    },
  };

  const getLoungeDeclaration = {
    description: "Get the Object For lounge selection",
    parameters: z.object({}),
    execute: () => {
      return LOUNGE;
    },
  };

  const getScheduleDeclaration = {
    description:
      "Gets the schedule info for a flight based on the given date, lounge name, and direction.",
    parameters: z.object({
      direction: z
        .enum(["D", "A"])
        .describe(
          "Defines the flight direction: 'D' for departure or 'A' for arrival."
        ),
      airportid: z
        .enum(["NMIA", "SIA"])
        .describe(
          "The airport ID where the lounge is booked. It will be either 'NMIA' or 'SIA'."
        ),
      traveldate: z
        .string()
        .regex(/^\d{8}$/, "Date must be in YYYYMMDD format")
        .describe("The date of travel in 'YYYYMMDD' format."),
    }),
    execute: functions.getSchedule,
  };

  const getReservationDeclaration = {
    description:
      "Checks the Reservation of lounge seats for the selected flight and product type.",
    parameters: z.object({
      productid: z
        .enum(["ARRIVALONLY", "DEPARTURELOUNGE", "ARRIVALBUNDLE"])
        .describe(
          "Defines the product type based on user selection: ARRIVALONLY for arrival, DEPARTURELOUNGE for departure, ARRIVALBUNDLE for both."
        ),
      arrivalFlightId: z
        .string()
        .describe(
          "Flight ID for arrival. It will be '0' if the product is DEPARTURELOUNGE."
        ),
      departureFlightId: z
        .string()
        .describe(
          "Flight ID for departure. It will be '0' if the product is ARRIVALONLY."
        ),
      adulttickets: z
        .number()
        .describe(
          "The number of adult tickets. Must be provided after flight details are confirmed."
        ),
      childtickets: z
        .number()
        .describe(
          "The number of child tickets. Must be provided after flight details are confirmed."
        ),
    }),
    execute: functions.getReservation,
  };

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-gradient-to-br from-gray-800 via-slate-900 px-4 py-3">
      <div
        className="text-lg font-bold text-white mb-4  tracking-wide hover:text-blue-400 transition cursor-pointer"
        onClick={() => {
          dispatch(clearMessages());
        }}
      >
        Lounge Booking Agent
      </div>

      <div className="w-full max-w-2xl flex flex-col flex-1 overflow-hidden rounded-3xl shadow-2xl border border-white/10 bg-white/5 backdrop-blur-lg">
        {/* Model Selector */}
        <div className="my-4 flex justify-center items-center">
          <select
            id="model-select"
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-2 text-sm 
               focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm backdrop-blur-md"
          >
            {Object.keys(modelOptions).map((key) => (
              <option key={key} value={key} className="bg-gray-900 text-white">
                {modelOptions[key].label}
              </option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <Message key={idx} message={msg} />
          ))}

          {isTyping && (
            <div className="mr-auto bg-white/10 text-white text-sm px-4 py-2 rounded-xl rounded-bl-none max-w-[75%] animate-pulse shadow-md backdrop-blur-md border border-white/10">
              Bot is thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="px-6 py-4 flex gap-3 flex-wrap justify-center">
            {suggestionGroups.quickStart.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => {
                  sendMessages(suggestion);
                }}
                className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition select-none backdrop-blur-md border border-white/10 shadow"
              >
                💡 {suggestion}
              </div>
            ))}
          </div>
        )}
        
        {/* Input Box */}
        <div className="border-t border-white/10 px-6 py-4 bg-white/5 backdrop-blur-lg">
          <div className="flex items-center gap-2 relative w-full">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-white/10 border border-white/20 text-sm text-white rounded-xl px-5 py-3 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 backdrop-blur-md"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim().length > 0)
                  sendMessages();
              }}
              disabled={loading}
            />
            <button
              onClick={sendMessages}
              disabled={loading || input.trim().length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm shadow-lg transition disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
