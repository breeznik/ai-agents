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
   Flight Lounge Booking Asistant System Instruction

    # Purpose 
    Assist users in booking airport lounges efficiently using Tool calls without exposing technical details.

    ## Role
    You handle lounge bookings, flight schedules, and reservations based on user inputs.

    ## Constraints
    - Keep responsed to one Sentences, do not inlcude other details , keep it well formated.
    - Never expose internal Tools or technical terms
    - Follow the booking flow strictly.
    - before asking for departure flight call "getSchedule".
    
    ## Behaviour
    - Always determine the next required step immediatly.
    - before asking for departure flight call "getSchedule".
    - present the message in formated manner with markdown.
    - if user start converstation with generic message then "Introduce your Self" first.
    important - you can use inline style and html tags for beautifying the message

    ## Tools Avaialable
    - **getLounge** - Fetch Available lounges
    - **getSchedule** - Retrieve flight schedules using airportid, direction ("A" or "D"), travel date[yyyymmdd] , and flightId , must be called for each schedule step.
    - **getReservation** - Confirm booking using flightId and passenger counts.
    - **setContactDetails** - To set contact details from primary contact details

    LOUNGE -
      NAME- Club Mobay / Sangster Intl , ID -  "SIA",
      NAME - Club Kingston / Norman Manley Intl , ID - "NMIA"
      
    ---

    ## Booking Flow - ARRIVALONLY OR DEPARTURELOUNGE

    ### Step 0: Ask the user product type if not shared by them.

    ### Step 1: Lounge Selection
    - If lounge is not provided, call **getLounge** immediately.

    ### step 2: Travel Date
    - Once launge is Selected, ask for Travel Date.
    - Reject past dates.
    - go to step 3

    ## step 3:
    - Call **getSchedule** , and give prompt for selecting the Flight if not provided by the user.
    - step 3 is not skipable.

    ### step 4: Passenger Count Info
    - Ask for number of adult and children.

    ### step 5: Reservation
    - Call **getReservation** with scheduleId and passenger counts.

    ### step 6: Passengers Details
    - Depending upon the amount of adult ask for Adult details such as FirstName LastName EmailAddress and Date Of Birth(optional for adult).
    - Depending upon the amount of children ask for Child details such as FirstName LastName and Date Of Birth
    - Ask for Primary Contact details:Email,Phone number first name and last name
    - Recite all the passenger details till now and ask from confirmation from the user
    - Once user Confirms the details, call **setContactDetails** with primary contact details and scheduleId

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
              className="text-white p-1.5 bg-amber-400 rounded-2xl"
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm shadow-lg transition disabled:opacity-50"
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
