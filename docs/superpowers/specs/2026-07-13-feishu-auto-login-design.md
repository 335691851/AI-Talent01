# Feishu Automatic Login Design

## Goal

Automatically start Feishu OAuth when the login page is opened inside Feishu, without showing a manual Feishu login control.

## Behavior

- Detect Feishu, Lark, and LarkClient user agents.
- Redirect on the server before rendering the login page when Feishu SSO is configured.
- Keep the existing client-side detector as a fallback for embedded browser differences.
- Do not auto-redirect when `feishu_error` is present, preventing an OAuth error loop.
- Show only account/password login in ordinary browsers and after an OAuth error.

## Verification

- Unit-test user-agent detection.
- Run all Vitest tests.
- Run the Next.js production build.

