// frontend/src/components/ChatInput.jsx

const ChatInput = ({ onSend, input, setInput, onKeyNavigate }) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input);
        setInput(""); // Clear after send
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onKeyNavigate(e.key);
    }
  };
  return (
    <div className="flex p-3 border-t">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 p-2 border rounded-l-md"
        placeholder="Type a message..."
      />
      <button
        onClick={() => {
          if (input.trim()) {
            onSend(input);
            setInput("");
          }
        }}
        className="bg-blue-600 text-white px-4 rounded-r-md"
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;
