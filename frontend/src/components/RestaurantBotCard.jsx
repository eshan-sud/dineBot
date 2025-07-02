// frontend/src/components/RestaurantBotCard.jsx

import { useNavigate } from "react-router-dom";

const RestaurantBotCard = () => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/chat")}
      className="cursor-pointer shadow-md p-6 bg-white rounded-xl text-center hover:scale-105 transition-all duration-200 ease-in-out"
    >
      <h3 className="text-xl font-bold">🍽️ Restaurant Chatbot</h3>
      <p className="text-sm text-gray-500 mt-2">
        Ask me anything about food, orders, or reservations.
      </p>
    </div>
  );
};

export default RestaurantBotCard;
