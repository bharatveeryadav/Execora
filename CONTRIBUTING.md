# Contributing to Execora

Thanks for contributing.

## Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start local services and app:

```bash
pnpm docker:up
pnpm docker:db:push
pnpm docker:seed
pnpm dev
```

3. Run worker in a separate terminal:

```bash
pnpm worker
```

## Coding Rules

- Use barrel imports from package roots (for example `@execora/infrastructure`).
- Keep changes scoped and avoid unrelated refactors.
- Follow existing TypeScript and module patterns in the repo.
- Use valid invoice statuses only: `draft`, `pending`, `partial`, `paid`, `cancelled`.

## Backend Conventions

- API bootstrap and plugin setup: `apps/api/src/index.ts`.
- Route registration and auth scoping: `apps/api/src/api/index.ts`.
- Protected REST endpoints belong in JWT-protected route scope.
- Public endpoints should stay explicitly public (auth/webhooks/public portal/demo paths).
- WebSocket clients must connect with JWT query token (`/ws?token=...`).

## Pull Request Checklist

- [ ] `pnpm build` passes
- [ ] `pnpm typecheck` passes
- [ ] Relevant tests pass
- [ ] Docs are updated when behavior changes
- [ ] No secrets or environment files are committed

## Documentation

Project documentation is consolidated at:

- `docs/README.md`
