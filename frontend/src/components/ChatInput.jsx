// frontend/src/components/ChatInput.jsx

import { useState } from "react";

const ChatInput = ({ onSend }) => {
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex p-3 border-t">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        className="flex-1 p-2 border rounded-l-md"
        placeholder="Type a message..."
      />
      <button
        onClick={send}
        className="bg-blue-600 text-white px-4 rounded-r-md"
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;
