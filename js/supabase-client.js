// Cajun Bingo Supply — Supabase client setup
// Fill in these two values from your Supabase project (Project Settings → API).
// The anon key is safe to commit — it's a public key; Row Level Security
// (see supabase/schema.sql) is what actually protects the data, not this key.

const SUPABASE_URL = 'https://bbmfiiowhdognusryllp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bjhrKTcVfTTStJ_g1Zw17w_8rh08un2';

// Overwrite window.supabase (the library namespace) with the client instance
// itself — a `const supabase = ...` here would collide with the identifier
// the CDN script already declared and throw "already been declared".
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
