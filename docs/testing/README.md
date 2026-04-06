> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Testing & Regression Testing

Complete testing documentation including unit tests, integration tests, and regression test suite.

## 📚 Quick Navigation

This file is now the single active testing guide.

Legacy deep-dive test docs were moved to:

- `docs/archive/legacy/TESTING_GUIDE_legacy.md`
- `docs/archive/legacy/REGRESSION_TESTING_legacy.md`

---

## 🧪 Test Types

### Unit Tests

- Individual functions and methods
- Fast execution (< 1 sec per test)
- No external dependencies
- Location: `src/__tests__/`

### Integration Tests

- Service interactions
- Database operations
- External API calls (mocked)
- Moderate execution time

### End-to-End Tests

- Full user flows
- Real browser/API calls
- Capture screenshots on failure
- Slower execution

### Regression Tests

- Test full app after changes
- 9 test suites (21 total tests)
- Generate errors for dashboard
- Live monitoring visualization

---

## 🚀 Quick Start

### Run Unit Tests

```bash
npm test              # Run all tests
npm test -- --watch  # Watch mode
npm test -- --coverage  # With coverage report
```

### Run Regression Tests

```bash
bash scripts/testing/regression-test.sh

# Select option:
# n = Single run
# y = Continuous monitoring
```

### Check Test Coverage

```bash
npm test -- --coverage
# View report: coverage/index.html
```

---

## 📊 Test Suite Breakdown

### Regression Test Suites (21 Total Tests)

| #   | Suite        | Tests | Purpose                   |
| --- | ------------ | ----- | ------------------------- |
| 1   | Health Check | 3     | Verify API is up          |
| 2   | Validation   | 3     | Test input validation     |
| 3   | Not Found    | 5     | Test 404 errors           |
| 4   | Products     | 3     | Test product endpoints    |
| 5   | Invoices     | 2     | Test invoice endpoints    |
| 6   | WebSocket    | 2     | Test WS connection errors |
| 7   | Database     | 3     | Test DB operations        |
| 8   | Concurrent   | 10    | Load test (parallel)      |
| 9   | Rapid Fire   | 15    | Spike test (sequential)   |

**Result:** ~15 pass, ~6 expected failures (route differences)

---

## 📈 Test Results Interpretation

### Passing test (✓)

```
✓ Health Check #1 (Expected: 200, Got: 200)
```

✅ Endpoint returned expected status code

### Failing test (✗)

```
✗ Invalid Request #1 (Expected: 400, Got: 404)
```

⚠️ Endpoint returned different status (route not found)

### Test Summary

```
Total Tests: 21
Passed: 15 (71%)
Failed: 6 (expected route differences)
Pass Rate: 71%
```

---

## 🎯 Dashboard Visualization

After running regression tests, monitor in Grafana:

**Dashboard:** http://localhost:3001/d/execora-errors-prod

**Visible Metrics:**

- 🚨 Total Requests (5 min) - Shows all 21 test requests
- 🔥 Errors (5 min) - Shows 404 errors generated
- 📊 Request Volume - Spikes during rapid fire test
- 📋 Request Logs - Detailed trace of each request

---

## ✨ Best Practices

1. **Run tests before deployments**
2. **Keep unit tests fast** (< 100ms each)
3. **Use meaningful test names** (describe what's tested)
4. **Mock external services** (don't call real APIs)
5. **Test error paths** (not just happy path)
6. **Maintain high coverage** (aim for > 80%)
7. **Review failing tests** (might indicate real issues)

---

## 📝 Writing Tests

### Basic Test Pattern

```typescript
import { describe, it, expect } from "@jest/globals";

describe("MyModule", () => {
  it("should do something", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });
});
```

### Testing Async Code

```typescript
it("should handle async operations", async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Errors

```typescript
it("should throw on invalid input", () => {
  expect(() => {
    riskyFunction(null);
  }).toThrow(ValidationError);
});
```

---

## 🔄 CI/CD Integration

In production CI/CD:

```yaml
test:
  script:
    - npm install
    - npm run build
    - npm test -- --coverage
    - npm run regression-test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

---

## 📊 Coverage Goals

| Type       | Target | Current |
| ---------- | ------ | ------- |
| Statements | 80%    | TBD     |
| Branches   | 75%    | TBD     |
| Functions  | 80%    | TBD     |
| Lines      | 80%    | TBD     |

---

## 🆘 Troubleshooting

### Tests not running?

```bash
npm install  # Ensure dependencies installed
npm test     # Verify Jest is configured
```

### Regression test hangs?

```bash
# Press Ctrl+C to stop
# Check if services are running
pnpm docker:ps
```

### Low coverage?

- Review uncovered files: `coverage/lcov-report/index.html`
- Write tests for critical paths first
- Use coverage reports to identify gaps

---

## 📖 Related Documentation

- **Features:** [../features/README.md](../features/README.md)
- **Monitoring:** [../../monitoring/README.md](../../monitoring/README.md)
- **Production:** [../production/PRODUCTION_STRATEGY.md](../production/PRODUCTION_STRATEGY.md)
- **Development:** [../implementation/DEVELOPER_GUIDE.md](../implementation/DEVELOPER_GUIDE.md)

---

## 🔗 External Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)

---

**Last Updated:** Feb 20, 2026  
**Test Framework:** Jest  
**Maintained By:** QA Team
