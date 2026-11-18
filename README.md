# LedgerFlow — Supabase + React + Vite + PWA

## 1. Install Dependencies
```bash
npm install
```

## 2. Environment Variables
Create `.env` in the project root (see `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

## 3. Run Locally
```bash
npm run dev
```

## 4. Deploy to Vercel
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in **Vercel → Settings → Environment Variables**.
- Deploy via GitHub or `npx vercel`.
- Add your Vercel URL to **Supabase → Authentication → URL Configuration → Redirect URLs**.
