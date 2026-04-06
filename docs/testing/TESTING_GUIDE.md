> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Testing Guide (Merged)

This file has been merged into the canonical testing guide:

- [README.md](README.md)

For historical full-length content, see:

- [../archive/legacy/TESTING_GUIDE_legacy.md](../archive/legacy/TESTING_GUIDE_legacy.md)

## Commands

```bash
npm test
npm test -- --watch
npm test -- --coverage
bash scripts/testing/regression-test.sh
```
