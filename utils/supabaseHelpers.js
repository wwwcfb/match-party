import { supabase } from '../lib/supabase';

// Crear perfil y subir foto
export async function createProfile({ nombre, edad, mesa, file }) {
  const fileName = `${Date.now()}_${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase
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

// Obtener perfiles distintos al mío
export async function fetchProfiles(myUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, edad, mesa, foto_url')
    .neq('id', myUserId);

  if (error) throw error;
  return data;
}

// Dar like y detectar match
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

    await supabase
      .from('matches')
      .upsert({ user1: u1, user2: u2, match_key });

    return true;
  }
  return false;
}

// Obtener mis matches
export async function fetchMatches(myUserId) {
  const { data, error } = await supabase
    .from('matches')
    .select('user1, user2')
    .or(`user1.eq.${myUserId},user2.eq.${myUserId}`);

  if (error) throw error;
  return data;
}
