// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Message } from "./Messages";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";

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
  username: "esite3@viponline",
  sessionid: "00081276658910697845036591",
};
const systemInstruction = `
  # Flight Lounge Booking Assistant

  You are a helpful assistant specializing in airport lounge bookings. Guide users through the booking process using plain, user-friendly language without exposing technical details.

  ## Core Tasks
  - Help users view flight schedules based on airport, direction, and date
  - Help users check lounge availability and reserve if possible
  - Help users add reserved services to their cart

  🧠 **Memory Rule (Updated)**:
  - After a successful availability check, store the full reservation response in memory.
  - Prompt the user once to confirm adding the reservation to their cart.
  - If confirmed, proceed without asking again.
  - If no reservation response is available, restart the entire flow.

  ## Booking Workflow

  1. Determine Booking Type
    - Ask the user if they want to book an arrival lounge, departure lounge, or both
    - Use these options:
      - Arrival only
      - Departure only
      - Both (bundle)

  2. Choose Lounge
    - Offer lounge options:
      - Club Mobay / Sangster Intl (SIA)
      - Club Kingston / Norman Manley Intl (NMIA)

  3. Validate Travel Date
    - Request the user's travel date
    - Reject any past dates with: "I'm sorry, but bookings can only be made for today or future dates."
    - Only proceed with valid dates

  4. View Flight Schedule
    - Show flights based on:
      - Direction (arrival or departure)
      - Lounge location
      - Travel date
    - For bundle bookings, show both arrival and departure schedules separately

  5. Select Flight
    - Ask the user for the airline and flight number
    - Match the flight information exactly with what was shown
    - If not found, notify the user and ask again

  6. Collect Passenger Information
    - Ask for the number of adult and child tickets
    - For bundles, collect this information only once

  7. Reserve Lounge Access
    - Confirm availability using:
      - Booking type
      - Flight details
      - Ticket counts
    - Only proceed if the system confirms availability

  8. Final Confirmation
    - Only proceed to finalize the reservation if:
      - The previous availability check was successful
      - The user explicitly confirmed they want to continue

  ⚠️ **Important Rule**:
  - Do not re-check availability once the user has confirmed
  - Use the last successful reservation directly for finalization

  ## Error Handling Guidelines

  1. Date Validation
    - Always validate the date before proceeding
    - Reject past dates and stop the process

  2. System Errors
    - If there’s an issue, display the exact message received
    - Prefix technical messages with: "The system reports: "
    - Restart the process if a reservation fails

  3. Flight Verification
    - Confirm that flight information matches exactly
    - Do not continue with unverified flights

  4. Passenger Count Check
    - Ensure ticket counts are positive integers

  ## Critical Restrictions

  - Do not accept past dates
  - Do not proceed with missing or invalid info
  - Do not interpret or change system error messages
  - Do not reuse old data after a failure
  - Do not finalize the booking unless availability was just confirmed
  - Always validate user inputs at every step
  - Restart the booking if reservation fails

  Current Date for Reference: ${new Date()}
`;

const groq = createGroq({
  apiKey: process.env.VITE_GROQ_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
  baseURL: "https://api.anthropic.com/v1",
});

const xai = createXai({
  apiKey: process.env.VITE_XAI_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.VITE_GOOGLE_API_KEY,
});

const openAI = createOpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
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
};

// async function getSchedule(direction, airportid, traveldate, loginDetails) {
//   console.log("getschedule called");
//   const request = {
//     username: loginObj.username,
//     sessionid: loginObj.sessionid,
//     failstatus: 0,
//     request: {
//       direction: direction,
//       airportid: airportid,
//       traveldate: traveldate,
//     },
//   };

//   const response = await axios.post(
//     "https://nigeriadev.reliablesoftjm.com/VIPERWS/getschedule",
//     request
//   );
//   console.log("getschedule response ", response.data);

//   return response.data;
// }

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [currentModel, setCurrentModel] = useState("gemini-2.0-flash");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [trigger, setTrigger] = useState(false);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);
  const sendMessages = async (overrideInput?: string) => {
    const inputValue = (overrideInput ?? input).trim();
    if (!inputValue) return;

    const selected = modelOptions[currentModel];
    if (!selected) return;

    setLoading(true);
    setIsTyping(true);

    try {
      const newMessages = [...messages, { role: "user", content: inputValue }];
      setMessages(newMessages);

      const { text } = await generateText({
        messages: newMessages,
        model: selected.instance,
        system: systemInstruction,
        maxSteps: 5,
        maxRetries: 2,
        onStepFinish({ toolResults }) {
          toolResults.forEach((indiTool) => {
            console.log({
              [indiTool.toolName]: indiTool.args,
              response: indiTool.result,
            });
          });
        },
      });

      setMessages([...newMessages, { role: "assistant", content: text }]);
      setInput("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };
  useEffect(() => {
    sendMessages();
  }, [trigger]);
  return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black px-4 py-6">
      <h1 className="text-xl font-semibold text-white mb-4">
        Lounge Booking Agent
      </h1>
      <div className="w-full max-w-2xl flex flex-col flex-1 overflow-hidden rounded-3xl shadow-lg border border-gray-800 bg-gray-900/60 backdrop-blur-lg">
        <div className="my-3.5 flex justify-center items-center">
          <select
            id="model-select"
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            className="bg-gray-800/60 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(modelOptions).map((key) => (
              <option key={key} value={key}>
                {modelOptions[key].label}
              </option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <Message
              key={idx}
              chatId={"chat-1"}
              role={msg.role === "assistant" ? "assistant" : "user"}
              content={msg.content}
            />
          ))}
          {isTyping && (
            <div className="mr-auto bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-2xl rounded-bl-none max-w-[75%] animate-pulse">
              Bot is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-6 py-3.5 flex gap-3 flex-wrap">
            {suggestionGroups.quickStart.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setInput(suggestion);
                  if (inputRef.current) {
                    inputRef.current.value = suggestion;
                  }
                  sendMessages(suggestion);
                }}
                className="cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-lg transition select-none"
              >
                💡 {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-800 px-6 py-4 bg-gray-900/70 backdrop-blur-lg">
          <div className="flex items-center gap-2 relative w-full">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-5 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 disabled:opacity-50"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim().length > 0) {
                  sendMessages();
                }
              }}
              disabled={loading}
            />
            <button
              onClick={sendMessages}
              disabled={loading || input.length <= 0}
              className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-lg text-sm shadow-lg disabled:opacity-50"
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
