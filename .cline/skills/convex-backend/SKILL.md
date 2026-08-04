---
name: convex-backend
description: Implement, review, debug, and test Convex backend changes for Hive by TailorBee. Use when working in convex/, including schema, queries, mutations, actions, HTTP actions, webhooks, authentication, authorization, indexes, scheduled jobs, migrations, media, payments, logistics, and backend tests.
---

# Convex Backend

Build secure, typed, indexed, and operationally safe Convex backend features for the Hive platform.

## Repository context

- The repository root is `HivebyTailorBee/`.
- Convex source lives in `HivebyTailorBee/convex/`.
- The data model is defined in `convex/schema.ts`.
- Generated Convex code lives in `convex/_generated/`; never edit it manually.
- Shared backend helpers belong in `convex/lib/` or, when intentionally shared by multiple domains, `convex/shared/`.
- HTTP routes are registered in `convex/http.ts`; webhook handlers live in `convex/webhooks/`.
- Backend tests and audit scripts primarily live in `convex/tests/`.
- Shared cross-application types and utilities live under `packages/types/` and `packages/utils/`.
- The root package uses npm, Node 20+, TypeScript, Turbo, and Convex 1.x.

## Required workflow

1. Identify the backend domain and inspect the relevant module before editing.
2. Read the corresponding tables and indexes in `convex/schema.ts`.
3. Search for existing helpers, callers, generated API references, and tests.
4. Define authorization, ownership, state-transition, idempotency, and validation requirements.
5. Make the smallest coherent change that follows existing domain patterns.
6. Add or update focused tests for security-sensitive or stateful behavior.
7. Run targeted validation, then broader typecheck or tests when practical.
8. Report changed files, behavior, security considerations, and validation results.

Do not infer critical behavior from filenames alone. Inspect the implementation and its callers.

## Convex function selection

Choose the narrowest function type that supports the behavior:

- `query`: deterministic database reads; no writes or external side effects.
- `mutation`: transactional database writes and reads.
- `action`: external services, Node APIs, or non-transactional orchestration.
- `internalQuery`, `internalMutation`, `internalAction`: server-only implementation details, cron work, and trusted orchestration.
- `httpAction`: externally reachable HTTP endpoints and webhooks.

Keep external calls out of mutations. Use an action or HTTP action, then call internal queries or mutations through generated references when database access is needed.

Prefer private internal functions unless a function must be callable by a client. Treat every public Convex function and HTTP route as an API boundary.

## Function shape and validation

- Import function builders from `./_generated/server`.
- Validate all externally supplied arguments with `v` validators.
- Use `v.id("table")` for Convex IDs rather than accepting arbitrary strings when compatibility permits.
- Keep validators synchronized with `convex/schema.ts` and shared package types.
- Treat the caller payload, Convex `args`, write object, schema fields, and returned DTO as one end-to-end contract. When one changes, inspect and update every layer that consumes or persists it.
- Remember that Convex rejects undeclared arguments. Search all `useQuery`, `useMutation`, `useAction`, `fetchQuery`, `fetchMutation`, and generated `api.<module>.<function>` callers before changing a public function signature.
- Add explicit return validators when introducing or modernizing an API and doing so is compatible with existing callers.
- Return stable, minimal DTOs. Do not leak secrets, internal provider payloads, or unnecessary personal data.
- Use `ConvexError` and existing error definitions such as `convex/lib/errors.ts` for expected domain failures.
- Avoid `any`; when legacy code forces it, contain it at the boundary and convert to a typed representation immediately.

