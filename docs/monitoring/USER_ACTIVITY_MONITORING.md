# 👥 User Activity & Console Logs - Real-time Monitoring

## 🎯 Quick Start (Copy-Paste These)

### See ALL Console Logs Live
```bash
# Real-time console logs
docker logs execora-app -f

# With timestamps
docker logs execora-app -f -t

# Last 100 lines then follow
docker logs execora-app --tail 100 -f
```

### See User Activity
```bash
# All user activity
grep "user_id\|userId\|session" logs/app.log | jq '.'

# User profile: See all activity for user_id=123
grep "123" logs/app.log | jq '{timestamp: .timestamp, msg: .msg, user_id: .user_id, action: .action}'

# Real-time user activity as it happens
tail -f logs/app.log | grep "user_id"
```

### Real-time Monitoring Dashboard
```bash
# Monitor all activity at once
tail -f logs/app.log | jq '{
  time: .timestamp,
  user: .user_id,
  action: .msg,
  status: .level,
  details: .action
}'
```

---

## 📊 User Activity by Activity Type

### See All User Actions
```bash
# Invoices viewed/created by user
grep "invoice" logs/app.log | jq '{user: .user_id, action: .msg, timestamp: .timestamp}'

# Payments by user
grep "payment\|Payment" logs/app.log | jq '{user: .user_id, amount: .amount, status: .status}'

# Voice commands by user
grep "voice_command\|speech" logs/app.log | jq '{user: .user_id, command: .msg, duration: .duration}'

# Chat/conversation by user
grep "message\|conversation" logs/app.log | jq '{user: .user_id, msg: .msg}'

# Login/session activity
grep "login\|logout\|session" logs/app.log | jq '{user: .user_id, event: .msg, timestamp: .timestamp}'
```

---

## 🔴 Real-time User Monitoring (Watch Specific User)

### Monitor One User Live
```bash
# Replace "USER_123" with actual user ID
USER_ID="USER_123"
tail -f logs/app.log | grep "$USER_ID" | jq '{
  time: .timestamp,
  action: .msg,
  level: .level,
  details: .action
}'
```

### All Users Active Right Now
```bash
# See distinct users in last minute
tail -1000 logs/app.log | jq -r '.user_id' | sort | uniq -c | sort -rn
```

---

## 🎨 Grafana: Visual User Activity (No Code!)

### Create User Activity Query in Grafana

1. Open http://localhost:3001
2. Go to **Explore**
3. Select **Loki** datasource
4. Click **Code** button
5. Paste this query:

```logql
{job="execora-app"} | json | user_id != ""
```

Then:
- Click **Live** for real-time stream
- Add filter: `| pattern "invoice"` to see only invoices
- Add filter: `| json | level="30"` for warnings

---

## 📈 Specific User Monitoring Templates

### Template 1: User Dashboard (in terminal)
```bash
#!/bin/bash

USER_ID=${1:-"USER_123"}
echo "=== MONITORING USER: $USER_ID ==="
echo ""

echo "Recent Activity:"
grep "$USER_ID" logs/app.log | tail -20 | jq '{time: .timestamp, msg: .msg, status: .level}'

echo ""
echo "Activity Summary:"
grep "$USER_ID" logs/app.log | jq '.msg' | sort | uniq -c | sort -rn

echo ""
echo "Listening for new activity..."
tail -f logs/app.log | grep "$USER_ID" | jq '{time: .timestamp, msg: .msg}'
```

Save as `monitor-user.sh` and run:
```bash
chmod +x monitor-user.sh
./monitor-user.sh USER_123
```

### Template 2: All Users Real-time
```bash
#!/bin/bash

echo "=== LIVE USER ACTIVITY ==="
tail -f logs/app.log | jq '{
  time: .timestamp,
  user: .user_id,
  action: .msg,
  status: (.level | if . == "30" then "⚠️  WARNING" elif . == "50" then "❌ ERROR" else "✅ OK" end)
}'
```

### Template 3: Activity Stats (Every 10 seconds)
```bash
#!/bin/bash

while true; do
  clear
  echo "=== USER ACTIVITY STATS (Last 100 entries) ==="
  echo ""
  echo "Active Users:"
  tail -100 logs/app.log | jq -r '.user_id' | sort | uniq -c | sort -rn
  echo ""
  echo "Activity Types:"
  tail -100 logs/app.log | jq -r '.msg' | sort | uniq -c | sort -rn
  echo ""
  echo "Error Count:"
  tail -100 logs/app.log | jq -r 'select(.level == "50") | .msg' | wc -l
  echo ""
  sleep 10
done
```

---

## 🔥 Console Logs with Filters

### Filter Console Output
```bash
# Only errors
docker logs execora-app -f 2>&1 | grep -i error

# Only user-related events
docker logs execora-app -f 2>&1 | grep -i "user\|session\|login"

# Only warnings
docker logs execora-app -f 2>&1 | grep -i "warn"

# Exclude tests
docker logs execora-app -f 2>&1 | grep -v test

# Multiple filters
docker logs execora-app -f 2>&1 | grep -E "invoice|payment|user"
```

### Color-coded Real-time Log View
```bash
# Show errors in red, warnings in yellow, info in green
docker logs execora-app -f 2>&1 | grep -E "." | while IFS= read -r line; do
  if echo "$line" | grep -q "ERROR\|error"; then
    echo -e "\033[0;31m$line\033[0m"  # Red
  elif echo "$line" | grep -q "WARN\|warn"; then
    echo -e "\033[0;33m$line\033[0m"  # Yellow
  else
    echo -e "\033[0;32m$line\033[0m"  # Green
  fi
done
```

