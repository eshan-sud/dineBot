// frontend/src/components/ChatBubble.jsx

const renderMessage = (text) => {
  // Replace \n with <br /> for line breaks
  return { __html: text.replace(/\n/g, "<br />") };
};

const ChatBubble = ({ sender, text, card }) => {
  const isUser = sender === "user";
  const bubbleClasses = `max-w-[60%] p-3 rounded-lg ${
    isUser ? "bg-blue-600 text-white" : "bg-green-600 text-white"
  }`;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div className={bubbleClasses}>
        {text && <p dangerouslySetInnerHTML={renderMessage(text)} />}
        {card && (
          <div className="mt-2 bg-white rounded-lg p-2 shadow text-black">
            {card.title && <h4 className="font-semibold">{card.title}</h4>}
            {card.text && (
              <p
                className="text-sm mt-1"
                dangerouslySetInnerHTML={renderMessage(card.text)}
              />
            )}
            {card.images?.map((img, i) => (
              <img
                key={i}
                src={img.url}
                alt={`image-${i}`}
                className="mt-2 rounded w-full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
