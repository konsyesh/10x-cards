import { createClient } from "@supabase/supabase-js";

/**
 * Po `supabase db reset` uruchom:
 *    npm run seed-user
 *
 * Ten skrypt:
 * - łączy się anon key,
 * - próbuje signUp(email, password),
 * - jeśli user już istnieje -> signInWithPassword żeby zdobyć jego id,
 * - loguje ID usera (możesz je potem użyć w appce jako DEFAULT_USER_ID).
 *
 * To odtwarza flow "Create user" w Supabase Studio. Supabase Auth tworzy rekord
 * w auth.users i auth.identities. auth schema nie jest dostępna przez REST API
 * (PostgREST), więc nie próbujemy jej patchować. :contentReference[oaicite:5]{index=5}
 */

const { SUPABASE_URL, SUPABASE_KEY, SEED_USER_EMAIL, SEED_USER_PASSWORD } = process.env;

console.log(SUPABASE_URL, SUPABASE_KEY, SEED_USER_EMAIL, SEED_USER_PASSWORD);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[dev-seed-user] Brakuje SUPABASE_URL / SUPABASE_KEY w .env");
  process.exit(1);
}
if (!SEED_USER_EMAIL || !SEED_USER_PASSWORD) {
  console.error("[dev-seed-user] Brakuje SEED_USER_EMAIL / SEED_USER_PASSWORD w .env");
  process.exit(1);
}

// Klient publiczny (anon). Dokładnie taki jak w frontendzie.
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getOrCreateDevUser() {
  console.log(`[dev-seed-user] Próba signUp ${SEED_USER_EMAIL} ...`);

  const { data, error } = await supabaseAnon.auth.signUp({
    email: SEED_USER_EMAIL,
    password: SEED_USER_PASSWORD,
    // w hosted Supabase można też przekazać options.emailRedirectTo itd.
  });

  if (!error && data?.user) {
    console.log("[dev-seed-user] signUp OK (utworzono nowego usera)");
    return { user: data.user, created: true };
  }

  // jeśli user już istnieje, Supabase zwykle zwraca błąd typu "User already registered"
  // w nowszych wersjach jest to często HTTP 422.
  if (error && (error.status === 422 || error.message?.match(/already/i))) {
    console.log("[dev-seed-user] User już istnieje, loguję się żeby dostać ID ...");

    const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email: SEED_USER_EMAIL,
      password: SEED_USER_PASSWORD,
    });

    if (signInErr) {
      console.error("[dev-seed-user] signIn error mimo że user powinien istnieć:", signInErr);
      process.exit(1);
    }

    console.log("[dev-seed-user] signIn OK (user już był w bazie)");
    return { user: signInData.user, created: false };
  }

  console.error("[dev-seed-user] signUp error:", error);
  process.exit(1);
}

async function main() {
  const { user, created } = await getOrCreateDevUser();
  console.log("[dev-seed-user] User ID:", user.id, "created?", created);

  console.log("[dev-seed-user] Gotowe ✅");
  console.log("[dev-seed-user] Jeśli w appce chcesz mieć tego usera jako DEFAULT_USER_ID,");
  console.log("[dev-seed-user] możesz teraz wkleić to ID do env/dev configu albo pobierać je po emailu.");
}

main().catch((err) => {
  console.error("[dev-seed-user] Fatal:", err);
  process.exit(1);
});
