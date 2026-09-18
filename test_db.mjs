import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://prouumqvzpfyetrzedsa.supabase.co';
const supabaseAnonKey = 'sb_publishable_tWoC8v-iJXeguC7zb6Ge0g_etoO0fG4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('invites').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
