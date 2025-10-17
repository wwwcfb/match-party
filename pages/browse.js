import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { 
  fetchProfiles, 
  likeUser, 
  fetchMatches, 
  subscribeToMatches,
  subscribeToLikes,
  startMatchPolling
} from "../utils/supabaseHelpers";

export default function Browse() {
  const router = useRouter();
  const { userId: urlUserId } = router.query;
  
  const userId = urlUserId || localStorage.getItem('userId');

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myMatches, setMyMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPopup, setShowPopup] = useState(false);
  const [popupMatch, setPopupMatch] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // 🔹 Debug: estado general
  useEffect(() => {
    console.log("=== DEBUG BROWSER ===");
    console.log("userId:", userId);
    console.log("profiles cargados:", profiles.length);
    console.log("matches cargados:", myMatches.length);
    console.log("loading:", loading);
    console.log("currentIndex:", currentIndex);
  }, [userId, profiles.length, myMatches.length, loading, currentIndex]);

  // 🔹 Verificar userId
  useEffect(() => {
    if (!userId) {
      console.log("❌ No userId, redirigiendo al home");
      router.push('/');
      return;
    }
  }, [userId]);

  // 🔹 Cargar perfiles y matches
  useEffect(() => {
    if (!userId) return;

    console.log("🟡 Cargando perfiles y matches para userId:", userId);

    const loadProfiles = async () => {
      try {
        const perfiles = await fetchProfiles(userId);
        console.log("📊 Perfiles obtenidos:", perfiles?.length || 0);
        setProfiles(perfiles || []);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error cargando perfiles:", err);
        setLoading(false);
      }
    };

    const loadMatches = async () => {
      try {
        const data = await fetchMatches(userId);
        console.log("💕 Matches obtenidos:", data?.length || 0);
        setMyMatches(data || []);
      } catch (err) {
        console.error("❌ Error al cargar matches:", err);
      }
    };

    loadProfiles();
    loadMatches();
  }, [userId]);

  // 🔹 POLLING PARA DETECTAR MATCHES
  useEffect(() => {
    if (!userId) return;

    console.log("🔄 Iniciando polling para userId:", userId);

    const stopPolling = startMatchPolling(userId, (notification) => {
      console.log('🔄 Match detectado via polling');
      addNotification(notification);
      // Recargar matches
      fetchMatches(userId).then(matches => setMyMatches(matches || []));
    }, 2000); // Cada 2 segundos

    return () => {
      console.log("🔄 Deteniendo polling");
      if (stopPolling) stopPolling();
    };
  }, [userId]);

  // 🔹 SUSCRIPCIÓN A NOTIFICACIONES EN TIEMPO REAL
  useEffect(() => {
    if (!userId) {
      console.log("❌ No userId, no se pueden inicializar suscripciones");
      return;
    }

    console.log("🟡 Inicializando WebSockets para:", userId);

    let matchesSubscription;
    let likesSubscription;

    try {
      // Suscribirse a nuevos matches
      matchesSubscription = subscribeToMatches(userId, (newMatch) => {
        console.log('✅ Nuevo match en tiempo real:', newMatch);
        
        addNotification({
          type: 'match',
          user: newMatch.user,
          message: `🎉 ¡Es un match con ${newMatch.user.nombre}!`,
          timestamp: new Date()
        });

        setMyMatches(prev => [...prev, newMatch]);
      });

      // Suscribirse a likes (para matches instantáneos)
      likesSubscription = subscribeToLikes(userId, (matchData) => {
        console.log('✅ Match instantáneo detectado:', matchData);
        
        addNotification({
          type: 'instant_match',
          user: matchData.user,
          message: `⚡ ¡Match recíproco con ${matchData.user.nombre}!`,
          timestamp: new Date()
        });
      });

      console.log("🟢 WebSockets configurados correctamente");

    } catch (error) {
      console.error("❌ Error inicializando suscripciones:", error);
    }

    return () => {
      console.log("🟡 Limpiando suscripciones");
      if (matchesSubscription) matchesSubscription.unsubscribe();
      if (likesSubscription) likesSubscription.unsubscribe();
    };
  }, [userId]);

  // 🔹 Función para agregar notificaciones
  const addNotification = (notification) => {
    console.log("🟡 Agregando notificación:", notification);
    const newNotification = {
      id: Date.now(),
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setPopupMatch(notification.user);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 5000);
  };

  // 🔹 Dar like
  const handleLike = async () => {
    if (!profiles[currentIndex] || !userId) {
      console.log("❌ No hay perfil o userId para dar like");
      return;
    }
    
    const likedUser = profiles[currentIndex];
    console.log("🟡 Dando like a:", likedUser.nombre, "ID:", likedUser.id);

    try {
      const result = await likeUser(userId, likedUser.id);
      console.log("🟡 Resultado COMPLETO del like:", JSON.stringify(result, null, 2));

      setCurrentIndex((prev) => prev + 1);

      if (result.isMatch && result.match?.match_key) {
        console.log("✅ Match creado localmente - KEY:", result.match.match_key);
        addNotification({
          type: 'match',
          user: likedUser,
          message: `🎉 ¡Es un match con ${likedUser.nombre}!`,
          timestamp: new Date()
        });

        setMyMatches((prev) => [...prev, { 
          match_id: result.match.match_key, 
          user: likedUser 
        }]);
      } else {
        console.log("ℹ️ Solo like, no hay match aún");
      }
    } catch (err) {
      console.error("❌ Error al dar like:", err);
    }
  };

  const handleSkip = () => {
    console.log("⏭️ Saltando perfil");
    setCurrentIndex((prev) => prev + 1);
  };

  const handleViewChats = () => {
    if (!userId) {
      alert("Error: No se pudo cargar tu usuario. Intenta recargar la página.");
      return;
    }
    console.log("💬 Navegando a chats");
    router.push(`/chat?userId=${userId}`);
  };

  const handleRestart = async () => {
    if (!userId) return;
    console.log("🔄 Recargando perfiles");
    setLoading(true);
    const perfiles = await fetchProfiles(userId);
    setProfiles(perfiles || []);
    setCurrentIndex(0);
    setPopupMatch(null);
    setShowPopup(false);
    setLoading(false);
  };

  const handleCheckMatches = async () => {
    if (!userId) return;
    console.log("🔍 Verificando matches manualmente...");
    const matches = await fetchMatches(userId);
    console.log("📊 Matches encontrados:", matches);
    if (matches.length > 0) {
      alert(`Tienes ${matches.length} matches! Revisa la consola para más detalles.`);
      setMyMatches(matches);
    } else {
      alert("No tienes matches todavía.");
    }
  };

  const closePopup = () => {
    console.log("❌ Cerrando popup");
    setShowPopup(false);
    setPopupMatch(null);
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
          <p>Cargando perfiles...</p>
          <p>UserID: {userId}</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <div className="container">
        <div className="wedding-header fade-in">
  <h1 className="wedding-title-elegant">Boda Chris y Romi</h1>
  <div className="wedding-line"></div>
  <p className="wedding-subtitle">Encuentra tu 1/2 manzana</p>
</div>

        <div className="card fade-in">
          <h2 style={{textAlign: 'center', marginBottom: '20px', color: 'var(--primary)'}}>
            💘 Conocé gente en la fiesta
          </h2>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <button onClick={handleViewChats} className="btn btn-primary">
              Ver mis Chats
            </button>
            <button onClick={handleRestart} className="btn btn-outline">
              🔄 Recargar perfiles
            </button>
            <button onClick={handleCheckMatches} className="btn" style={{backgroundColor: '#ff9800', color: 'white'}}>
              🔍 Verificar Matches
            </button>
          </div>

          <p style={{textAlign: 'center', marginTop: '20px', color: 'var(--text-light)'}}>
            Ya viste todos los perfiles disponibles
          </p>
        </div>
      </div>
    );
  }

  const profile = profiles[currentIndex];
  console.log("🟡 Mostrando perfil:", profile.nombre);

  return (
    <div className="container">
      {/* Header de boda */}
      <div className="wedding-header fade-in">
        <h1 className="wedding-title">Boda Chris y Romi</h1>
        <p className="wedding-subtitle">Conocé a otros invitados</p>
      </div>

      {/* Perfil actual */}
      <div className="profile-card fade-in">
        <img
          src={profile.foto_url}
          alt={profile.nombre || "Perfil"}
          className="profile-image"
        />
        <div className="profile-info">
          <h2 className="profile-name">{profile.nombre}</h2>
          <div className="profile-details">
            <p>Edad: {profile.edad}</p>
            <p>Mesa: {profile.mesa}</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
<div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
  <button onClick={handleLike} className="btn btn-like" style={{flex: 1}}>
    💖 Me gusta
  </button>
  <button onClick={handleSkip} className="btn btn-warning" style={{flex: 1}}>
    ⏭️ Saltar
  </button>
</div>

      {/* Popup de match moderno */}
      {showPopup && popupMatch && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001,
          padding: "20px"
        }}>
          <div className="card" style={{ 
            textAlign: 'center',
            maxWidth: '400px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '2rem' }}>🎉 ¡MATCH!</h3>
            <img 
              src={popupMatch.foto_url} 
              alt={popupMatch.nombre}
              style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'block',
                border: '4px solid white'
              }}
            />
            <p style={{ fontSize: '1.3rem', margin: '0 0 30px 0' }}>
              ¡Es un match con <strong>{popupMatch.nombre}</strong>!
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => router.push({
                  pathname: "/chat",
                  query: { 
                    userId, 
                    otherUserId: popupMatch.id, 
                    otherName: popupMatch.nombre 
                  }
                })}
                className="btn"
                style={{background: 'white', color: '#667eea'}}
              >
                💬 Abrir Chat
              </button>
              <button
                onClick={closePopup}
                className="btn btn-outline"
                style={{borderColor: 'white', color: 'white'}}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones flotantes */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000
        }}>
          {notifications.slice(0, 3).map(notif => (
            <div key={notif.id} className="notification" style={{marginBottom: '10px', minWidth: '280px'}}>
              <strong>{notif.message}</strong>
              <button 
                onClick={() => {
                  console.log("💬 Navegando al chat desde notificación");
                  router.push({
                    pathname: "/chat",
                    query: { 
                      userId, 
                      otherUserId: notif.user.id, 
                      otherName: notif.user.nombre 
                    }
                  });
                }}
                style={{
                  marginLeft: '10px',
                  backgroundColor: 'white',
                  color: '#38B2AC',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Chatear
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}