---

## 📱 User Metrics in Grafana

### Create a User Activity Panel

1. In Grafana, click **Create Dashboard**
2. Click **Add Panel**
3. Select **Loki** datasource
4. Enter query:

```logql
{job="execora-app"} | json
```

4. Click **Options** tab
5. Set **Format**: Logs

Now you can:
- Filter by `user_id`
- Sort by time (newest first)
- See live stream

---

## 🎯 Monitoring Specific Actions

### Track User Invoices
```bash
# All invoices for all users
grep "invoice" logs/app.log | jq '{user: .user_id, action: .action, timestamp: .timestamp, status: .status}'

# Watch for new invoices live
tail -f logs/app.log | grep "invoice" | jq '{user: .user_id, action: .msg}'
```

### Track User Payments
```bash
# Payment history for user
grep "USER_123" logs/app.log | grep "payment" | jq '{timestamp: .timestamp, amount: .amount, status: .status}'

# Real-time payment monitoring
tail -f logs/app.log | grep "payment" | jq '{user: .user_id, amount: .amount, status: .status, time: .timestamp}'
```

### Track Voice Commands
```bash
# Voice commands by user
grep "voice\|speech" logs/app.log | jq '{user: .user_id, command: .msg, duration: .duration, status: .status}'

# Real-time voice activity
tail -f logs/app.log | grep "voice\|speech" | jq '{user: .user_id, msg: .msg}'
```

### Track User Sessions
```bash
# Session logins/logouts
grep "session\|login\|logout" logs/app.log | jq '{user: .user_id, event: .msg, timestamp: .timestamp}'

# Real-time sessions
tail -f logs/app.log | grep "session" | jq '{user: .user_id, action: .msg, time: .timestamp}'
```

---

## 🚀 Live Dashboard Setup (Advanced)

### Option 1: Terminal Dashboard (using tmux)
```bash
# Install tmux if needed
sudo apt-get install tmux

# Create 3-pane dashboard
tmux new-session -d -s monitor
tmux send-keys -t monitor "echo 'PANE 1: All Logs' && tail -f logs/app.log | jq '.msg'" Enter
tmux split-window -h -t monitor
tmux send-keys -t monitor "echo 'PANE 2: User Activity' && tail -f logs/app.log | grep -E 'user|invoice|payment' | jq '.'" Enter
tmux split-window -v -t monitor
tmux send-keys -t monitor "echo 'PANE 3: Errors Only' && tail -f logs/app.log | grep -i error | jq '.'" Enter

# View dashboard
tmux attach -t monitor

# Exit: Ctrl+B then D, then: tmux kill-session -t monitor
```

### Option 2: Grafana + Loki (Visual)
```
1. Open http://localhost:3001
2. Create new dashboard
3. Add 3 panels:
   - Panel 1: All logs ({job="execora-app"})
   - Panel 2: User activity ({job="execora-app"} | json | user_id != "")
   - Panel 3: Errors only ({job="execora-app"} | json | level="50")
4. Set refresh to "1s" for real-time
```

---

## 🛠️ One-Liner Commands (Copy-Paste Ready)

| What | Command |
|-----|---------|
| See console | `docker logs execora-app -f` |
| User activity | `tail -f logs/app.log \| grep -E 'user\|invoice\|payment' \| jq '{user: .user_id, action: .msg}'` |
| Specific user | `tail -f logs/app.log \| grep "USER_123" \| jq '.'` |
| Real-time stats | `watch -n 1 "tail -100 logs/app.log \| jq -r '.msg' \| sort \| uniq -c \| sort -rn"` |
| Error alerts | `tail -f logs/app.log \| jq 'select(.level == "50") \| {user: .user_id, error: .msg}'` |
| Activity summary | `tail -1000 logs/app.log \| jq '.user_id' \| sort \| uniq -c \| sort -rn` |
| Live users | `while true; do clear; tail -100 logs/app.log \| jq -r '.user_id' \| sort \| uniq; sleep 5; done` |
| Payment tracking | `tail -f logs/app.log \| grep "payment" \| jq '{user: .user_id, amount: .amount, status: .status}'` |

---

## 📋 Logging Schema Reference

Your logs contain these fields:
```json
{
  "timestamp": "2026-02-19T10:30:45.000Z",
  "level": 30,  // 30=info, 40=warn, 50=error
  "msg": "User activity description",
  "user_id": "USER_123",
  "action": "invoice_created",
  "status": "success|error",
  "amount": 1500,  // payment amount
  "duration": 123,  // milliseconds
  "command": "create invoice",  // voice command
  "error": "Error description"
}
```

Use `jq` to extract any field:
```bash
# Extract just user IDs
tail -100 logs/app.log | jq '.user_id'

# Extract just messages with user
tail -100 logs/app.log | jq '{user: .user_id, msg: .msg}'

# Extract errors
tail -100 logs/app.log | jq 'select(.level == 50)'
```

---

## ⚡ Quick Setup (2 Minutes)

```bash
# 1. Start monitoring all logs
docker logs execora-app -f &

# 2. In another terminal, monitor user activity
tail -f logs/app.log | jq '{user: .user_id, action: .msg, time: .timestamp}'

# 3. Open Grafana to see visualized
# http://localhost:3001
# Explore → Loki → {job="execora-app"}
```

Done! You're now monitoring everything. 🎉

