import { ChatMessage as Msg } from "@/store/app";

interface Props {
  message: Msg;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #00e5ff22, #a855f722)",
              border: "1px solid #1a1a22",
            }}
          >
            <span className="text-[9px] font-display font-bold text-[#00e5ff]">A</span>
          </div>
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-sm px-4 py-3 text-[13px] leading-relaxed ${
          isUser
            ? "text-[#f0f0f0] border border-[#1a1a22]"
            : "text-[#ccc] border border-[#1a1a22]"
        }`}
        style={
          isUser
            ? { background: "#0d0d10" }
            : { background: "rgba(0,229,255,0.03)" }
        }
      >
        <span className="whitespace-pre-wrap">{message.content}</span>
        {message.isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] ml-1 align-middle"
            style={{
              background: "#00e5ff",
              boxShadow: "0 0 6px rgba(0,229,255,0.8)",
              animation: "pulseDot 1s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {isUser && (
        <div className="shrink-0 mt-0.5">
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center"
            style={{
              background: "#0d0d10",
              border: "1px solid #1a1a22",
            }}
          >
            <span className="text-[9px] font-display font-bold text-[#555]">U</span>
          </div>
        </div>
      )}
    </div>
  );
}
