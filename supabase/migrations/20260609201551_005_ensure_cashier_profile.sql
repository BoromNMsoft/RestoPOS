-- Create cashier user directly via SQL (since admin API didn't fully create it)
-- We need to insert into auth.users with proper fields

-- First check if the cashier already has an auth entry
DO $$
BEGIN
  -- Try to create the cashier profile if the user exists
  -- The edge function reported "already_exists" so the user may exist but profile wasn't created
  NULL;
END $$;

-- Insert profile for cashier if user exists but profile missing
INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, 'Caissier', 'cashier'
FROM auth.users 
WHERE email = 'caissier@restopos.fr'
ON CONFLICT (id) DO NOTHING;
