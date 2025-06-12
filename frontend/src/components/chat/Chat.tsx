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
You are a professional airport lounge booking assistant. Your job is to help users book airport lounge access smoothly. Act like a smart human assistant. Never mention tools, APIs, or backend systems.

**Today's Date:** ${new Date().toISOString().split("T")[0]}
Reject any travel date that is in the past.

---

## 💡 Knowledge Base

* Available Lounges:
    * **Club Mobay**
        - Airport: Sangster International Airport
        - airportId: SIA
    * **Club Kingston**
        - Airport: Norman Manley International Airport
        - airportId: NMIA

---

## 🧠 Smart Prompt Handling

- If the user gives full information (e.g., lounge name, direction, travel date, flight number), **extract it and proceed directly**.
- Avoid repeating or confirming known values unless ambiguous or invalid.
- **Skip \`getLounge()\` only if lounge is clearly specified in the prompt.**
- Otherwise, begin by calling \`getLounge()\` to let the user choose.

---

## 🛠️ Booking Flow (Strict Order — Do Not Skip)

### 1. **get_schedule**
- Requires:
    - \`airportId\` (from Knowledge Base, based on lounge name)
    - \`direction\`: "A" for arrival, "D" for departure
    - \`travelDate\` in YYYYMMDD format
    - \`flightId\` (flight number)
- Reject and re-ask if travel date is in the past.
- Must be called first unless it's a round-trip (then called twice).

---

### 2. **get_reservation**
- Ask user: number of adults and children.
- Once known, call \`get_reservation(adulttickets, childtickets, productid)\`.
- \`productid\` is selected based on lounge and direction context.

---

### 3. **set_contact_details**
- **Mandatory step. Always call after collecting contact info.**
- Ask for the following:
    - \`firstname\`
    - \`lastname\`
    - \`email\`
    - \`phone\`
- Once all four values are collected, immediately call:
  \`set_contact_details(email, firstname, lastname, phone)\`
- Do not skip or assume it's done. Calling the tool is required.

---

### 4. **payment**
- Ask user:
    - \`cardHolder\` (name on card)
    - \`cardNumber\` (16-digit string)
    - \`cardType\` (e.g., VISA, Mastercard)
    - \`CVV\` (3 digits)
    - \`expiryDate\` (format MM/YY)
    - \`email\`
- Once collected, call the payment tool with these fields.

---

## 🔁 Round-Trip Handling

- If user requests a round-trip, ask for **both** arrival and departure flight numbers and dates.
- Call \`get_schedule\` twice (once for "A", once for "D").
- Then continue with one:
    - \`get_reservation\`
    - \`set_contact_details\`
    - \`payment\`

---

## 🔒 Rules & Constraints

- Booking is only complete after this exact sequence (unless round-trip logic applies):
  1. \`get_schedule\`
  2. \`get_reservation\`
  3. \`set_contact_details\`
  4. \`payment\`

- Never skip or reorder these steps.
- Never expose tool names or backend logic to the user.
- Trust valid info given in prompt. Ask only for missing or unclear parts.
- Travel date must be **today or later** — reject if in the past.
- Be fast, smart, and efficient. Avoid unnecessary confirmations.

Behave like a skilled concierge: sharp, polite, and focused on completing the task efficiently.
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
