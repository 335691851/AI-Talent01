# GitHub Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clear GitHub homepage and a maintainable technical documentation set for AI Talent.

**Architecture:** `README.md` is the product-facing entry point. Detailed architecture, setup/deployment, and security information lives in focused files under `docs/`, with links to the existing testing plan and reports.

**Tech Stack:** GitHub Markdown, Mermaid, Next.js, Supabase Postgres/pgvector, Vercel AI SDK, DeepSeek, Cloudflare Workers AI, Vercel

## Global Constraints

- Do not expose the production URL, login credentials, API keys, or real employee data.
- Document only behavior verified in source code and migrations.
- Use repository-relative links for screenshots and documents.
- Keep testing detail in existing test documents and link to them.

---

### Task 1: Repository homepage

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: screenshots under `docs/test-report-assets/`
- Produces: product overview and navigation to detailed documents

- [ ] Write the project positioning, role model, and capability matrix.
- [ ] Add four test-data screenshots with descriptive alt text.
- [ ] Add a compact Mermaid architecture diagram.
- [ ] Add technology stack, quick start, test commands, and document index.

### Task 2: Architecture reference

**Files:**
- Create: `docs/architecture.md`

**Interfaces:**
- Consumes: `src/lib/ai/*`, `src/lib/db/*`, assessment routes, and Supabase migrations
- Produces: detailed architecture and data-flow reference

- [ ] Document application layers and deployment boundaries.
- [ ] Add AI assessment and hybrid search sequence diagrams.
- [ ] Add embedding chunking, pgvector retrieval, trace, and fallback behavior.
- [ ] Add a Mermaid entity relationship diagram matching migrations.

### Task 3: Setup and deployment reference

**Files:**
- Create: `docs/setup-and-deployment.md`

**Interfaces:**
- Consumes: `.env.example`, `package.json`, setup scripts, and Vercel/Supabase configuration
- Produces: local and production operating guide

- [ ] Document prerequisites and all environment variables by service.
- [ ] Document installation, database setup, embedding backfill, and local startup.
- [ ] Document Vercel environment scope and deployment sequence.
- [ ] Add troubleshooting for database, AI, embedding, and Feishu configuration.

### Task 4: Security and authentication reference

**Files:**
- Create: `docs/security-and-auth.md`

**Interfaces:**
- Consumes: session/auth code, Feishu routes, RLS migrations, and authorization checks
- Produces: security model and production hardening checklist

- [ ] Document admin and employee permissions.
- [ ] Document session cookies, server-side access, RLS posture, and assessment privacy.
- [ ] Document Feishu OAuth state validation and phone matching.
- [ ] Add a production hardening checklist without exposing credentials.

### Task 5: Documentation verification

**Files:**
- Verify: `README.md`, `docs/architecture.md`, `docs/setup-and-deployment.md`, `docs/security-and-auth.md`

**Interfaces:**
- Produces: verified repository documentation

- [ ] Scan Markdown for unresolved local links and image paths.
- [ ] Scan deliverables for known secrets and prohibited production URLs.
- [ ] Validate Mermaid fences and environment variable names.
- [ ] Run `npm.cmd run lint` and `npm.cmd test` to ensure documentation work did not disturb the application.

