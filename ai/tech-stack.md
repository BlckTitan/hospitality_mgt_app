# Technology Stack - Hospitality Management Suite

Based on PRD, ERD, and current setup, here's the recommended tech stack.

## Backend & Infrastructure

| Layer | Recommendation | Rationale |
|-------|---|---|
| **Runtime** | Node.js + TypeScript | Type-safe, matches your Next.js frontend |
| **Framework** | Next.js API Routes + tRPC | Serverless-ready, tight frontend-backend integration, end-to-end type safety |
| **Database** | PostgreSQL + Prisma ORM | Relational data (rooms, reservations, GL), ACID compliance for financial data, strong audit trail support |
| **Real-time** | Convex (already in package.json) | Reactive dashboards, live P&L updates, < 2min latency requirement |
| **Authentication** | Clerk (already integrated) | RBAC built-in, SSO-ready, audit logs included |
| **File Storage** | AWS S3 / Cloudinary | Document management (invoices, receipts, delivery notes per PRD scope) |
| **Job Queue** | Bull / Redis or Temporal | Payroll, scheduled reconciliation, compliance report generation |
| **Search** | Elasticsearch or Typesense | Guest/transaction search, audit log queries |

## Frontend Stack

| Layer | Recommendation | Notes |
|-------|---|---|
| **Framework** | Next.js 15+ (current) | Excellent for full-stack, server components for financial dashboards |
| **UI Components** | shadcn/ui + Tailwind (current) | Already using Tailwind; shadcn adds polished components |
| **Forms** | React Hook Form + Zod | Type-safe validation, better than Yup for complex billing forms |
| **State Management** | Zustand (already included) | Lightweight, perfect for role-based views and filters |
| **Charts/Dashboards** | Chart.js + React-ChartJS2 (current) | Adequate; consider Recharts for better React integration |
| **Tables** | TanStack Table (React Table) | Essential for large datasets (transactions, audit logs, payroll) |
| **Date Picker** | React DatePicker (current) | Works; consider react-day-picker for range selections (stay dates) |
| **Notifications** | Sonner (already included) | Good for form feedback; add email/SMS via Twilio for PMS/payroll alerts |

## Data & Analytics

| Layer | Recommendation | Rationale |
|-------|---|---|
| **Data Warehouse** | Supabase (or managed Postgres) | Simplify ops, built-in RLS for tenant isolation |
| **Analytics Engine** | Apache Superset or Metabase | Self-hosted dashboards, drill-down P&L reports |
| **Audit Logging** | Prisma middleware + dedicated log table | Immutable records for SOC 2 (G4 goal) |
| **Financial Reporting** | Custom GL engine + scheduled exports | QuickBooks/Xero API integrations for AP/AR |

## Integrations (Per PRD)

| Integration | Service | Purpose |
|---|---|---|
| **PMS** | Webhook listeners (custom) | Sync reservations bidirectionally |
| **Payroll** | Native calculate + country-pack statutory components + generic CSV / bank file export | Jurisdiction follows `Property.country` at setup. Processor APIs (Gusto, ADP, Paychex) remain out of scope. See `ai/payroll-implementation.md`. |
| **POS** | Square, Toast, or custom | Beverages / Restaurant revenue & inventory sync |
| **Accounting** | QuickBooks API, Xero API | GL auto-posting, AP/AR reconciliation |
| **Banking** | Plaid or direct APIs | Transaction ingestion for daily flash reports |
| **Communication** | Twilio (SMS/WhatsApp) | Task notifications, guest confirmations |

## DevOps & Deployment

The running app is Next.js on Netlify, Convex for data, jobs, and file storage, Clerk for auth, and Cloudinary for images. `netlify.toml` and `.env.example` match this setup. Variable names live in `.env.example`; values stay in the dashboards.

| Component | Production | Notes |
|---|---|---|
| **Hosting** | Netlify + `@netlify/plugin-nextjs` | Node 22. Production build runs `npx convex deploy --cmd "pnpm run build"`. Deploy previews and branch deploys run `pnpm run build` only. |
| **Backend** | Convex production deployment | Separate from `npx convex dev`. Crons ship with the functions and run in UTC. Production starts empty. |
| **Auth** | Clerk production instance | `pk_live_` / `sk_live_`. JWT template name `convex`, application ID `convex`. |
| **Images** | Cloudinary | Signed uploads via `/api/cloudinary/sign`. Production folder from `CLOUDINARY_UPLOAD_FOLDER` (for example `hospitality-prod`). |
| **Documents** | Convex `_storage` | Bill PDFs, staff documents, and payment receipts. Files stay on the deployment that received the upload. |
| **CI/CD** | Netlify Git deploys | The production branch is the only context that runs `convex deploy`. |
| **Secrets** | Netlify Production context and Convex env | See `.env.example`. |
| **Monitoring** | Convex logs, Netlify deploy logs, Clerk logs | Sentry can be added after the site is serving traffic. |

