"use client";

interface MessageProps {
  chatId: string;
  role: string;
  content: string | React.ReactNode;
  toolInvocations?: any[];
  attachments?: any[];
}

export const Message = ({
  chatId,
  role,
  content,
  toolInvocations,
  attachments,
}: MessageProps) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex flex-row gap-4 w-full max-w-2xl
        ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Bot icon on left */}
      {/* {!isUser && ( */}
        {/* <div className="w-6 h-6 flex justify-center items-center shrink-0 text-gray-300"> */}
          {/* Replace with actual icon */}
          {/* <div>🤖</div> */}
        {/* </div> */}
      {/* )} */}

      {/* Message bubble */}
      <div
        className={`max-w-[75%] px-5 py-3 text-sm tracking-wide transition-transform duration-200 ease-in-out
          ${
            isUser
              ? "ml-auto bg-blue-600 text-white rounded-xl rounded-br-none shadow-sm"
              : "mr-auto bg-gray-700 text-gray-100 rounded-xl rounded-bl-none shadow-sm"
          }`}
      >
        {typeof content === "string" ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          content
        )}

        {/* Tool invocations */}
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            {toolInvocations.map((invocation, idx) => (
              <div key={idx}>{JSON.stringify(invocation)}</div>
            ))}
          </div>
        )}

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            {attachments.map((attachment, idx) => (
              <div key={idx}>{JSON.stringify(attachment)}</div>
            ))}
          </div>
        )}
      </div>

      {/* {isUser && ( */}
        {/* <div className="w-6 h-6 flex justify-center items-center shrink-0 text-gray-300"> */}
          {/* Replace with actual user icon */}
          {/* <div>👤</div> */}
        {/* </div> */}
      {/* )} */}

    </div>
  );
};
