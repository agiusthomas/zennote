import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidUrl = (url) => {
  try {
    new URL(url);
    return url.includes('.supabase.co') || url.startsWith('http://') || url.startsWith('https://');
  } catch (e) {
    return false;
  }
};

const isConfigured = isValidUrl(supabaseUrl) && 
                      supabaseAnonKey && 
                      !supabaseAnonKey.includes('your-anon-key-here') && 
                      !supabaseUrl.includes('your-project-id');

let supabaseClient;

if (isConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    'Supabase environment variables are missing or incorrect. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
  
  // Return a mock supabase client to prevent runtime crashes prior to setup
  supabaseClient = new Proxy({}, {
    get(target, prop) {
      if (prop === 'auth') {
        return {
          onAuthStateChange: (cb) => {
            // Trigger callback immediately with signed out state
            cb('SIGNED_OUT', null);
            return { data: { subscription: { unsubscribe: () => {} } } };
          },
          signInWithOAuth: async () => {
            alert('Supabase is not configured. Please add your credentials to the .env.local file and restart your local development server.');
            return { error: new Error('Supabase not configured') };
          },
          signOut: async () => {
            return { error: null };
          },
          getSession: async () => {
            return { data: { session: null }, error: null };
          }
        };
      }
      
      // Fallback helper to mock query responses
      return (...args) => {
        console.error(`Supabase method "${prop}" called but Supabase is not configured.`);
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
            }),
            order: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
          }),
          insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          })
        };
      };
    }
  });
}

export const supabase = supabaseClient;
export const isSupabaseConfigured = isConfigured;
