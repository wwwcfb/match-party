import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchMatches, fetchMessages, sendMessage, subscribeToMessages } from "../utils/supabaseHelpers";

export default function Chat() {
  const router = useRouter();
  const { userId: urlUserId, otherUserId, otherName } = router.query;
  
  const userId = urlUserId || localStorage.getItem('userId');

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [myMatches, setMyMatches] = useState([]);
  const [activeChat, setActiveChat] = useState({ 
    id: otherUserId || null, 
    name: otherName || null 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      router.push('/');
      return;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const loadMatches = async () => {
      try {
        setLoading(true);
        const matches = await fetchMatches(userId);
        setMyMatches(matches || []);
        
        if (otherUserId && otherName && !activeChat.id) {
          setActiveChat({ id: otherUserId, name: otherName });
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar matches:", err);
        setLoading(false);
      }
    };

    loadMatches();
  }, [userId, otherUserId, otherName]);

  useEffect(() => {
    if (!userId || !activeChat.id) return;

    const loadMessages = async () => {
      try {
        const msgs = await fetchMessages(userId, activeChat.id);
        setMessages(msgs || []);
      } catch (err) {
        console.error("Error al cargar mensajes:", err);
      }
    };

    loadMessages();

    const subscription = subscribeToMessages(userId, activeChat.id, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userId, activeChat.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text || !userId || !activeChat.id) return;

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

  const handleBrowseProfiles = () => {
    if (!userId) return;
    router.push(`/browse?userId=${userId}`);
  };

  if (!userId) {
    return (
      <div className="container">
        <div className="card" style={{textAlign: 'center', padding: '40px'}}>
          <p>Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{textAlign: 'center', padding: '40px'}}>
          <p>Cargando chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header de boda */}
      <div className="wedding-header fade-in">
  <h1 className="wedding-title-elegant">Boda Chris y Romi</h1>
  <div className="wedding-line"></div>
  <p className="wedding-subtitle">Tus conversaciones</p>
</div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <button onClick={handleBrowseProfiles} className="btn btn-primary" style={{flex: 1}}>
          🔍 Ver Perfiles
        </button>
        <button 
          onClick={() => router.push(`/browse?userId=${userId}`)} 
          className="btn btn-secondary"
          style={{flex: 1}}
        >
          💘 Buscar Matches
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="chat-container">
          <div className="chat-header">
            <h3>💬 Mis Chats</h3>
            <p>{myMatches.length} {myMatches.length === 1 ? 'conversación' : 'conversaciones'}</p>
          </div>

          <div style={{ padding: "20px" }}>
            {myMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>No tienes matches todavía 😢</p>
                <p>Da like a otros perfiles para empezar a chatear</p>
                <button 
                  onClick={handleBrowseProfiles}
                  className="btn btn-primary"
                  style={{ marginTop: '20px' }}
                >
                  Explorar Perfiles
                </button>
              </div>
            ) : (
              <div>
                {myMatches.map((match) => (
                  <div
                    key={match.match_id}
                    className={`chat-list ${activeChat.id === match.user.id ? 'active' : ''}`}
                    onClick={() => handleSelectChat(match.user)}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <img
                        src={match.user.foto_url}
                        alt={match.user.nombre}
                        className="chat-list-avatar"
                      />
                      <div>
                        <h4 style={{ 
                          margin: 0, 
                          color: activeChat.id === match.user.id ? 'white' : 'var(--text)',
                          fontWeight: '600'
                        }}>
                          {match.user.nombre}
                        </h4>
                        <p style={{ 
                          margin: 0,
                          color: activeChat.id === match.user.id ? 'rgba(255,255,255,0.8)' : 'var(--text-light)',
                          fontSize: '0.9rem'
                        }}>
                          Mesa {match.user.mesa}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeChat.id && (
          <div className="chat-container fade-in">
            <div className="chat-header">
              <h3>Conversación con {activeChat.name}</h3>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px' }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>No hay mensajes todavía</p>
                  <p>¡Envía el primero para romper el hielo! 💬</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message ${msg.sender_id === userId ? 'message-own' : 'message-other'}`}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>

            <div className="chat-input-container">
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="input"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minWidth: '80px' }}
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}