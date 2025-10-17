import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchMatches } from "../utils/supabaseHelpers";

export default function Matches({ userId }) {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = async () => {
    if (!userId) return;
    const data = await fetchMatches(userId);
    setMatches(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMatches();
  }, [userId]);

  const openChat = (match) => {
    router.push({
      pathname: "/chat",
      query: { userId, otherUserId: match.id, otherName: match.name },
    });
  };

  if (loading) return <p>Cargando matches...</p>;
  if (!matches.length) return <p>No tienes matches todavía 😢</p>;

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Mis Matches</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {matches.map((m) => (
          <li
            key={m.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          >
            <span>{m.name}</span>
            <button onClick={() => openChat(m)}>Abrir chat</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
