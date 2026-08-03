# Architecture Notes

This codebase is moving toward a feature-based modular monolith.

## Recommended Folder Structure

```txt
src/
  app/
    api/
    admin-settings/
    employee/
    employees/
    leaves/
    onboarding/
    reports/
    wfh/
    ...
  components/
  hooks/
  lib/
    auth/
      constants.ts
      session.ts
      guards.ts
    attendance/
      actions.ts
      queries.ts
      rules.ts
    employees/
      actions.ts
      queries.ts
    leaves/
      actions.ts
      queries.ts
    onboarding/
      actions.ts
      queries.ts
    reports/
      queries.ts
    shared/
      business-rules.ts
      prisma.ts
      telegram.ts
      utils.ts
```

## Refactor Order

1. Unify auth/session primitives.
2. Split large `lib/actions.ts` into feature files.
3. Move read-only queries into `queries.ts` files.
4. Keep mutations in `actions.ts` files with explicit auth checks.
5. Thin route handlers should call feature modules instead of containing domain logic.

## Current First Steps

- `SESSION_COOKIE_NAME` is now shared between session code and proxy code.
- `proxy.ts` is aligned with the actual session cookie used by auth.

