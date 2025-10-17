import { supabase } from '../lib/supabaseClient.js';

// ======================
// 📌 PERFILES
// ======================

export async function createProfile({ nombre, edad, mesa, file }) {
  const fileName = `${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase
    .storage
    .from('avatars')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase
    .storage
    .from('avatars')
    .getPublicUrl(fileName);

  const foto_url = publicUrlData.publicUrl;

  const { data, error } = await supabase
    .from('users')
    .insert({ nombre, edad, mesa, foto_url })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProfiles(myUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, edad, mesa, foto_url')
    .neq('id', myUserId);

  if (error) throw error;
  return data || [];
}

// ======================
// ❤️ MATCHES
// ======================

export async function likeUser(myUserId, otherUserId) {
  await supabase
    .from('likes')
    .insert({ user_from: myUserId, user_to: otherUserId });

  const { data: reciprocal } = await supabase
    .from('likes')
    .select()
    .eq('user_from', otherUserId)
    .eq('user_to', myUserId)
    .single();

  if (reciprocal) {
    const [u1, u2] = [myUserId, otherUserId].sort();
    const match_key = `${u1}_${u2}`;

    const { data: matchData } = await supabase
      .from('matches')
      .upsert({ user1: u1, user2: u2, match_key })
      .select()
      .single();

    return { isMatch: true, match: matchData };
  }

  return { isMatch: false };
}

export async function fetchMatches(myUserId) {
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      user1, user2,
      users1:users!user1(id, nombre, foto_url),
      users2:users!user2(id, nombre, foto_url)
    `)
    .or(`user1.eq.${myUserId},user2.eq.${myUserId}`);

  if (error) throw error;

  return matches.map((m) => {
    const chatUser = m.user1 === myUserId ? m.users2 : m.users1;
    return { match_id: m.match_key, user: chatUser };
  });
}

// ======================
// 📩 CHAT
// ======================

export async function sendMessage(senderId, receiverId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ sender_id: senderId, receiver_id: receiverId, text }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchMessages(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export function subscribeToMessages(userId, otherUserId, callback) {
  return supabase
    .channel('messages-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === userId)
        ) {
          callback(msg);
        }
      }
    )
    .subscribe();
}

// ======================
// 🔔 NOTIFICACIONES EN TIEMPO REAL
// ======================

export function subscribeToMatches(userId, callback) {
  console.log(`🔔 Suscribiendo a matches para usuario: ${userId}`);
  
  const subscription = supabase
    .channel('matches-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `or(user1.eq.${userId},user2.eq.${userId})`
      },
      async (payload) => {
        console.log('📨 Nuevo match recibido via WebSocket:', payload);
        const newMatch = payload.new;
        
        const otherUserId = newMatch.user1 === userId ? newMatch.user2 : newMatch.user1;
        
        const { data: otherUser, error } = await supabase
          .from('users')
          .select('id, nombre, foto_url')
          .eq('id', otherUserId)
          .single();

        if (error) {
          console.error('Error obteniendo usuario del match:', error);
          return;
        }

        if (otherUser) {
          console.log('✅ Match procesado:', otherUser.nombre);
          callback({
            match_id: newMatch.match_key,
            user: otherUser,
            created_at: newMatch.created_at
          });
        }
      }
    )
    .subscribe((status) => {
      console.log(`📡 Estado de suscripción a matches:`, status);
    });

  return subscription;
}

export function subscribeToLikes(userId, callback) {
  console.log(`🔔 Suscribiendo a likes para usuario: ${userId}`);
  
  const subscription = supabase
    .channel('likes-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'likes',
        filter: `user_to.eq.${userId}`
      },
      async (payload) => {
        console.log('📨 Nuevo like recibido via WebSocket:', payload);
        const like = payload.new;
        
        const { data: myLike, error } = await supabase
          .from('likes')
          .select()
          .eq('user_from', userId)
          .eq('user_to', like.user_from)
          .single();

        if (error) {
          console.log('No hay like recíproco aún');
          return;
        }

        if (myLike) {
          console.log('⚡ ¡Match recíproco detectado!');
          const { data: otherUser, error: userError } = await supabase
            .from('users')
            .select('id, nombre, foto_url')
            .eq('id', like.user_from)
            .single();

          if (userError) {
            console.error('Error obteniendo usuario:', userError);
            return;
          }

          if (otherUser) {
            callback({
              type: 'instant_match',
              user: otherUser,
              timestamp: new Date()
            });
          }
        }
      }
    )
    .subscribe((status) => {
      console.log(`📡 Estado de suscripción a likes:`, status);
    });

  return subscription;
}

// ======================
// 🔄 POLLING COMO RESPALDO
// ======================

export function startMatchPolling(userId, callback, interval = 3000) {
  console.log("🔄 Iniciando polling de matches para:", userId);
  
  let lastMatches = [];
  
  const poll = async () => {
    try {
      const currentMatches = await fetchMatches(userId);
      console.log("🔄 Polling - Matches actuales:", currentMatches.length);
      
      // Verificar si hay nuevos matches comparando los arrays
      const newMatches = currentMatches.filter(newMatch => 
        !lastMatches.some(oldMatch => oldMatch.match_id === newMatch.match_id)
      );
      
      if (newMatches.length > 0) {
        console.log("🎯 NUEVOS MATCHES DETECTADOS via polling:", newMatches);
        
        newMatches.forEach(match => {
          callback({
            type: 'polling_match',
            user: match.user,
            message: `🎉 ¡Es un match con ${match.user.nombre}!`,
            timestamp: new Date()
          });
        });
      }
      
      lastMatches = currentMatches;
    } catch (error) {
      console.error("❌ Error en polling:", error);
    }
  };
  
  // Poll inmediatamente y luego cada intervalo
  poll();
  const intervalId = setInterval(poll, interval);
  
  return () => {
    console.log("🔄 Deteniendo polling de matches");
    clearInterval(intervalId);
  };
}