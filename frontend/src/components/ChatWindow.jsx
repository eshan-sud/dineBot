// frontend/src/components/ChatWindow.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";

const ChatWindow = () => {
  const [userId, setUserId] = useState(
    localStorage.getItem("userId") || "guest"
  );
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: '👋 Hi, I\'m DineBot\n\nPlease type:\n\n👉 "login" to sign in\n\n👉 "signup" to register\n',
    },
  ]);
  const [authState, setAuthState] = useState({
    mode: null,
    step: null,
    email: "",
    password: "",
    name: "",
  });
  const chatRef = useRef(null);
  const navigate = useNavigate();

  const logoutUser = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    sessionStorage.clear();
    setUserId("guest");
    setAuthState({ mode: null, step: null, email: "", password: "", name: "" });
  };

  const handleSend = async (text) => {
    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    const lowerText = text.toLowerCase().trim();
    if (userId === "guest") {
      if (!authState.mode) {
        if (lowerText === "login" || lowerText === "signup") {
          setAuthState({
            mode: lowerText,
            step: lowerText === "login" ? "email" : "name",
          });
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text:
                lowerText === "login"
                  ? "📧 Please enter your email:"
                  : "📝 Please enter your name:",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: '❓ Please type "login" or "signup".' },
          ]);
        }
        return;
      }
      if (authState.step === "name") {
        setAuthState((prev) => ({ ...prev, name: text, step: "email" }));
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "📧 Please enter your email:" },
        ]);
        return;
      }
      if (authState.step === "email") {
        setAuthState((prev) => ({ ...prev, email: text, step: "password" }));
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "🔐 Please enter your password:" },
        ]);
        return;
      }
      if (authState.step === "password") {
        const isSignup = authState.mode === "signup";
        const payload = isSignup
          ? { name: authState.name, email: authState.email, password: text }
          : { email: authState.email, password: text };
        try {
          const res = await fetch(
            `${process.env.REACT_APP_AZURE_BACKEND_API}/auth/${authState.mode}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          const data = await res.json();
          if (res.ok && data.token && data.userId) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.userId);
            setUserId(data.userId);
            setAuthState({
              mode: null,
              step: null,
              email: "",
              password: "",
              name: "",
            });
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: `✅ ${isSignup ? "Welcome" : "Welcome back"}, ${
                  authState.email
                }! You're now ${
                  isSignup ? "registered and " : ""
                }logged in.\n\n👉 You can now try menu, order, reserve, etc.`,
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: "❌ Invalid credentials.",
              },
              {
                sender: "bot",
                text: '❓ Please type "login" or "signup".',
              },
            ]);
            setAuthState({
              mode: null,
              step: null,
              email: "",
              password: "",
              name: "",
            });
          }
        } catch (err) {
          console.error("Auth error:", err);
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "⚠️ Error connecting to auth server." },
          ]);
        }
        return;
      }
    }

    // Block access if not logged in
    const token = localStorage.getItem("token");
    if (!token || userId === "guest") {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "🔐 Please login or signup to continue.",
        },
      ]);
      return;
    }

    // Call backend API
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_AZURE_BACKEND_API}/bot/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ text, userId }),
        }
      );
      const data = await res.json();
      if (data.reply.includes("logged out")) logoutUser();
      if (data.userId && data.userId !== "guest") {
        // Update stored userId only after successful login/signup
        setUserId(data.userId);
        localStorage.setItem("userId", data.userId);
      }
      const botMsg = { sender: "bot", text: data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Bot error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Error connecting to server." },
      ]);
    }
  };

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full h-[600px] max-w-2xl mx-auto shadow-lg rounded-xl flex flex-col bg-white border">
      <ChatHeader
        onBack={() => {
          handleSend("logout");
          logoutUser();
          navigate("/");
        }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, index) => (
          <ChatBubble key={index} sender={msg.sender} text={msg.text} />
        ))}
        <div ref={chatRef} />
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;
