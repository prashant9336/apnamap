# ApnaMap — Complete Setup Guide
# Read every step carefully. You can do this!

═══════════════════════════════════════════════════════
## PART A: INSTALL TOOLS ON YOUR COMPUTER (do once)
═══════════════════════════════════════════════════════

### 1. Install Node.js
- Go to: https://nodejs.org
- Click the big green "LTS" button to download
- Run the installer, click Next → Next → Finish
- To verify: open Terminal (Mac) or Command Prompt (Windows)
  type: node --version
  you should see something like: v20.x.x ✅

### 2. Install VS Code (code editor)
- Go to: https://code.visualstudio.com
- Download and install it
- This is where you'll manage your project files

═══════════════════════════════════════════════════════
## PART B: SUPABASE SETUP (your database)
═══════════════════════════════════════════════════════

### 1. Create Supabase Account
- Go to: https://supabase.com
- Click "Start your project" → sign up with GitHub or email

### 2. Create New Project
- Click "New project"
- Name: apnamap-production
- Database Password: create a strong password (SAVE IT)
- Region: Southeast Asia (Singapore) — closest to India
- Click "Create new project" → wait 2 minutes

### 3. Get Your Keys
- In your project: go to Settings (gear icon) → API
- Copy and save these THREE values:
  ✓ Project URL (looks like: https://xxxx.supabase.co)
  ✓ anon public key (long text starting with "eyJ...")
  ✓ service_role key (another long "eyJ..." — keep this PRIVATE)

### 4. Run the Database Schema
- In Supabase: go to SQL Editor (left sidebar)
- Click "New query"
- Open the file: supabase/migrations/001_schema.sql
- Copy ALL its content → paste into SQL Editor → click Run
- You should see: "Success. No rows returned"

### 5. Add Seed Data
- New query again
- Open: supabase/seed/prayagraj.sql
- Copy ALL → paste → Run
- This adds Prayagraj localities, categories, and sample shops

### 6. Create Storage Buckets
- Go to Storage (left sidebar) → New bucket
- Name: shop-images → check "Public bucket" → Create
- Repeat for: offer-images (also public)

### 7. Enable Email Auth
- Go to Authentication → Providers
- Email: toggle ON
- Save

═══════════════════════════════════════════════════════
## PART C: PROJECT SETUP ON YOUR COMPUTER
═══════════════════════════════════════════════════════

### 1. Open the project
- Open VS Code
- File → Open Folder → select the apnamap folder

### 2. Create .env.local file
- In VS Code, right-click on the file list → New File
- Name it exactly: .env.local
- Paste this content and fill in YOUR values:

  NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  NEXT_PUBLIC_DEFAULT_CITY=prayagraj
  NEXT_PUBLIC_DEFAULT_LAT=25.4358
  NEXT_PUBLIC_DEFAULT_LNG=81.8463

### 3. Install dependencies
- In VS Code: Terminal → New Terminal
- Type and press Enter:
  npm install

- Wait 2-3 minutes. You'll see packages downloading.

### 4. Run the app locally
- Type:
  npm run dev

- Open browser: http://localhost:3000
- You should see the ApnaMap homepage! ✅

═══════════════════════════════════════════════════════
## PART D: MAKE YOURSELF ADMIN
═══════════════════════════════════════════════════════

1. Open http://localhost:3000/auth/signup
2. Create an account with your email
3. Go to Supabase → Table Editor → profiles
4. Find your row → click the role column → change to "admin"
5. Also go to SQL Editor and run:
   INSERT INTO vendors (id) SELECT id FROM profiles WHERE role = 'admin';
6. Now go to: http://localhost:3000/admin/dashboard ✅

═══════════════════════════════════════════════════════
## PART E: DEPLOY TO VERCEL (make it live on internet)
═══════════════════════════════════════════════════════

### 1. Create GitHub Account (free)
- Go to: https://github.com → Sign up

### 2. Push code to GitHub
- In VS Code Terminal, type each line:
  git init
  git add .
  git commit -m "Initial ApnaMap build"

- Create new repo on GitHub: github.com → New → name: apnamap → Create
- Copy the commands GitHub shows (starts with "git remote add...")
- Paste in VS Code Terminal → press Enter

### 3. Create Vercel Account
- Go to: https://vercel.com → Sign up with GitHub

### 4. Deploy
- Vercel → New Project → Import your apnamap GitHub repo
- Click Import
- BEFORE clicking Deploy: click "Environment Variables"
- Add each variable from your .env.local (same key-value pairs)
- Click Deploy → wait 2-3 minutes
- You get a URL like: apnamap.vercel.app ✅

═══════════════════════════════════════════════════════
## PART F: CONNECT GODADDY DOMAIN (apnamap.com)
═══════════════════════════════════════════════════════

### Step 1: Get Vercel DNS values
- Vercel → your project → Settings → Domains
- Click "Add" → type: apnamap.com → Add
- Vercel shows you DNS records to add

### Step 2: Update GoDaddy
1. Log in to GoDaddy
2. My Products → Domains → apnamap.com → DNS
3. Delete any existing A record for "@"
4. Click Add → Type: A Record
   - Name: @
   - Value: 76.76.21.21
   - TTL: 600 seconds
5. Click Add → Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com
   - TTL: 600 seconds
6. Save

### Step 3: Update Supabase Auth URLs
- Supabase → Authentication → URL Configuration
- Site URL: https://apnamap.com
- Redirect URLs: add https://apnamap.com/auth/callback

### Step 4: Update NEXT_PUBLIC_APP_URL in Vercel
- Vercel → Project → Settings → Environment Variables
- Find NEXT_PUBLIC_APP_URL → change to: https://apnamap.com
- Redeploy

### Step 5: Wait
- DNS changes take 10 minutes to 2 hours
- After that: https://apnamap.com is LIVE! ✅

═══════════════════════════════════════════════════════
## PART G: AFTER EACH PHASE — CHECKLIST
═══════════════════════════════════════════════════════

After completing setup, verify these work:

□ Homepage loads at apnamap.com
□ Walk View shows shops when GPS allowed
□ Sign up creates a profile in Supabase
□ Admin can approve shops at /admin/dashboard
□ Vendor can add shop at /vendor/onboarding
□ Offers page shows active offers
□ Search returns results

═══════════════════════════════════════════════════════
## COMMON ERRORS & FIXES
═══════════════════════════════════════════════════════

ERROR: "NEXT_PUBLIC_SUPABASE_URL is not defined"
FIX: Your .env.local file values are missing or wrong.
     Restart the dev server after changing .env.local: Ctrl+C → npm run dev

ERROR: "relation does not exist"
FIX: The SQL schema didn't run successfully.
     Go to Supabase SQL Editor and run 001_schema.sql again.

ERROR: "Failed to fetch" in browser
FIX: Make sure npm run dev is still running in Terminal.

ERROR: Shop not showing in walk view
FIX: Shop needs to be approved. Go to /admin/dashboard and approve it.

ERROR: GPS not working
FIX: On localhost, GPS only works over HTTPS or localhost.
     Use Chrome and allow location when prompted.

For any other error: the error message in your browser console
(press F12 → Console tab) will tell you exactly what's wrong.
