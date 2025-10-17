// pages/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createProfile } from '../utils/supabaseHelpers';

export default function Home() {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [mesa, setMesa] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingStorage, setCheckingStorage] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      router.replace(`/browse?userId=${savedUserId}`);
    } else {
      setCheckingStorage(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre || !edad || !mesa || !file) {
      alert('Por favor completá todos los campos');
      return;
    }
    setLoading(true);
    try {
      const profile = await createProfile({ nombre, edad: Number(edad), mesa, file });
      localStorage.setItem('userId', profile.id);
      router.push(`/browse?userId=${profile.id}`);
    } catch (error) {
      alert('Error al crear perfil: ' + error.message);
    }
    setLoading(false);
  };

  if (checkingStorage) return (
    <div className="container">
      <div className="card fade-in" style={{textAlign: 'center', padding: '40px'}}>
        <div className="wedding-header">
          <h1 className="wedding-title">Boda Chris y Romi</h1>
          <p className="wedding-subtitle">Cargando...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="wedding-header fade-in">
  <h1 className="wedding-title-elegant">Boda Chris y Romi</h1>
  <div className="wedding-line"></div>
  <p className="wedding-subtitle">15 • 11 • 2025</p>
</div>

      <div className="card fade-in">
        <h2 style={{textAlign: 'center', marginBottom: '24px', color: 'var(--primary)'}}>
          Creá tu perfil
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <input
              type="number"
              placeholder="Edad"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Mesa asignada"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ 
                width: '100%',
                padding: '12px',
                border: '2px dashed var(--border)',
                borderRadius: '12px',
                background: 'var(--background)'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span>Creando...</span>
                <div style={{width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
              </>
            ) : 'Crear Perfil y Entrar'}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}