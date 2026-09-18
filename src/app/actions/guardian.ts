'use server';

import { createClient } from '@supabase/supabase-js';

export async function changeUserPassword(userId: string, newPassword: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fallback.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(url, key);

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
