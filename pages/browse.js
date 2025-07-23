import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchProfiles, likeUser } from '../utils/supabaseHelpers';

export default function Browse() {
  const router = useRouter();
  const { userId } = router.query;

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchFound, setMatchFound] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchProfiles(userId)
      .then((data) => {
        setProfiles(data);
        setLoading(false);
      })
      .catch((err) => {
        alert('Error cargando perfiles: ' + err.message);
        setLoading(false);
      });
  }, [userId]);

  const handleLike = async () => {
    if (!profiles[currentIndex]) return;
    const likedUser = profiles[currentIndex];
    try {
      const isMatch = await likeUser(userId, likedUser.id);
      if (isMatch) setMatchFound(likedUser);
      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      alert('Error al dar like: ' + error.message);
    }
  };

  const handleSkip = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setMatchFound(null);
  };

  if (loading) return <p style={{ textAlign: 'center' }}>Cargando perfiles...</p>;
  if (currentIndex >= profiles.length)
    return (
      <div style={{ maxWidth: 400, margin: 'auto', padding: 20, textAlign: 'center' }}>
        <p>No hay más perfiles para mostrar.</p>
        <button onClick={handleRestart} style={{ padding: 10, fontSize: 16, marginTop: 10 }}>
          Volver a empezar
        </button>
      </div>
    );

  const profile = profiles[currentIndex];

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2 style={{ textAlign: 'center' }}>Soltero N° {profile.numero || '...'}</h2>
      <div style={{ textAlign: 'center' }}>
        <img
          src={profile.foto_url}
          alt={profile.nombre || 'Perfil'}
          style={{ width: '100%', borderRadius: 8 }}
        />
        <h3>{profile.nombre}</h3>
        {profile.edad && <p>Edad: {profile.edad}</p>}
        {profile.mesa && <p>Mesa: {profile.mesa}</p>}
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button onClick={handleLike} style={{ padding: 10, fontSize: 16, marginRight: 10 }}>
          Me gusta
        </button>
        <button onClick={handleSkip} style={{ padding: 10, fontSize: 16 }}>
          Saltar
        </button>
      </div>

      {matchFound && (
        <div style={{ marginTop: 20, color: 'green', textAlign: 'center' }}>
          ¡Es un match con {matchFound.nombre}!
        </div>
      )}
    </div>
  );
}
