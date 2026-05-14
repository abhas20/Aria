

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-sm">
        🌸
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-rose-300 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TypingIndicator;