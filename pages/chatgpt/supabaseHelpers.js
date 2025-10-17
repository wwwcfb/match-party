import { supabase } from '../lib/supabase.js';

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

// Devuelve además el nombre y foto del otro usuario
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

  // Transformar para que sea más fácil de usar en el frontend
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
