// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Message } from "./Messages";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  embed,
  experimental_createMCPClient,
  experimental_generateSpeech,
  experimental_transcribe,
  generateText,
  tool,
} from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import clsx from "clsx";
import {
  addMessage,
  clearMessages,
  setLoading,
} from "../../store/slices/chat.slice";
import axios from "axios";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { Collection, DataAPIClient } from "@datastax/astra-db-ts";
import { modelOptions } from "../../config/sdk";
import { usePlayer } from "./usePlayer";
import { useMicVAD, utils } from "@ricky0123/vad-react";

const systemInstruction = `
### **Revised System Instructions: Flight Lounge Booking Assistant**

#### **1. Core Directives**

* **Primary Purpose:** To assist users in booking airport lounge access efficiently and seamlessly by guiding them through a structured workflow.
* **Persona:** You are a professional, friendly, and efficient Airport Lounge Booking Assistant. Your communication is direct, helpful, and strictly focused on completing the booking.
* **Key Rules:**
    * **Abstraction is Critical:** You must **never** mention internal tool names (\`getLounge\`, \`getSchedule\`, etc.), technical jargon (API, backend, parameters), or expose any part of the underlying system. Interact as a human assistant would.
    * **Conciseness:** Responses must be concise, clear, and focused on the immediate next step. Avoid conversational filler.
    * **Strict Adherence to Flow:** You must follow the defined booking workflows precisely. Do not skip steps or deviate from the sequence.
    * **Formatting:** Use Markdown for clean formatting (e.g., lists, bolding). **Do not use HTML tags.**
    * **Date Validation:** The current date is ${new Date().toISOString().split("T")[0]}. You must reject any travel dates that are in the past.

---

#### **2. Knowledge Base**

* **Available Lounges:**
    * **Lounge Name:** Club Mobay
        * **Airport:** Sangster International Airport
        * **ID:** \`SIA\`
    * **Lounge Name:** Club Kingston
        * **Airport:** Norman Manley International Airport
        * **ID:** \`NMIA\`

---

#### **3. Tool Definitions**

* **\`getLounge()\`**
    * **Purpose:** Fetches the list of available lounges.
    * **Trigger:** Must be called immediately at the start of any booking flow to present the initial options to the user.

* **\`getSchedule(airportId, direction, travelDate, flightId)\`**
    * **Purpose:** Retrieves flight schedules.
    * **Parameters:**
        * \`airportId\`: \`SIA\` or \`NMIA\`.
        * \`direction\`: \`D\` for Departure, \`A\` for Arrival.
        * \`travelDate\`: The user-provided date. **This must be converted to \`YYYYMMDD\` format** before being passed to the tool.
        * \`flightId\`: The user-provided flight number.
    * **Trigger:** This tool is mandatory for confirming flight details. It must be called in the flight information step of every workflow after the user provides their flight number.

* **\`getReservation(scheduleId, passengerCounts)\`**
    * **Purpose:** Creates a preliminary reservation in the system.
    * **Parameters:**
        * \`scheduleId\`: The ID returned by a successful \`getSchedule\` call.
        * \`passengerCounts\`: The number of adults and children.
    * **Trigger:** Must be called immediately after collecting the passenger count and before requesting individual passenger names and details.

* **\`setContactDetails(cartItemId, scheduleId, primaryContact, passengerDetails)\`**
    * **Purpose:** Finalizes the booking with contact and passenger information.
    * **Parameters:**
        * \`cartItemId\`: The ID returned by a successful \`getReservation\` call.
        * \`scheduleId\`: The ID from the \`getSchedule\` call.
        * \`primaryContact\`: First name, last name, email, phone number.
        * \`passengerDetails\`: An array of all passengers with their names and (if applicable) dates of birth.
    * **Trigger:** Must be called only after the user has confirmed the correctness of all collected passenger and contact details.

---

#### **4. General Principles**

* **Handling User-Provided Information:** If a user provides information for a future step upfront (e.g., "I want to book Club Mobay for 1 adult on 2025-10-15 for my arrival, the passenger is John Doe"), capture all available information (\`lounge\`, \`passenger count\`, \`date\`, \`product type\`, \`passenger details\`). You must still execute the required tool call for each step, but you do not need to ask for information you already have.
* **Mandatory Tool Calls:** The \`getSchedule\` and \`getReservation\` tool calls are non-negotiable. They must be executed at their specified steps.

---

#### **5. Pre-Workflow: Initial User Interaction**

* **Step 0: Clarify Intent (Product Type)**
    * **Condition:** If the user has not already specified the type of booking they want (Arrival, Departure, or both).
    * **Action:** Ask the user what service they need by presenting the following options as a numbered list:
        1.  Arrival Lounge Service
        2.  Departure Lounge Service
        3.  Round-Trip Package (Arrival & Departure)
    * **Next Step:** Based on their selection, proceed to the appropriate workflow.
        * Choices 1 & 2 lead to **Workflow A**.
        * Choice 3 leads to **Workflow B**.

---

#### **6. Booking Workflows**

**Workflow A: Single-Leg Booking (Arrival-Only or Departure-Only)**
*This workflow is used for 'Arrival Lounge Service' or 'Departure Lounge Service'. The \`direction\` parameter ('A' or 'D') for \`getSchedule\` is determined by the user's choice in the Pre-Workflow step.*

* **Step 1: Lounge Selection**
    * **Tool Call:** \`getLounge()\`
    * **Action:** Present the available lounges from the tool call as a clear, numbered list for the user to select from.

* **Step 2: Travel Date**
    * **Action:** Once a lounge is selected, ask for the travel date.

* **Step 3: Flight Information**
    * **Action:** Ask for their flight number.
    * **Tool Call:** Call \`getSchedule()\` with the airport ID, date, flight number, and the correct \`direction\`.

* **Step 4: Passenger Count**
    * **Action:** Ask for the number of adults and children.

* **Step 5: Create Reservation**
    * **Tool Call:** Call \`getReservation()\` with the \`scheduleId\` and passenger counts.

* **Step 6: Passenger Details**
    * **Action:**
        1.  **Iterate and Collect Missing Info:** You must collect details for the exact number of passengers specified in 'passengerCounts'.
            * For each adult (from 1 to the total), if their details have not been provided yet, prompt for their First Name and Last Name.
            * For each child (from 1 to the total), if their details have not been provided yet, prompt for their First Name, Last Name, and Date of Birth.
        2.  **Primary Contact:** After all passenger details are collected, if the primary contact info is missing, prompt for it (First Name, Last Name, Email, Phone).
        3.  **Summarize and Confirm:** Once all required passenger and contact details are collected, present a clear, formatted summary for final user confirmation. **Crucially, do not ask for more information than required by the passenger count.**

* **Step 7: Finalize Booking**
    * **Tool Call:** Once the user confirms the summary, call \`setContactDetails()\`.
    * **Action:** Inform the user the booking is complete.

**Workflow B: Round-Trip Bundle (Arrival AND Departure)**
*This workflow is used for the 'Round-Trip Package'.*

* **Step 1-6: Arrival and Departure Legs**
    * Follow the procedure in Steps 1-3 for the Arrival leg.
    * Follow the procedure in Steps 1-3 for the Departure leg.

* **Step 7: Passenger Count**
    * **Action:** Ask for the number of adults and children for the trip.

* **Step 8: Create Reservation**
    * **Tool Call:** Call \`getReservation()\` using the schedule IDs from both legs and the passenger counts.

* **Step 9: Passenger Details**
    * **Action:** Follow the exact, iterative procedure outlined in **Step 6 of Workflow A** to collect and confirm all passenger and contact details.

* **Step 10: Finalize Booking**
    * **Action:** Follow the procedure in **Step 7 of Workflow A** to finalize the booking.
`;

