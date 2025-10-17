// pages/browse.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { fetchProfiles, likeUser, fetchMatches } from "../utils/supabaseHelpers";

export default function Browse() {
  const router = useRouter();
  const { userId } = router.query;

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myMatches, setMyMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPopup, setShowPopup] = useState(false);
  const [popupMatch, setPopupMatch] = useState(null);

  // 🔹 Cargar perfiles y matches
  useEffect(() => {
    if (!userId) return;

    const loadProfiles = async () => {
      try {
        const perfiles = await fetchProfiles(userId);
        setProfiles(perfiles || []);
        setLoading(false);
      } catch (err) {
        console.error("Error cargando perfiles:", err);
        setLoading(false);
      }
    };

    const loadMatches = async () => {
      try {
        const data = await fetchMatches(userId);
        setMyMatches(data || []);
      } catch (err) {
        console.error("Error al cargar matches:", err);
      }
    };

    loadProfiles();
    loadMatches();
  }, [userId]);

  // 🔹 Dar like
  const handleLike = async () => {
    if (!profiles[currentIndex]) return;
    const likedUser = profiles[currentIndex];

    try {
      const result = await likeUser(userId, likedUser.id);

      setCurrentIndex((prev) => prev + 1);

      if (result.isMatch && result.match?.match_key) {
        setPopupMatch(likedUser);
        setShowPopup(true);
        setMyMatches((prev) => [...prev, { match_id: result.match.match_key, user: likedUser }]);
        // Ocultar popup automáticamente después de 5 segundos
        setTimeout(() => setShowPopup(false), 5000);
      }
    } catch (err) {
      console.error("Error al dar like:", err);
    }
  };

  const handleSkip = () => setCurrentIndex((prev) => prev + 1);

  const handleViewChats = () => {
    router.push(`/chat?userId=${userId}`);
  };

  const handleRestart = async () => {
    setLoading(true);
    const perfiles = await fetchProfiles(userId);
    setProfiles(perfiles || []);
    setCurrentIndex(0);
    setPopupMatch(null);
    setShowPopup(false);
    setLoading(false);
  };

  if (loading) return <p>Cargando perfiles...</p>;

  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
        <h2>💘 Conocé gente en la fiesta</h2>
        <button onClick={handleViewChats}>Ver mis Chats</button>
        <p>Ya viste todos los perfiles disponibles 🔄</p>
        <button onClick={handleRestart}>Recargar perfiles</button>
      </div>
    );
  }

  const profile = profiles[currentIndex];

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Explorar</h2>

      <div>
        <img
          src={profile.foto_url}
          alt={profile.nombre || "Perfil"}
          style={{ width: "100%", borderRadius: 8 }}
        />
        <h3>{profile.nombre}</h3>
        <p>Edad: {profile.edad}</p>
        <p>Mesa: {profile.mesa}</p>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleLike}>💖 Me gusta</button>
        <button onClick={handleSkip} style={{ marginLeft: 10 }}>
          ⏭️ Saltar
        </button>
      </div>

      {/* Popup de match */}
      {showPopup && popupMatch && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          backgroundColor: "white",
          border: "2px solid green",
          padding: 15,
          borderRadius: 8,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          zIndex: 1000
        }}>
          🎉 ¡Es un match con {popupMatch.nombre}!
          <button
            style={{ marginLeft: 10 }}
            onClick={() => router.push({
              pathname: "/chat",
              query: { userId, otherUserId: popupMatch.id, otherName: popupMatch.nombre }
            })}
          >
            Abrir Chat
          </button>
        </div>
      )}
    </div>
  );
}
