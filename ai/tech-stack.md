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
| **Job Queue** | Bull / Redis or Temporal | Payroll runs, scheduled reconciliation, compliance report generation |
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
| **Payroll** | Gusto API / ADP / Paychex | Auto-export payroll runs (G2 goal) |
| **POS** | Square, Toast, or custom | F&B revenue & inventory sync |
| **Accounting** | QuickBooks API, Xero API | GL auto-posting, AP/AR reconciliation |
| **Banking** | Plaid or direct APIs | Transaction ingestion for daily flash reports |
| **Communication** | Twilio (SMS/WhatsApp) | Task notifications, guest confirmations |

## DevOps & Deployment

| Component | Recommendation | Notes |
|---|---|---|
| **Hosting** | Vercel (Next.js) + Render/Railway (API) | Serverless for web, containerized for workers |
| **Database** | Supabase or AWS RDS | Managed, auto-backups, point-in-time recovery |
| **Monitoring** | Sentry + Datadog | Error tracking, performance, audit trail alerts |
| **CI/CD** | GitHub Actions | Native to repo, deploy on PR merge |
| **Secrets** | GitHub Secrets / HashiCorp Vault | Secure API keys, multi-property isolation |

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