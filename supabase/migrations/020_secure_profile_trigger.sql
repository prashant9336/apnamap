-- =====================================================================
-- 020_secure_profile_trigger.sql
-- Fixes privilege escalation via Supabase auth signup API.
--
-- ROOT CAUSE: handle_new_user() read raw_user_meta_data->>'role' to set
-- profiles.role. Since the Supabase anon key is public and anyone can
-- call POST /auth/v1/signup with {"data": {"role": "admin"}}, an attacker
-- could create an admin account without going through our onboarding flow.
--
-- FIX: Always insert 'customer' as the role. Role elevation is done
-- server-side only (admin client upserts in register/onboard-vendor routes).
-- ON CONFLICT DO NOTHING handles the case where our server-side code
-- already inserted the profile before the trigger fires.
--
-- Safe to run multiple times — CREATE OR REPLACE is idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'customer'   -- ALWAYS customer — role is elevated by server-side code only,
                 -- never by user-supplied metadata
  )
  ON CONFLICT (id) DO NOTHING;  -- Skip if server-side upsert already ran first
  RETURN NEW;
END;
$$;

-- Confirm trigger still exists (re-attaches after function replacement)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
