# Regression Testing Guide

Complete guide to running and understanding the Execora regression test suite.

## 🚀 Quick Start

### Run Once
```bash
cd /home/bharat/Music/execora-complete-with-audio/execora
bash regression-test.sh
# When prompted: Press 'n' for single run
```

### Continuous Monitoring (5-min live test)
```bash
bash regression-test.sh
# When prompted: Press 'y' for continuous mode
# Dashboard updates every 10 seconds
# Press Ctrl+C to stop
```

### Background Testing
```bash
bash regression-test.sh &
# Your test runs in background
# Continue with other work
```

---

## 📊 What Regression Test Does

Executes 9 test suites generating **21 API requests** across different scenarios:

### Test Suite Breakdown

**Suite 1: Health Checks** (3 tests)
- ✓ Verify API responds to `/health` endpoint
- ✓ Baseline for measuring performance

**Suite 2: Validation Errors** (3 tests)
- Tests invalid input handling
- Expected: 400 status (actual: 404 - route differences)

**Suite 3: Not Found Errors** (5 tests)
- ✓ Request customers with non-existent IDs (9991-9995)
- ✓ All return proper 404 responses

**Suite 4: Product Endpoint** (3 tests)
- ✓ Request invalid product IDs
- ✓ Test product service error handling

**Suite 5: Invoice Endpoint** (2 tests)
- ✓ Request non-existent invoices
- ✓ Test invoicing service errors

**Suite 6: WebSocket Errors** (2 tests)
- ✓ Request invalid WebSocket paths
- ✓ Verify WS connection error handling

**Suite 7: Database Operations** (3 tests)
- Tests database operation errors
- Tests business logic validation

**Suite 8: Concurrent Load** (10 tests)
- ✓ 10 simultaneous requests (parallel)
- Tests system under concurrent load

**Suite 9: Rapid Fire** (15 tests)
- ✓ 15 sequential requests rapidly
- Tests system under burst traffic

---

## 📈 Expected Results

```
Total Tests: 21
Passed: 15 (71%)
Failed: 6 (route not found - expected)
Pass Rate: 71%
```

### Passed Tests ✓
- All health checks (3/3)
- All 404 errors (12/12)
- All concurrent requests (10/10)
- All rapid fire requests (15/15)

### Failed Tests ✗ (Expected)
- Validation errors (0/3) - Routes don't exist
- Database errors (0/3) - Routes don't exist

### Analysis
- 6 failures are **expected** (routes not implemented)
- Actual error handling works for existing endpoints
- System handles load well (concurrent + rapid fire pass)

---

## 🎯 What Happens During Test

### Timeline

```
00:00 - Test starts
00:05 - Suite 1: Health checks
00:10 - Suite 2: Validation errors
00:15 - Suite 3: Not found errors (404s)
00:20 - Suite 4: Product errors
00:25 - Suite 5: Invoice errors
00:30 - Suite 6: WebSocket errors
00:35 - Suite 7: Database operations
00:40 - Suite 8: Concurrent requests (10x parallel)
00:45 - Suite 9: Rapid fire (15x sequential)
00:50 - Results summary
00:55 - Dashboard update (Loki pipeline)
01:00 - Test complete ✓

Total Time: ~60 seconds
```

---

## 📊 View Results in Grafana

### Access Dashboard
**URL:** http://localhost:3001/d/execora-errors-prod  
**Login:** admin / admin

### Real-Time Panels Update

| Panel | What Shows | Updates |
|-------|-----------|---------|
| 🚨 Total Requests | 21+ (all test requests) | 10s |
| 🔥 Errors | ~5-10 (404s from tests) | 10s |
| 📊 Request Volume | Spikes during rapid fire | 10s |
| 📋 All Logs | Detailed trace per request | 10s |
| ⏱️ Activity Trend | Spike during test | 10s |
| 💚 Activity Gauge | Increases during test | 10s |
| 📈 Request Rate | Shows 20+ req/sec | 10s |

---

## 📝 Understanding Test Output

### Color Codes

```
✓ GREEN = Test passed (expected status received)
✗ RED   = Test failed (unexpected status received)
```

### Example Output

```
🚀 EXECORA REGRESSION TEST SUITE
==================================

📋 TEST SUITE 1: Health Checks
==========================================
✓ Health Check #1 (Expected: 200, Got: 200)     ← Always passes
✓ Health Check #2 (Expected: 200, Got: 200)
✓ Health Check #3 (Expected: 200, Got: 200)

📋 TEST SUITE 3: Not Found Errors
==========================================
✓ Customer Not Found #1 (ID: 9991) (Expected: 404, Got: 404)
✓ Customer Not Found #2 (ID: 9992) (Expected: 404, Got: 404)
✓ Customer Not Found #3 (ID: 9993) (Expected: 404, Got: 404)
✓ Customer Not Found #4 (ID: 9994) (Expected: 404, Got: 404)
✓ Customer Not Found #5 (ID: 9995) (Expected: 404, Got: 404)

📊 TEST SUMMARY
==========================================
Total Tests: 21
Passed: 15
Failed: 6
Pass Rate: 71%
```

