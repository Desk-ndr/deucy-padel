import { supabase } from '@/integrations/supabase/client';
import type { Player } from '@/lib/types';

export async function getPlayer(playerId: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error) throw new Error(`Failed to fetch player: ${error.message}`);
  return data as Player;
}

export async function updateProfile(
  playerId: string,
  data: { full_name?: string; avatar_url?: string }
): Promise<void> {
  const { error } = await supabase
    .from('players')
    .update(data)
    .eq('id', playerId);

  if (error) throw new Error(`Failed to update player profile: ${error.message}`);
}

export async function uploadAvatar(playerId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${playerId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw new Error(`Failed to upload avatar: ${uploadError.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  return data.publicUrl;
}

export async function getPlayerStats(playerId: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error) throw new Error(`Failed to fetch player stats: ${error.message}`);
  return data as Player;
}
