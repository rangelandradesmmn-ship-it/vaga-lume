'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function createProfessional(data: { name: string, email: string, phone: string, role_title: string, class_name: string }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // 1. Criar usuário no Auth com o Service Role (para não deslogar o Admin)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: 'vagalume_trocar_senha', // Senha temporária padrão
      email_confirm: true, // Auto-confirmar
      user_metadata: {
        name: data.name,
        role: 'PROFESSIONAL'
      }
    });

    if (authError) throw authError;

    // A trigger no banco de dados já criará o 'profile' como PROFESSIONAL.
    // 2. Precisamos adicionar os dados complementares na tabela de profissionais (a ser criada)
    if (authData.user) {
       const { error: profError } = await supabaseAdmin.from('professionals').insert({
         id: authData.user.id,
         role_title: data.role_title,
         class_name: data.class_name
       });
       
       if (profError) throw profError;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfessional(id: string, data: { name: string, role_title: string, class_name: string }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Update profile
    const { error: profError } = await supabaseAdmin
      .from('profiles')
      .update({ name: data.name })
      .eq('id', id);
    if (profError) throw profError;

    // Update professionals extra table (upsert in case it doesn't exist)
    const { error: extError } = await supabaseAdmin
      .from('professionals')
      .upsert({ id: id, role_title: data.role_title, class_name: data.class_name }, { onConflict: 'id' });
    if (extError) throw extError;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfessionalPassword(id: string, password: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: password
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
