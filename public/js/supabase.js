// ===============================================
// Jiya Fit Buddy - connection to the backend
// ===============================================
// We use the official Supabase JavaScript client.
// The key below is the PUBLIC (publishable) key. It is safe in the browser
// because every table is protected by Row Level Security on the server.
// Secret keys are NEVER placed in this folder.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const SUPABASE_URL = "https://c--dd5a0df2-a78f-4d80-bbf5-325c6ca9ab8d-prod.lovable.cloud";
const SUPABASE_PUBLIC_KEY = "sb_publishable_lnLKsWnUZKuCoxz75zPlEA_iwouf_uU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Returns the logged in user, or null when nobody is logged in.
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

// Returns the access token. The AI Coach endpoint needs it.
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session ? data.session.access_token : null;
}
