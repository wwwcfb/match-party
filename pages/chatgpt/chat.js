import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchMatches, fetchMessages, sendMessage, subscribeToMessages } from "../utils/supabaseHelpers";

export default function Chat() {
  const router = useRouter();
  const { userId, otherUserId, otherName } = router.query;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [myMatches, setMyMatches] = useState([]);
  const [activeChat, setActiveChat] = useState({ id: otherUserId, name: otherName });

  useEffect(() => {
    if (!userId) return;

    const loadMatches = async () => {
      const matches = await fetchMatches(userId);
      setMyMatches(matches || []);
    };

    loadMatches();
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeChat.id) return;

    const loadMessages = async () => {
      const msgs = await fetchMessages(userId, activeChat.id);
      setMessages(msgs || []);
    };

    loadMessages();

    const subscription = subscribeToMessages(userId, activeChat.id, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => subscription.unsubscribe();
  }, [userId, activeChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text) return;

    try {
      await sendMessage(userId, activeChat.id, text);
      setText("");
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    }
  };

  const handleSelectChat = (chatUser) => {
    setActiveChat({ id: chatUser.id, name: chatUser.nombre });
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h2>💬 Mis Chats</h2>

      <button onClick={() => router.push(`/browse?userId=${userId}`)}>Ver Perfiles</button>

      <div style={{ display: "flex", marginTop: 20 }}>
        <div style={{ width: 150, marginRight: 20 }}>
          <h4>Chats</h4>
          {myMatches.length === 0 && <p>No tienes matches todavía 😢</p>}
          {myMatches.map((match) => (
            <div key={match.match_id} style={{ marginBottom: 10 }}>
              <button
                style={{ display: "flex", alignItems: "center" }}
                onClick={() => handleSelectChat(match.user)}
              >
                <img
                  src={match.user.foto_url}
                  alt={match.user.nombre}
                  style={{ width: 30, height: 30, borderRadius: "50%", marginRight: 5 }}
                />
                {match.user.nombre}
              </button>
            </div>
          ))}
        </div>

        {activeChat.id && (
          <div style={{ flex: 1 }}>
            <h3>Conversación con {activeChat.name}</h3>
            <div
              style={{
                border: "1px solid #ccc",
                padding: 10,
                height: 300,
                overflowY: "scroll",
                marginBottom: 10,
              }}
            >
              {messages.map((msg, idx) => (
                <p key={idx} style={{ textAlign: msg.sender_id === userId ? "right" : "left" }}>
                  <strong>{msg.sender_id === userId ? "Yo" : "Ellos"}:</strong> {msg.text}
                </p>
              ))}
            </div>

            <form onSubmit={handleSend}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{ width: "80%", padding: 5 }}
              />
              <button type="submit" style={{ padding: 5 }}>Enviar</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
