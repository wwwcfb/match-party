// pages/_app.js
import '../styles/globals.css';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function MyApp({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión activa al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('Sesión restaurada:', session.user.id);
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

  if (loading) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontFamily: 'Playfair Display, serif',
          fontSize: '2.5rem',
          marginBottom: '1rem'
        }}>
          Boda CyR
        </h1>
        <p>Cargando aplicación...</p>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&family=Inter:wght@300;400;500;600&display=swap" 
          rel="stylesheet" 
        />
        <title>Boda CyR - Match Party</title>
        <meta name="description" content="App de matches para la boda CyR" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;