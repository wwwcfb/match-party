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
      alert('Perfil creado con éxito!');
      router.push(`/browse?userId=${profile.id}`);
    } catch (error) {
      alert('Error al crear perfil: ' + error.message);
    }
    setLoading(false);
  };

  if (checkingStorage) return <p style={{ textAlign: 'center' }}>Cargando...</p>;

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h1 style={{ textAlign: 'center' }}>Creá tu perfil</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ padding: 8, fontSize: 16 }}
        />
        <input
          type="number"
          placeholder="Edad"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
          style={{ padding: 8, fontSize: 16 }}
        />
        <input
          type="text"
          placeholder="Mesa"
          value={mesa}
          onChange={(e) => setMesa(e.target.value)}
          style={{ padding: 8, fontSize: 16 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ padding: 8 }}
        />
        <button type="submit" disabled={loading} style={{ padding: 10, fontSize: 16 }}>
          {loading ? 'Creando...' : 'Crear perfil'}
        </button>
      </form>
    </div>
  );
}
