# Feishu Automatic Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically start Feishu OAuth in Feishu clients and remove the manual Feishu login entry.

**Architecture:** A shared pure function identifies Feishu user agents. The login Server Component performs the primary redirect using request headers, while the existing client component provides a silent fallback. OAuth errors disable both redirect paths.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest

## Global Constraints

- Ordinary browsers keep account/password login.
- OAuth errors must not enter a redirect loop.
- No Feishu login button is rendered.

---

### Task 1: User-agent detection

**Files:**
- Modify: `src/lib/auth/feishu.test.ts`
- Modify: `src/lib/auth/feishu.ts`

**Interfaces:**
- Produces: `isFeishuUserAgent(userAgent?: string | null): boolean`

- [ ] Add tests for Feishu, Lark, ordinary browser, and empty user agents.
- [ ] Run `npm.cmd test -- src/lib/auth/feishu.test.ts` and confirm the new test fails.
- [ ] Implement case-insensitive matching for `feishu`, `lark`, and `larkclient`.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Automatic redirect and login UI

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/feishu-auto-login.tsx`
- Modify: `src/components/login-form.tsx`

**Interfaces:**
- Consumes: `isFeishuUserAgent(userAgent?: string | null): boolean`

- [ ] Read `user-agent` through `await headers()` in the login Server Component.
- [ ] Redirect to `/api/auth/feishu/start?next=/` when configured, detected, and no `feishu_error` exists.
- [ ] Reuse the shared detector in the silent client fallback.
- [ ] Remove the visible Feishu button, configuration warning, and login-method separator.
- [ ] Preserve Feishu error messages and account/password login.

### Task 3: Verification

**Files:**
- Verify all modified files.

- [ ] Run `npm.cmd test` and require zero failures.
- [ ] Run `npm.cmd run build` and require a successful production build.
- [ ] Inspect `git diff` to confirm no unrelated files or secrets were changed.