### Production dashboard checklist

#### Convex

1. Create a production deployment, separate from the dev deployment used by `npx convex dev`.
2. Set these on the Convex deployment (`npx convex env set --prod` or the dashboard). Convex functions do not read Netlify env vars.
   - `NEXT_PUBLIC_CLERK_JWT_ISSUER_DOMAIN` — Clerk Frontend API URL. `convex/auth.config.ts` reads this name.
   - `CLERK_WEBHOOK_SECRET` — Svix signing secret for the Clerk webhook. `convex/http.ts` verifies signatures with it.
3. Generate a production deploy key. Store it only as Netlify `CONVEX_DEPLOY_KEY` (build-only, Production context).
4. Leave cron schedules as deployed. They run in UTC: invite expiry at 00:00, bar rollups at 01:00–04:00, preventive maintenance and bill periods at 06:00 (07:00 West Africa Time). Property setup seeds payroll settings and system roles.

#### Clerk

1. Use the Clerk production instance. Development keys are for local use.
2. Allow the Netlify production origin, including `/sign-in` and `/sign-up`. After a custom domain is attached, allow that host too.
3. Keep the Convex JWT template name `convex` and application ID `convex`, matching `convex/auth.config.ts`.
4. Add a webhook endpoint at `https://<prod-deployment>.convex.site/clerk-users-webhook`.
5. Subscribe to `user.created`, `user.updated`, `user.deleted`, and `session.created`.
6. Set `NEXT_PUBLIC_APP_URL` to the public https origin with no trailing slash. Invitation emails redirect to `${NEXT_PUBLIC_APP_URL}/sign-up` (`app/api/admin/invite/route.ts`). Allow-list that URL.

#### Netlify

Production context variables are listed in `.env.example`.

- Build-only: `CONVEX_DEPLOY_KEY`.
- Inlined at build time: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. The production build also receives `NEXT_PUBLIC_CONVEX_URL` from `npx convex deploy`.
- Runtime for Functions and Edge (`proxy.ts` calls Clerk; `/api/cloudinary/sign` signs uploads): `CLERK_SECRET_KEY`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`.

Keep `CONVEX_DEPLOY_KEY` and the live Clerk secret on the Production context. Leave deploy previews off until a separate staging Convex deployment exists. A preview that runs `convex deploy` would overwrite production functions. `netlify.toml` already points preview and branch builds at `pnpm run build` only.

HSTS is set in `netlify.toml`. `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Content-Security-Policy` stay in `next.config.ts`. The CSP allows the Clerk Frontend API host decoded from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time (`clerk.<your-domain>` for a live key). Without it, the browser blocks Clerk JS and sign-in fails with `failed_to_load_clerk_js`. After changing the Clerk key, redeploy.

When a custom domain is attached in Netlify, update Clerk allowed origins and `NEXT_PUBLIC_APP_URL` to that host, then redeploy.

#### Cloudinary

Use the existing Cloudinary account with a production upload folder (`hospitality-prod` or similar) via `CLOUDINARY_UPLOAD_FOLDER`. The API secret stays on the server. `next.config.ts` already allows `res.cloudinary.com` for `next/image`.

#### Launch checks

- Open the public URL, sign up, and finish `/setup/property`.
- Confirm the Clerk webhook returns 200 in the Convex logs and a user row exists.
- Invite a second user and accept at `/sign-up`.
- Upload one image (Cloudinary) and one bill PDF (Convex storage).
- Confirm a signed-out visit to an admin page redirects to `/sign-in`.

## Suggested Architecture Diagram

```
┌─────────────────┐
│   Next.js SPA   │ (React 19, Zustand, shadcn/ui)
└────────┬────────┘
         │
    ┌────▼─────────────────┐
    │  tRPC / API Routes   │ (Type-safe, RBAC middleware)
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  Prisma + PostgreSQL  │ (Audit logs, GL, multi-tenant)
    │  Convex (Real-time)   │
    └──────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  Bull Queue / Redis       │ (Payroll, reports, sync)
    │  Webhooks (PMS/POS)       │
    └───────────────────────────┘
```

## Key Recommendations for Your Goals

- **G1 (< 2min latency)**: Use Convex for real-time GL syncs, cache dashboards with Redis.
- **G2 (60% auto-GL)**: Build rule engine on tRPC, map transactions → GL codes via Prisma models.
- **G3 (90% task SLA)**: Task queue + notifications (Sonner + Twilio).
- **G4 (SOC 2)**: Immutable audit table, Sentry monitoring, encrypted backups.
- **G5 (5-day onboarding)**: Clerk + guided setup wizard, Convex for instant sync tests.

## Next Steps

1. Scaffold Prisma schema based on ERD
2. Set up tRPC routers for core domains (rooms, guests, GL, payroll)
3. Implement Clerk RBAC middleware
4. Build real-time dashboard with Convex queries
5. Add Bull job queue for async operations