// frontend/src/components/ChatBubble.jsx

const renderMessage = (text) => {
  // Replace \n with <br /> for line breaks
  return { __html: text.replace(/\n/g, "<br />") };
};

const ChatBubble = ({ sender, text }) => {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[60%] p-3 rounded-lg text-white ${
          isUser ? "bg-blue-600" : "bg-green-600"
        }`}
      >
        <p dangerouslySetInnerHTML={renderMessage(text)} />
      </div>
    </div>
  );
};

export default ChatBubble;