Example:

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    return await ctx.db.get(productId);
  },
});
```

Before adopting a new syntax across an existing file, preserve the local style unless the task explicitly includes modernization.

## Authentication and authorization

Authentication alone is never sufficient for protected operations.

- Reuse `convex/lib/auth.ts`; do not create ad hoc role checks.
- Resolve roles from the Convex `users` table, never from untrusted client arguments or JWT custom claims.
- Use `getAuthenticatedUser` for authenticated users.
- Use `requireRole` or `requireAnyRole` for role-gated behavior.
- Use `getMyBoutique` or `requireBoutiqueOwnership` for boutique-scoped access.
- Preserve Firebase-versus-Clerk issuer gating. Customers and privileged seller/admin identities have distinct trusted issuer boundaries.
- Check ownership and tenant scope on every read and write involving customer, boutique, order, payment, claim, address, or media data.
- Never accept a user ID, boutique ID, role, price, status, or entitlement from the client as proof of authority.
- Public catalog queries must expose only approved, active, and customer-safe records as required by the domain.

For actions that cannot access `ctx.db`, authenticate through the action-compatible helpers or call a protected internal function. Do not weaken authorization to work around context differences.

## Data model and indexes

- Treat `convex/schema.ts` as the source of truth.
- Add schema fields deliberately. Use `v.optional` only when absence is a valid lifecycle state or required for a safe rollout.
- Define bounded unions for domain states instead of unrestricted strings when compatibility allows.
- Keep role unions synchronized with `UserRole` in `convex/lib/auth.ts`.
- Add indexes for recurring equality/range access patterns before shipping a query that depends on them.
- Prefer `.withIndex(...)` and `.unique()`/`.first()`/`.take()`/pagination over filtering a full table in memory.
- Avoid unbounded `.collect()` on production-sized tables. If existing code does this, do not copy the pattern; add an index or paginate.
- Include deterministic tie-breakers when ordering affects pagination or business behavior.
- Use epoch milliseconds (`Date.now()`) consistently for timestamps used by the existing schema.

Schema changes may require staged rollout:

1. Add a compatible optional field or new table/index.
2. Deploy code that handles old and new records.
3. Backfill through an internal, paginated, resumable migration.
4. Tighten validation only after data is complete.

Never rewrite production data with an unbounded one-shot mutation.

## Mutations and domain invariants

- Keep each write transaction focused and deterministic.
- Read authoritative records inside the mutation before calculating prices, permissions, inventory, or state transitions.
- Enforce valid state transitions server-side; do not trust UI gating.
- Update related counters and denormalized fields atomically when they are part of the same invariant.
- Make retryable operations idempotent using a provider event ID, payment ID, order ID, request key, or dedicated processed-event record.
- Prevent overselling with transactionally checked inventory helpers such as those under `convex/lib/inventory.ts`.
- Store money using the repository's established representation and helpers in `convex/lib/money.ts`; never use floating-point shortcuts for settlement logic.
- Preserve auditability for admin, finance, compliance, payment, and logistics transitions.
- When inserting `auditLogs`, read its current schema first and populate all required actor and entity fields. Use the authenticated user as the actor unless the operation is genuinely system-initiated; never label a user-triggered mutation as `system` merely to bypass attribution.

For multi-step workflows, separate:

1. transactional state reservation,
2. external side effect,
3. transactional success/failure recording,
4. retry or compensation behavior.

## Actions and third-party integrations

- Keep provider-specific code in a focused client/helper under `convex/lib/`.
- Read secrets from Convex environment variables; never hardcode or log them.
- Set timeouts where supported and handle network, provider, parsing, and retry failures explicitly.
- Do not blindly retry non-idempotent provider operations.
- Persist only the provider fields needed for reconciliation and support.
- Sanitize logs: no auth tokens, webhook secrets, payment credentials, full sensitive payloads, or unnecessary PII.
- Use internal generated API references for action-to-database calls.
- Schedule asynchronous work only after durable state exists.

Relevant integrations include Razorpay, Porter/logistics providers, Meta WhatsApp, Clerk, Firebase, email, geocoding, and Cloudflare R2 media.

## HTTP actions and webhooks

- Register routes centrally in `convex/http.ts`.
- Put handler logic in `convex/webhooks/` or a focused module.
- Verify signatures against the raw request body before parsing or mutating data.
- Validate method, content type, required headers, payload shape, event type, and timestamp/replay constraints where supported.
- Use constant-time comparison for signatures when implementing verification manually.
- Return appropriate status codes without exposing internal errors or secrets.
- Record and reject duplicate provider events idempotently.
- Acknowledge only according to the provider's retry contract; distinguish permanent validation errors from transient internal failures.
- Keep verification challenge endpoints read-only.

Never add a temporary unsigned production webhook route.

## Media and storage

- Follow the R2 asset/session abstractions in `convex/media/`, `convex/lib/uploads.ts`, and the exported `ImageAsset` validator in `convex/schema.ts`.
- Validate ownership, MIME type, size, object key, lifecycle status, and upload-session expiry before committing media.
- Use existing public URL helpers such as `convex/media/api.ts` rather than constructing provider URLs ad hoc.
- Preserve compatibility with legacy Convex storage IDs only where current domain code requires it.
- Treat deletion as a lifecycle operation; avoid orphaning database references or provider objects.

## Performance and reactive reads

- Keep public queries bounded and index-backed.
- Paginate catalog, order, audit, notification, and admin list endpoints.
- Batch related lookups and deduplicate IDs to avoid N+1 query patterns; `convex/products.ts` contains an existing batch-enrichment pattern.
- Do not perform expensive provider calls or large computations in reactive queries.
- Return only fields the client needs, especially for frequently subscribed queries.
- Consider document read/write contention when updating global counters or hot singleton records.

## Scheduling, retries, and migrations

- Define scheduled jobs in `convex/crons.ts` and invoke internal functions.
- Make cron and retry handlers safe to run more than once.
- Process bounded batches and reschedule continuation work when needed.
- Use explicit statuses, attempt counts, last-error summaries, and next-attempt timestamps for operational workflows.
- Add kill-switch, rate-limit, and alert integrations where the surrounding domain already uses `convex/lib/killSwitches.ts`, `convex/lib/rateLimit.ts`, or `convex/lib/alerts.ts`.
- Put migrations in the established migration modules and make them observable, resumable, and safe on mixed old/new data.

## Testing and validation

Match validation effort to risk. Relevant commands from `HivebyTailorBee/` include:

```powershell
npm test
npm run typecheck
npm run lint
npx convex dev --once
```

Use only commands supported by the installed Convex CLI; check `npx convex --help` if uncertain.

For focused script-style backend tests, use the established pattern under `convex/tests/`, for example:

```powershell
npx tsx convex/tests/<test-file>.ts
```

Test the following when applicable:

- unauthenticated access,
- wrong role and wrong issuer,
- cross-user or cross-boutique access,
- valid and invalid state transitions,
- malformed and boundary arguments,
- duplicate webhook delivery or mutation retry,
- inventory/payment concurrency,
- provider failure and retry behavior,
- pagination boundaries and empty results,
- migration behavior on old, new, and partially migrated records.

Do not claim a deployment or live-provider test unless it was actually performed. Never deploy to production unless the user explicitly requests it and the target deployment is confirmed.

## Review checklist

Before completing a Convex backend task, verify:

- [ ] Public surface area is minimal and intentional.
- [ ] Arguments and important outputs are validated.
- [ ] Client payloads, function validators, schema fields, writes, and returned DTOs remain synchronized.
- [ ] Authentication, role, issuer, ownership, and tenant checks are correct.
- [ ] Queries are bounded and use appropriate indexes.
- [ ] Mutations preserve domain invariants and valid state transitions.
- [ ] External effects are outside mutations and are idempotent where required.
- [ ] Webhooks verify signatures before processing.
- [ ] Secrets and sensitive data are not exposed or logged.
- [ ] Audit records include accurate actor attribution and every schema-required field.
- [ ] Schema changes have a safe compatibility/backfill plan.
- [ ] Tests cover the highest-risk success and failure paths.
- [ ] Generated files were not edited.
- [ ] Validation commands and any remaining limitations are reported accurately.

## Common mistakes to avoid

- Trusting a role, user ID, boutique ID, price, or status supplied by the client.
- Reading authorization roles only from identity claims.
- Using `.filter()` or `.collect()` where an index and bounded query are needed.
- Calling an external provider from a mutation.
- Exposing an internal helper as a public API without need.
- Swallowing errors and returning success after a failed write or provider call.
- Processing a webhook before signature verification.
- Retrying payment or fulfillment requests without an idempotency strategy.
- Logging full webhook bodies, tokens, secrets, addresses, or payment data.
- Editing `convex/_generated/`.
- Making an incompatible required schema change without staged migration.
- Deploying as part of validation without explicit authorization.

## Completion response

Summarize:

1. backend behavior implemented or reviewed,
2. files changed,
3. authorization and data-integrity decisions,
4. tests and commands run with their results,
5. migrations, environment variables, deployment steps, or follow-up risks still required.