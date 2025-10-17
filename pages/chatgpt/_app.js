// pages/_app.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function MyApp({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión activa al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('Sesión restaurada:', session.user.id);
        // Podés guardar session.user.id en un estado global o contexto si lo necesitás
      }
      setLoading(false);
    });

    // Escuchar cambios de sesión (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        console.log('Usuario autenticado:', session.user.id);
      } else {
        console.log('Sesión cerrada');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <p>Cargando app...</p>;

  return <Component {...pageProps} />;
}

export default MyApp;