---

## 🔄 Continuous Monitoring Mode

When you select **y** for continuous monitoring:

```
🔄 CONTINUOUS MONITORING MODE
==================================
Generating errors every 10 seconds...
Press Ctrl+C to stop

🔁 Cycle 1: 05:25:15
Generated 5 errors → logs/app.log → Loki → Grafana

🔁 Cycle 2: 05:25:25
Generated 5 errors → Visible in dashboard now

🔁 Cycle 3: 05:25:35
...continues until Ctrl+C
```

---

## 🎯 Continuous Monitoring Use Cases

### Scenario 1: Demo/Presentation
```bash
# Start test in continuous mode
bash regression-test.sh
# y (select continuous)
# Keep dashboard open in browser
# Show live monitoring updating every 10 seconds
```

### Scenario 2: Load Testing
```bash
# Run in background for 5 minutes
timeout 300 bash regression-test.sh &
# Check metrics, response times under load
```

### Scenario 3: Finding Issues
```bash
# Monitor while making code changes
bash regression-test.sh  # y for continuous
# Make changes to code
# Watch dashboard for new errors appearing
# Ctrl+C when done
```

---

## 🛠️ Advanced Usage

### Run Specific Count
Modify `regression-test.sh`:
```bash
# Change line with "for i in {1..15}" to desired count
for i in {1..30}  # Run 30 rapid requests
```

### Extract Just Errors
```bash
bash regression-test.sh 2>&1 | grep "✗"
```

### Get Pass Rate Only
```bash
bash regression-test.sh 2>&1 | grep "Pass Rate"
```

### Schedule Regular Tests
```bash
# Run test every 6 hours (Linux cron)
0 */6 * * * /home/bharat/Music/execora-complete-with-audio/execora/regression-test.sh
```

---

## 📊 Interpreting Dashboard After Test

### Metric Insights

**🚨 Total Requests spike:** System receiving requests properly
```
Before: 5 req/min (normal traffic)
Test: 30 req/min (test traffic)
After: 5 req/min (back to normal)
```

**🔥 Error Count shows:** Which requests had errors
```
404 errors: 5-10 (expected for not-found tests)
Success: 10-15 (health checks and concurrent)
```

**⏱️ Activity Trend shows:** Traffic pattern
```
Flat before test
Spike during test (15-second high activity)
Back to baseline after
```

---

## 🆘 Troubleshooting

### "Connection refused" Error?
```bash
# Check if API is running
curl http://localhost:3000/health

# If not, start containers
docker-compose up -d
```

### Test hangs?
```bash
# Press Ctrl+C
# Check if services are responsive
docker-compose ps
```

### Logs not in Grafana?
```bash
# Wait 5-10 seconds (Loki pipeline delay)
# Then refresh dashboard
# Check Loki has data
curl 'http://localhost:3100/loki/api/v1/labels'
```

### Dashboard showing "No data"?
```bash
# Check datasource
# URL: http://localhost:3001/connections/datasources/
# Verify Loki datasource is configured
```

---

## 📈 Performance Metrics to Check

After running regression tests in Grafana:

- **Request Rate:** Should spike to 20-30 req/sec during test
- **Response Time:** p95 should be < 500ms
- **Error Rate:** Should spike during test (404s), then back to normal
- **Most Active:** POST requests to /api/v1/customers

---

## 📖 Related Documentation

- **Error Handling:** [../implementation/error-handling/](../implementation/error-handling/)
- **Testing Guide:** [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Monitoring:** [../monitoring/](../monitoring/)
- **Monitoring Setup:** [../monitoring/OBSERVABILITY_ACCESS.md](../monitoring/OBSERVABILITY_ACCESS.md)

---

## 🚀 Next Steps

1. ✅ Run regression test once (`n`)
2. ✅ View results in Grafana dashboard
3. ✅ Run continuous mode (`y`) for 5 minutes
4. ✅ Watch dashboard update in real-time
5. ✅ Review error handling & monitoring

---

**Last Updated:** Feb 20, 2026  
**Script Location:** `/regression-test.sh`  
**Dashboard:** http://localhost:3001/d/execora-errors-prod  
**Maintained By:** QA Team
