import { supabase } from '../supabaseClient';
import { UserRole, UserWithRole } from './types';

export async function fetchUserRole(): Promise<UserRole> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'user';
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (error || !data) return 'user';
  return data.role as UserRole;
}

export async function fetchAllUsers(): Promise<UserWithRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, email, role')
    .order('email', { ascending: true });
  if (error) throw error;
  return (data || []) as UserWithRole[];
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .update({ role })
    .eq('user_id', userId);
  if (error) throw error;
}
