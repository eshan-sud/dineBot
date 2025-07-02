// frontend/src/components/ChatWindow.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import ChatHeader from "./ChatHeader";

const ChatWindow = () => {
  const [messageHistory, setMessageHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [input, setInput] = useState("");
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

  const tryRefreshToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;
    try {
      let res = await fetch(
        `${process.env.REACT_APP_AZURE_BACKEND_API}/auth/refresh-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }
      );
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        return data.token;
      }
    } catch (error) {
      console.error("[tryRefreshToken Error]", error);
    }
    return null;
  };

  const logoutUser = async () => {
    localStorage.clear();
    sessionStorage.clear();
    setUserId("guest");
    setAuthState({ mode: null, step: null, email: "", password: "", name: "" });
  };

  const handleKeyNavigate = (key) => {
    if (key === "ArrowUp") {
      if (
        messageHistory.length > 0 &&
        historyIndex < messageHistory.length - 1
      ) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(messageHistory[messageHistory.length - 1 - newIndex]);
      }
    } else if (key === "ArrowDown") {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(messageHistory[messageHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const handleSend = async (text) => {
    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    const lowerText = text.toLowerCase().trim();
    if (text.trim() !== "") {
      setMessageHistory((prev) => [...prev, text]);
      setHistoryIndex(-1); // Reset index after every new send
    }
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
          let res = await fetch(
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
            localStorage.setItem("refreshToken", data.refreshToken);
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
    let token = localStorage.getItem("token");
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
      let res = await fetch(`${process.env.REACT_APP_AZURE_BACKEND_API}/bot/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: token,
        },
        body: JSON.stringify({ text, userId }),
      });
      if (res.status === 401) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          token = newToken;
          localStorage.setItem("token", newToken);
          res = await fetch(`${process.env.REACT_APP_AZURE_BACKEND_API}/bot/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              authorization: token,
            },
            body: JSON.stringify({ text, userId }),
          });
          if (res.status === 401) {
            logoutUser();
            return setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: "🔒 Session expired. Please login again.",
              },
            ]);
          }
        } else {
          logoutUser();
          return setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "🔒 Session expired. Please login again." },
          ]);
        }
      }
      const data = await res.json();
      if (
        typeof data.replies[0].text === "string" &&
        data.replies[0].text.includes("logged out")
      )
        logoutUser();
      if (data.userId && data.userId !== "guest") {
        // Update stored userId only after successful login/signup
        setUserId(data.userId);
        localStorage.setItem("userId", data.userId);
      }
      if (Array.isArray(data.replies)) {
        const botMsgs = data.replies.map((r) =>
          r.type === "text"
            ? { sender: "bot", text: r.text }
            : {
                sender: "bot",
                card: {
                  title: r.title,
                  text: r.text,
                  images: r.images,
                },
              }
        );
        setMessages((prev) => [...prev, ...botMsgs]);
      } else if (typeof data.reply === "string") {
        // Fallback for older single-message format
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      }
    } catch (error) {
      console.error("[Bot Error]", error);
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
          <ChatBubble
            key={index}
            sender={msg.sender}
            text={msg.text}
            card={msg.card}
          />
        ))}
        <div ref={chatRef} />
      </div>
      <ChatInput
        onSend={handleSend}
        input={input}
        setInput={setInput}
        onKeyNavigate={handleKeyNavigate}
      />
    </div>
  );
};

export default ChatWindow;
