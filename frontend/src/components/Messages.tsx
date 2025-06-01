"use client";

import ChatOptions from "./chatComponents/Options";
import Tabs from "./chatComponents/Tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // enables tables, strikethrough, task lists

interface MessageProps {
  message: any;
  toolInvocations?: any[];
  attachments?: any[];
}


export const Message = ({ message }: MessageProps) => {
  const content = message.content;
  const role = message.role;
  const isUser = role === "user";
  const toolInvocations = message?.componentalData;

  return (
    <>
      {/* Tool Result */}
      {toolInvocations && (toolInvocations?.name === "getSchedule" || toolInvocations?.name === "getLounge") && (
        <div
          className={`flex w-full max-w-2xl px-4 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`w-full max-w-[75%] px-4 py-3 text-sm tracking-wide backdrop-blur-md border shadow-md
              ${
                isUser
                  ? "bg-blue-500/10 border-blue-400/30 text-white rounded-xl rounded-br-none"
                  : "bg-white/5 border-white/20 text-white rounded-xl rounded-bl-none"
              }`}
          >
            <div className="max-h-80 overflow-y-auto pr-1 custom-scroll">
              {toolInvocations.name === "getLounge" ? (
                <Tabs tabs={toolInvocations.result} />
              ) : toolInvocations.name === "getSchedule" ? (
                <ChatOptions options={toolInvocations.result} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Chat Message */}
      <div
        className={`flex w-full max-w-2xl px-4 ${
          isUser ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`relative max-w-[75%] px-5 py-4 text-sm tracking-wide backdrop-blur-md
            ${
              isUser
                ? "bg-blue-500/20 text-white border border-blue-400/30 rounded-xl rounded-br-none shadow-md"
                : "bg-white/10 text-white border border-white/20 rounded-xl rounded-bl-none shadow-md"
            }`}
        >
          <div className="whitespace-pre-wrap prose prose-invert text-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {typeof content === "string" ? content : ""}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  );
};
