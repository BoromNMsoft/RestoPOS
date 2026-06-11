import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const users = [
      { email: "admin@restopos.fr", password: "admin123", full_name: "Administrateur", role: "admin" },
      { email: "caissier@restopos.fr", password: "caissier123", full_name: "Caissier", role: "cashier" },
    ];

    const results = [];

    for (const user of users) {
      // Check if user already exists
      const checkRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(user.email)}`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      const checkData = await checkRes.json();

      if (checkData.users && checkData.users.length > 0) {
        results.push({ email: user.email, status: "already_exists" });
        continue;
      }

      // Create user via admin API
      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          email_confirm: true,
          app_metadata: { role: user.role },
          user_metadata: { full_name: user.full_name, role: user.role },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        results.push({ email: user.email, status: "error", error: err });
      } else {
        results.push({ email: user.email, status: "created" });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
