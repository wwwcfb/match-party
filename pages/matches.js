import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Matches() {
  const router = useRouter();
  const { userId } = router.query;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchMatches(userId);
  }, [userId]);

  async function fetchMatches(myUserId) {
    setLoading(true);
    try {
      // Traemos los matches donde user1 o user2 es mi id
      const { data, error } = await supabase
        .from('matches')
        .select('user1, user2')
        .or(`user1.eq.${myUserId},user2.eq.${myUserId}`);

      if (error) throw error;

      // Sacamos el id de la persona que no soy yo en cada match
      const otherUserIds = data.map((m) =>
        m.user1 === myUserId ? m.user2 : m.user1
      );

      // Buscamos datos de esos usuarios
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select()
        .in('id', otherUserIds);

      if (usersError) throw usersError;

      setMatches(users);
    } catch (error) {
      alert('Error al cargar matches: ' + error.message);
    }
    setLoading(false);
  }

  if (loading) return <p>Cargando matches...</p>;
  if (matches.length === 0) return <p>No tenés matches aún.</p>;

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Mis Matches</h2>
      {matches.map((match) => (
        <div
          key={match.id}
          style={{
            border: '1px solid #ccc',
            marginBottom: 10,
            padding: 10,
            textAlign: 'center',
          }}
        >
          <img
            src={match.foto_url}
            alt={match.nombre}
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }}
          />
          <h3>{match.nombre}, {match.edad}</h3>
          <p>Mesa: {match.mesa}</p>
        </div>
      ))}
    </div>
  );
}