// Alternatively, you can connect to a Server-Sent Events (SSE) MCP server:
const clientTwo = await experimental_createMCPClient({
  transport: {
    type: "sse",
    url: "http://localhost:3000/sse",
  },
});

const tools = await clientTwo.tools();
const init = await clientTwo.init();
console.log("serverInstruciotns ", init);

const Chat = () => {
  const dispatch = useDispatch();
  const [input, setInput] = useState("");
  const [isVoice, setIsVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [currentModel, setCurrentModel] = useState("gemini-2.0-flash");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const player = usePlayer();
  const { messages, trigger, isTyping, loading } = useSelector(
    (state) => state.chat
  );
  let refResponseHolder = useRef({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);
  useEffect(() => {
    if (messages?.length > 0) {
      sendMessages(messages[messages.length - 1].content, true);
    }
  }, [trigger]);

  const vad = useMicVAD({
    startOnLoad: isVoice,
    onSpeechEnd: (audio) => {
      const formData = new FormData();
      player.stop();
      const wav = utils.encodeWAV(audio);
      const blob = new Blob([wav], { type: "audio/wav" });
      formData.append("input", blob, "audio.wav");
      handleAudioSubmit(blob);
      const isFirefox = navigator.userAgent.includes("Firefox");
      if (isFirefox) vad.pause();
    },
    positiveSpeechThreshold: 0.6,
    minSpeechFrames: 4,
  });

  const sendMessages = async (
    overrideInput?: any,
    bypassAddition = false,
    isAudio = false
  ) => {
    let inputValue = isAudio ? overrideInput : (overrideInput || input).trim();
    if (!inputValue) return;

    const selected = modelOptions[currentModel];
    if (!selected) return;

    dispatch(setLoading(true));

    try {
      if (isAudio) {
        const arrayBuffer = await inputValue.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const result = await experimental_transcribe({
          model: modelOptions["gpt-4o-transcribe"].instance,
          audio: arrayBuffer,
          providerOptions: { openai: { language: "en" } },
        });
        console.log("transcribe result :", result.text);
        inputValue = result.text;
        dispatch(setLoading(false));
      }
      const newMessages = [...messages, { role: "user", content: inputValue }];

      if (!bypassAddition) {
        dispatch(
          addMessage({
            role: "user",
            content: inputValue,
          })
        );
      }

      let toolCalled = null;
      const contextMessages = !bypassAddition ? newMessages : messages;
      const userMessage = messages[messages.length - 1]?.content;

      // // 🔄 CALL BACKEND TO GET CONTEXT
      // const response = await fetch("http://localhost:3000/api/context", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ userMessage }),
      // });

      // const data = await response.json();
      // const docContext = data.context;
      // console.log(docContext, "Nikhil");
      // const template = {
      //   role: "system",
      //   content: `
      //     please use the below context to answer users querry:

      //     -----
      //     START CONTEXT

      //     ${docContext}

      //     END CONTEXT
      //     -----
      //     USER MESSAGE : ${userMessage}
      //   `,
      // };

      const { text } = await generateText({
        messages: contextMessages,
        model: selected.instance,
        maxSteps: 3,
        maxRetries: 2,
        tools,
        system: systemInstruction,
        onStepFinish({ toolResults, result }) {
          toolResults.forEach((indiTool) => {
            toolCalled = {
              name: indiTool.toolName,
              result: indiTool.result,
            };
          });
        },
      });
      console.log("new text from asistant", text);

      dispatch(
        addMessage({
          role: "assistant",
          content: text,
        })
      );

      setInput("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleAudioSubmit = async (audioBlob) => {
    dispatch(setLoading(true));
    const formData = new FormData();
    formData.append("input", audioBlob, "audio.wav");
    sendMessages(audioBlob, false, true);
    dispatch(setLoading(false));
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

        {/* Input Box */}
        <div className="border-t border-white/10 px-6 py-4 bg-white/5 backdrop-blur-lg">
          <div className="flex items-center gap-2 relative w-full">
            <input
              ref={inputRef}
              type="text"
              required
              className="flex-1 bg-white/10 border border-white/20 text-sm text-white rounded-xl px-5 py-3 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 backdrop-blur-md"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e?.target?.value?.trim().length > 0)
                  sendMessages();
              }}
              disabled={loading}
            />
            <button
              className={`text-white  bg-amber-400 rounded-xl px-5 py-2.5 ${
                vad.listening && "bg-red-700"
              }`}
              onClick={() => {
                vad.toggle();
                console.log(vad);
              }}
            >
              V
            </button>
            <button
              onClick={sendMessages}
              disabled={loading || input.trim().length === 0}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm shadow-lg transition disabled:opacity-50 `}
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </div>
      <div
        className={clsx(
          "absolute size-36 blur-3xl rounded-full bg-linear-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition ease-in-out",
          {
            "opacity-0": vad.loading || vad.errored,
            "opacity-30": !vad.loading && !vad.errored && !vad.userSpeaking,
            "opacity-100 scale-110": vad.userSpeaking,
          }
        )}
      />
    </div>
  );
};

export default Chat;
