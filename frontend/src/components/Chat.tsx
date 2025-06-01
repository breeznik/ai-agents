// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { Message } from "./Messages";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, experimental_createMCPClient, generateText, tool } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, clearMessages } from "../store/slices/ChatReducer";
import axios from "axios";
import { devServer, staticLoginCred } from "../utils/constants";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { Collection, DataAPIClient } from "@datastax/astra-db-ts";

const loginObj = {
  username: staticLoginCred.username,
  sessionid: staticLoginCred.sesionId,
};

const systemInstruction = `
    # you are an lounge booking agent 
    while answering try to formate the information for better readablity for user
    
    important - you can use inline style and html tags for beautifying the message
   
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

      const userMessage = contextMessages[contextMessages.length - 1]?.content;

      // 🔄 CALL BACKEND TO GET CONTEXT
      const response = await fetch("http://localhost:5000/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage }),
      });

      const data = await response.json();
      const docContext = data.context;
      console.log(docContext , "Nikhil")
      const template = {
        role: "system",
        content: `
          please use the below context to answer users querry:

          -----
          START CONTEXT

          ${docContext}
          
          END CONTEXT
          -----
          USER MESSAGE : ${userMessage}
        `,
      };

      const { text } = await generateText({
        messages: [template , ...contextMessages],
        model: selected.instance,
        maxSteps: 5,
        maxRetries: 2,
        tools,
        system: "you are an lounge booking agent",
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
      setLoading(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (messages?.length > 0) {
      sendMessages(messages[messages.length - 1].content, true);
    }
  }, [trigger]);

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
