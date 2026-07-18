# Penny Pilot

Penny Pilot is a personal finance operating system for tracking income, expenses, investments, and spending limits across multiple accounts and payment methods. It adds structured insight on top of the raw numbers so the app can answer not just "what happened" but "does it matter?"

## Snapshot

| Area             | Summary                                                      |
|------------------|--------------------------------------------------------------|
| Product          | Personal finance dashboard with auth, budgets, limits, and insight |
| Frontend         | React 19, Vite, Tailwind CSS, React Router, Framer Motion, Recharts |
| Backend          | Node.js, Express 5, Prisma ORM, PostgreSQL, JWT, bcrypt      |
| External services| Google OAuth, Groq, Financial Modeling Prep, AMFI India      |
| Core idea        | Model money as accounts and payment methods                  |

## The Problem

Most budgeting tools flatten finance into a transaction list. That works for simple expense tracking, but it breaks down when money flows through:

- salary accounts
- UPI wallets
- credit cards
- investment accounts
- shared or split expenses

That flattening hides relationships between accounts, payment methods, and time-based behavior. The result is a dashboard that can count money but cannot explain it.

Penny Pilot is built around a different assumption:

| Traditional budgeting app | Penny Pilot                          |
|---------------------------|--------------------------------------|
| Flat transaction list     | Account-centric model                |
| Generic summaries         | Per-account and per-method analysis  |
| Passive reporting         | Limit enforcement and anomaly signals|
| Freeform AI narration     | Data-constrained insight generation  |

## What It Does

| Capability         | What it provides                                      |
|-------------------|--------------------------------------------------------|
| Income tracking   | Salary and non-salary inflows with account scoping     |
| Expense tracking  | Category-aware spending with payment-method context    |
| Investment tracking | Ledger-based holdings and market-linked analysis    |
| Limit enforcement | Guardrails for daily, weekly, and monthly spend limits |
| Auth              | Email/password plus Google OAuth                       |
| Insight layer     | Risk, concentration, and behavior summaries           |

## Architecture

![Architecture diagram](docs/diagrams/architecture.svg)

### System Layers

| Layer       | Role                                           |
|-------------|------------------------------------------------|
| Client      | React UI, auth state, route protection, API calls |
| Middleware  | Auth checks and expense limit enforcement      |
| Controllers | Request routing for each resource domain       |
| Services    | Business rules and integrations                |
| Database    | PostgreSQL via Prisma                          |
| External APIs | Google OAuth, Groq, FMP, AMFI                |

### Request Flow

![Request lifecycle diagram](docs/diagrams/request-lifecycle.svg)

Every mutating request goes through the same path:

1. Client sends a request.
2. Middleware validates auth and business rules.
3. Controller delegates to the relevant service.
4. Service performs the actual read/write work.
5. Errors are normalized through a centralized handler.

This keeps policy checks in one place instead of duplicating them across endpoints.

## Data Model

![Data model diagram](docs/diagrams/data-model.svg)

The schema is organized around `User` as the owner and `Account` as the center of day-to-day money movement. Income, expenses, and investments are all connected through account and payment-method context.

| Core entity | Why it matters                                  |
|-------------|--------------------------------------------------|
| User        | Owning identity for all finance data             |
| Account     | Primary grouping for balances and transactions   |
| Category    | Classification for income and expense flows      |
| Investment  | Asset-level record for deposits and exposure     |
| Instrument  | Normalized security or fund metadata             |
| Session     | Refresh-token rotation and login persistence     |

The schema also covers:

- loans and EMIs
- split expenses
- insurance
- tax records
- goals and contributions
- balances and session history

## Authentication

![Auth rotation diagram](docs/diagrams/auth-rotation.svg)

### Auth Model

| Piece         | Behavior                                      |
|---------------|-----------------------------------------------|
| Access token  | Short-lived, used for API requests            |
| Refresh token | Long-lived, hashed at rest, rotated on use    |
| Session       | Stored in PostgreSQL and invalidated on reuse |
| Google sign-in| ID token verification against the client ID   |

### Why the rotation matters

If a refresh token is reused, the whole session family for that user is revoked. That makes token theft materially harder to exploit.

## Trade-offs

| Trade-off               | Benefit                      | Cost                              |
|-------------------------|------------------------------|-----------------------------------|
| Account-centric model   | Better insight and filtering | More complex schema and queries   |
| Refresh-token rotation  | Stronger security posture    | More session bookkeeping          |
| Centralized middleware  | Consistent policy checks     | More shared infrastructure        |
| External market data    | Live and normalized data     | Dependency on third-party APIs    |
| Data-constrained prompts| Lower hallucination risk     | Less freeform narration           |
| Prisma migrations       | Repeatable schema evolution  | Operational discipline in deploys |

## Metrics

### Repository Metrics

| Metric             | Value |
|--------------------|-------|
| Prisma models      | 24    |
| Resource domains   | 14    |
| Database migrations| 9     |
| Rendered diagrams  | 4     |

### Product Metrics to Watch

| Metric                         | What it tells you                     |
|--------------------------------|----------------------------------------|
| Login success rate             | Whether auth and OAuth are stable      |
| Refresh failure rate           | Whether sessions are rotating cleanly  |
| Expense-limit violations blocked | Whether guardrails are working       |
| Dashboard request latency      | Whether aggregation is staying fast    |
| Market-data refresh success    | Whether external feeds are healthy     |
| Insight generation success     | Whether LLM and upstream data are available |

## Repository Layout

| Path                 | Purpose                                                |
|----------------------|--------------------------------------------------------|
| `client/`            | React frontend                                         |
| `client/src/pages/`  | Route-level screens for dashboard and finance modules  |
| `client/src/components/` | Shared UI and feature components                  |
| `client/src/context/` | Auth and theme state                                   |
| `client/src/api/`    | Axios client and refresh logic                         |
| `server/`            | Express backend                                        |
| `server/src/controllers/` | Resource endpoints                               |
| `server/src/services/` | Business logic and integrations                      |
| `server/src/middleware/` | Auth, limits, and error handling                   |
| `server/prisma/`     | Schema and migrations                                  |
| `docs/diagrams/`     | Mermaid sources and rendered diagrams                  |

## Deployment Notes

| Area               | Note                                                     |
|--------------------|----------------------------------------------------------|
| Backend runtime    | Express app serving the API under `/api`                 |
| Database           | PostgreSQL managed through Prisma migrations             |
| Frontend deployment| Static Render service                                    |
| OAuth              | Google client ID must match between frontend and backend |
| Hosting behavior   | Production routing uses a hash-based client router       |

## Visual Summary

| Question                              | Diagram |
|---------------------------------------|---|
| How does a request move through the system? | [Request lifecycle](docs/diagrams/request-lifecycle.svg) |
| How is auth kept secure?              | [Auth rotation](docs/diagrams/auth-rotation.svg) |
| How are entities connected?           | [Data model](docs/diagrams/data-model.svg) |
| What is the overall system shape?     | [Architecture](docs/diagrams/architecture.svg) |

## Design Principles

| Principle              | Implementation                                 |
|------------------------|------------------------------------------------|
| Clarity over noise     | Finance data is grouped by account, method, and period |
| Safety over convenience| Sessions rotate and reuse is detected          |
| Insight over reporting | Dashboards compute meaning, not just totals    |
| Integration over duplication | External APIs are normalized into shared shapes |
| Maintainability over shortcuts | Business rules live in services and middleware |

## Diagram Sources

The rendered diagrams in `docs/diagrams/*.svg` are generated from the Mermaid sources in the same folder. Update the `.mmd` source and regenerate the SVGs when the architecture changes.
