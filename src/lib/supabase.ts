import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const env = {
  demoLogin: import.meta.env.VITE_DEMO_LOGIN !== 'false',
  demoPassword: (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? '',
  enable3d: import.meta.env.VITE_3D_ENABLED !== 'false',
  aiEnabled: import.meta.env.VITE_AI_ENABLED === 'true',
};
