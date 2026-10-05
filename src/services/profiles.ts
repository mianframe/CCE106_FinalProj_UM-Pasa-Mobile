import { supabase } from '../supabase';
import type { ProfileRow } from '../database.types';
import { checked, currentAuthUser } from './common';

export const profiles = {
  async reviews(userId: string) {
    const { data, error } = await supabase.rpc('public_profile_reviews', { p_user_id: userId });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  async getMine(): Promise<ProfileRow> {
    const user = await currentAuthUser();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return checked(data as ProfileRow | null, error, 'Your UM-Pasa profile was not found.');
  },
  async updateMine(values: Pick<ProfileRow, 'full_name' | 'student_number' | 'department' | 'program'>): Promise<ProfileRow> {
    const user = await currentAuthUser();
    const { error } = await supabase.from('profiles').update({
      full_name: values.full_name.trim(),
      student_number: values.student_number?.trim() || null,
      department: values.department?.trim() || null,
      program: values.program?.trim() || null,
    }).eq('id', user.id);
    if (error) throw new Error(error.message);
    return this.getMine();
  },
};
