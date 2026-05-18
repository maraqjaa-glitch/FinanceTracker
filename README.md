# FinFort 2.0

Personal and household finance management — a Progressive Web App (PWA) built with React 18, TypeScript, Vite, Tailwind CSS v3, Supabase, and Zustand.

---

## Quick Start

### 1. Create a Supabase project

1. Go to [https://app.supabase.com](https://app.supabase.com) and create a new project.
2. In the **SQL Editor**, run the migrations **in order**:
   - `supabase/migrations/001_core_schema.sql`
   - `supabase/migrations/002_triggers.sql`
   - `supabase/migrations/003_system_categories.sql`
3. In **Authentication → Providers**, ensure **Email** is enabled.
4. *(Optional)* Enable **Google** and **Apple** OAuth providers.
5. In **Database → Extensions**, enable `uuid-ossp`.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ Never commit `.env.local`.

### 3. Install & run

```bash
npm install
npm run dev        # http://localhost:5173
```

---

## Deploy to Vercel

1. Push to GitHub (the `phase-1-scaffold` branch or main).
2. Import at [vercel.com](https://vercel.com/new).
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — the included `vercel.json` handles SPA routing automatically.

## Deploy to Netlify

1. Connect your GitHub repo.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add a `_redirects` file inside `public/`:

```
/* /index.html 200
```

5. Set the same two env vars in Netlify's dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + CSS custom properties |
| State | Zustand + TanStack Query v5 |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | vite-plugin-pwa + Workbox |
| Forms | React Hook Form + Zod |
| i18n | react-i18next (PL + EN) |
| CSV | PapaParse |
| Dates | date-fns |

---

## Feature Phases Completed

| Phase | Feature |
|---|---|
| 1 | Scaffold, auth, routing, stores, PWA |
| 2 | Onboarding wizard (7 steps) |
| 3 | Wallets + Transactions CRUD |
| 4 | Savings & Budget Envelopes |
| 5 | Investment Portfolios + Valuations |
| 6 | Dashboard (complete, with charts) |
| 7 | Analytics (5 tabs, YoY, net worth) |
| 8 | Category Manager + CSV Import |
| 9 | Household Management + Recurring Transactions |
| 10 | Live Exchange Rates + Currency Converter |
| 11 | PWA polish, code splitting, error boundaries |

---

## Project Structure

```
src/
├── components/
│   ├── envelopes/     # Savings & budget envelope cards + forms
│   ├── layout/        # BottomNav, TopHeader, PageLayout, FAB
│   ├── onboarding/    # 7-step wizard
│   ├── portfolios/    # Portfolio cards + valuation modal
│   ├── transactions/  # TransactionCard, form modal, filters
│   ├── ui/            # Toast, Modal, Skeleton, ErrorBoundary, etc.
│   └── wallets/       # WalletCard + form modal
├── hooks/             # React Query hooks for every data type
├── i18n/              # pl.json + en.json translations
├── lib/               # supabase.ts, queryClient.ts, currencies.ts
├── pages/             # Route pages (lazy-loaded)
│   ├── auth/          # Login, Register, Callback
│   └── settings/      # Profile, Household, Categories, Import, Currencies, Recurring
├── store/             # Zustand: authStore, uiStore, householdStore
├── types/             # TypeScript interfaces + Supabase Database type
└── utils/             # formatCurrency, formatDate, calculations, csvParser
supabase/migrations/   # SQL migration files
vercel.json            # Vercel SPA rewrite
```

---

## PWA

The app is fully installable on iOS and Android:
- Run `npm run build` then serve `dist/` to test locally
- Check the Lighthouse PWA audit for a full checklist
- The service worker (Workbox) caches exchange rates for 4 hours offline

---

## License

MIT
