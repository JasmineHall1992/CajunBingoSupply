// Supabase Edge Function: admin-delete-user
//
// Deletes a user account entirely (auth.users row + everything that
// cascades from it — profiles, favorites, activity_log). This can't be
// done from browser JS: it requires the service_role key, which must
// never be shipped to the client.
//
// Deploy: supabase functions deploy admin-delete-user
// Called from pages/admin.html via: supabase.functions.invoke('admin-delete-user', { body: { userId } })

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  // Client scoped to the caller's own JWT — used only to verify identity.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  // Service-role client — bypasses RLS, only used after admin check passes.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !callerProfile || callerProfile.role !== "admin") {
    return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const { userId } = body;
  if (!userId) {
    return new Response(JSON.stringify({ error: "userId is required" }), { status: 400 });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
