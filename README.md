# FinFort 2.0

Personal and household finance management — a Progressive Web App (PWA) built with React 18, TypeScript, Vite, Tailwind CSS v3, Supabase, and Zustand.

---

## Quick Start

### 1. Create a Supabase project

1. Go to [https://app.supabase.com](https://app.supabase.com) and create a new project.
2. In the **SQL Editor**, run the migrations in order:
   - `supabase/migrations/001_core_schema.sql`
   - `supabase/migrations/002_triggers.sql`
   - `supabase/migrations/003_system_categories.sql`

   > Copy-paste each file's content into the SQL Editor and click **Run**.

3. In **Authentication → Providers**, ensure **Email** is enabled.
4. (Optional) Enable **Google** and **Apple** OAuth providers and enter your credentials.
5. In **Database → Extensions**, enable:
   - `uuid-ossp` (required)
   - `pg_cron` (optional, for future scheduled tasks)

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values from **Supabase → Settings → API**:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ Never commit `.env.local` to version control. It is gitignored.

### 3. Install dependencies

Requires **Node.js 20.x LTS** and **npm**.

```bash
npm install
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + CSS custom properties |
| State management | Zustand + TanStack Query |
| Backend / Database | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | vite-plugin-pwa + Workbox |
| Forms | React Hook Form + Zod |
| i18n | react-i18next (PL + EN) |

---

## Project Structure

```
src/
├── components/
│   ├── layout/        # BottomNav, TopHeader, PageLayout
│   └── ui/            # Toast, Button, Card, etc.
├── hooks/             # Custom React Query hooks (added per phase)
├── i18n/              # pl.json, en.json translation files
├── lib/               # supabase.ts, queryClient.ts, currencies.ts
├── pages/             # Route pages (lazy-loaded)
│   ├── auth/          # Login, Register, Callback
│   └── settings/      # Settings sub-pages
├── store/             # Zustand stores (auth, ui, household)
├── types/             # TypeScript interfaces + Supabase Database type
└── utils/             # formatCurrency, formatDate, calculations
supabase/
└── migrations/        # SQL migration files (run in Supabase SQL Editor)
```

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. The PWA service worker and manifest are auto-generated.

## Deploy to Vercel

1. Push to GitHub.
2. Import in [Vercel](https://vercel.com).
3. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Create `vercel.json` for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Implementation Phases

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Complete | Scaffold, auth, routing, stores, i18n |
| 2 | ⏳ Next | Onboarding wizard (7 steps) |
| 3 | — | Wallets + Transactions (core) |
| 4 | — | Savings & Budget Envelopes |
| 5 | — | Investment Portfolios |
| 6 | — | Dashboard (complete) |
| 7 | — | Analytics |
| 8 | — | Category Manager + CSV Import |
| 9 | — | Household Management + Recurring |
| 10 | — | Live Exchange Rates |
| 11 | — | Polish, PWA, Deployment |

---

## Language Support

- 🇵🇱 Polski (default)
- 🇬🇧 English

Language can be switched in the onboarding wizard and in Settings → Profile.
