import { type Message } from "@/store/chatStore"; 

const MessageBubble = ({
  msg,
  onSpeak,
}: {
  msg: Message;
  onSpeak?: (text: string) => void;
}) => {
  const isUser = msg.role === "user";
  const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] space-y-1">
          <div className="bg-rose-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed">{msg.content}</p>
          </div>
          <p className="text-[10px] text-gray-300 text-right">{time}</p>
        </div>
      </div>
    );
  }

  // Aria bubble
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-sm mt-0.5">
        🌸
      </div>
      <div className="max-w-[75%] space-y-1">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-gray-700">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-gray-300">{time}</p>
          {onSpeak && (
            <button
              onClick={() => onSpeak(msg.content)}
              className="text-[10px] text-gray-300 hover:text-rose-400 transition-colors"
              title="Read aloud">
              🔊
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
