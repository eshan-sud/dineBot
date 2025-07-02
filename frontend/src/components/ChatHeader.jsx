// frontend/src/components/ChatHeader.jsx

import { ArrowLeft } from "lucide-react";

const ChatHeader = ({ onBack }) => {
  return (
    <div className="bg-blue-600 text-white p-3 flex items-center justify-between rounded-t-xl">
      <button onClick={onBack}>
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h2 className="text-lg font-semibold">DineBot</h2>
      <div className="w-5 h-5" />
    </div>
  );
};

export default ChatHeader;
