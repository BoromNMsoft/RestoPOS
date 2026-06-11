import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile() {
  try {
    const content = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional if vars already exported
  }
}

loadEnvFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env\n' +
      'Add SUPABASE_SERVICE_ROLE_KEY from Supabase → Project Settings → API → service_role'
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const demoUsers = [
  { email: 'admin@restopos.fr', password: 'admin123', full_name: 'Administrateur', role: 'admin' },
  { email: 'caissier@restopos.fr', password: 'caissier123', full_name: 'Caissier', role: 'cashier' },
];

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user) return user;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureDemoUser({ email, password, full_name, role }) {
  let user = await findUserByEmail(email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
      app_metadata: { role },
    });
    if (error) throw new Error(`createUser(${email}): ${error.message}`);
    user = data.user;
    console.log(`✓ Utilisateur créé : ${email}`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { full_name, role },
      app_metadata: { role },
    });
    if (error) throw new Error(`updateUser(${email}): ${error.message}`);
    console.log(`✓ Utilisateur existant mis à jour : ${email}`);
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    { id: user.id, email, full_name, role },
    { onConflict: 'id' }
  );
  if (profileError) throw new Error(`profiles(${email}): ${profileError.message}`);
  console.log(`✓ Profil OK : ${email} (${role})`);
}

console.log('Configuration des comptes de démo...\n');

for (const demoUser of demoUsers) {
  await ensureDemoUser(demoUser);
}

console.log('\nTerminé. Vous pouvez vous connecter avec les comptes de démo.');
