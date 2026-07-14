# GitHub Documentation Design

## Goal

Create a product-oriented GitHub repository homepage supported by focused technical documents for architecture, setup and deployment, and security and authentication.

## Audience

- Enterprise stakeholders evaluating the product workflow.
- Developers running or extending the application.
- Operators deploying and securing the production stack.

## Deliverables

- `README.md`: concise product overview, screenshots, architecture summary, quick start, technology stack, and documentation index.
- `docs/architecture.md`: system boundaries, AI assessment flow, hybrid talent search, embeddings, data model, and traceability.
- `docs/setup-and-deployment.md`: prerequisites, environment variables, database initialization, embedding backfill, local operation, Vercel deployment, and troubleshooting.
- `docs/security-and-auth.md`: roles, session model, server-side database access, RLS posture, assessment privacy, Feishu SSO, and operational hardening.

## Visuals

- Reuse test-data screenshots from `docs/test-report-assets/`.
- Use GitHub-native Mermaid diagrams for architecture and request flows.
- Do not publish the production URL, credentials, secrets, or real employee data.

## Quality Bar

- Every command and environment variable must match the repository.
- Links and image references must resolve from the repository root.
- The README must remain scannable and defer deep detail to `docs/`.
- Existing test plans and reports remain canonical and are linked instead of duplicated.

