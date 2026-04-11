-- =====================================================
-- 016_normalize_vendor_mobile.sql
-- Normalise vendors.mobile to canonical +91XXXXXXXXXX format.
--
-- Background:
--   migration 010 stripped the +91 prefix from all rows so mobile was stored
--   as raw 10 digits and a UNIQUE constraint was added on that value.
--   All new code (register, activate, onboard-vendor) now stores mobile
--   as "+91XXXXXXXXXX", making the UNIQUE constraint and duplicate-detection
--   checks inconsistent across old and new rows.
--
-- This migration re-adds the +91 prefix to all remaining raw-digit rows.
-- After this runs, every row in vendors.mobile is "+91XXXXXXXXXX" and the
-- UNIQUE constraint works correctly for both old and new accounts.
--
-- Safe to re-run: the NOT LIKE '+91%' guard skips already-normalised rows.
-- =====================================================

UPDATE vendors
SET    mobile = '+91' || mobile
WHERE  mobile IS NOT NULL
  AND  mobile NOT LIKE '+91%'
  AND  LENGTH(mobile) = 10
  AND  mobile ~ '^[0-9]{10}$';

-- Verify the migration didn't produce duplicates before the UNIQUE constraint
-- would surface them at insert time.
-- (No-op check — if this SELECT returns > 0 rows, there are conflicting accounts
--  that need manual resolution before the constraint can be enforced cleanly.)
-- SELECT mobile, COUNT(*) FROM vendors GROUP BY mobile HAVING COUNT(*) > 1;
