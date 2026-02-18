# Real-Time Multi-Task Voice Session Implementation

## Overview
This implementation enables true parallel task execution in voice sessions, allowing multiple voice commands to be queued, executed concurrently, and tracked with real-time status updates.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   WebSocket Client (Browser)                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ (continuous real-time voice + tasks)
                            │
┌─────────────────────────────────────────────────────────────────┐
│             Enhanced WebSocket Handler                            │
│  - Continuous STT connection (stays open)                         │
│  - Real-time transcript callbacks                                 │
│  - Intent extraction per utterance                                │
└────────────────┬────────────────────┬────────────────────────────┘
                 │                    │
        ┌────────▼─────────┐  ┌──────▼──────────┐
        │  Task Queue      │  │ Conversation    │
        │  Service         │  │ Memory (Async)  │
        │- QUEUED          │  └─────────────────┘
        │- RUNNING (×3)    │
        │- COMPLETED       │
        │- FAILED          │
        │- CANCELLED       │
        └────────┬─────────┘
                 │
        ┌────────▼─────────────────┐
        │ Business Engine          │
        │ (Parallel Execution)     │
        │ - CREATE_INVOICE         │
        │ - CHECK_BALANCE          │
        │ - RECORD_PAYMENT         │
        │ - ... etc parallel       │
        └──────────────────────────┘
```

## Key Components

### 1. **Task Queue Service** (`src/business/task-queue.service.ts`)
Manages per-conversation task lifecycle:
- **Add task**: Enqueue with priority (higher = execute first)
- **Track status**: QUEUED → RUNNING → COMPLETED|FAILED|CANCELLED
- **Parallel execution**: Up to 3 tasks run simultaneously per session
- **Auto-cleanup**: Removes completed tasks older than 5 minutes
- **Real-time stats**: Queue size, running count, completion rate

### 2. **Continuous STT Connection**
- **Before**: Socket closed after first final transcript → one-command-only
- **Now**: Socket stays open across multiple final transcripts
- Only closes on explicit voice:stop
- Enables natural multi-command voice flows

### 3. **Conversation Memory** 
- **Active customer focus**: Set automatically after strong matches
- **Recent customers cache**: 10-item fuzzy search cache per session
- **Context preservation**: Intents can reference previous customer without re-stating name

### 4. **Parallel Task Execution**
- Up to 3 tasks run in parallel per conversation
- Higher priority tasks start first
- Each task tracks: duration, success/failure, result
- Client receives real-time status via WebSocket messages

## WebSocket Message Flow

### Continuous Voice Mode (NEW)

```
Client                          Server
  │
  ├─► voice:start (open STT and keep alive)
  │                   → voice:started
  │
  ├─► [speaks: "100 credit add karo"]
  │         → voice:transcript "100 credit add karo" (interim)
  │         → voice:transcript "100 credit add karo" (final)
  │         → task:queued { taskId, intent: ADD_CREDIT }
  │         → task:started { taskId }
  │         ~~[executing in background]~~
  │         → task:completed { taskId, result: {...} }
  │         → voice:response "₹100 credit add gaya"
  │
  ├─► [speaks: "balance check karo"]
  │         → voice:transcript "balance check karo" (interim)
  │         → voice:transcript "balance check karo" (final)
  │         → task:queued { taskId, intent: CHECK_BALANCE }
  │         → task:started { taskId }
  │         ~~[executing in parallel with previous task]~~
  │         → task:completed { taskId, result: {...} }
  │         → voice:response "Balance ₹500 hai"
  │
  ├─► [speaks: "reminder set karo"]
  │         → voice:transcript "reminder set karo" (interim)
  │         → voice:transcript "reminder set karo" (final)
  │         → task:queued { taskId, intent: CREATE_REMINDER }
  │         ~~[queued, waiting for slot]~~
  │
  └─► [first task completes]
         → task:started { taskId: 3 }
         ~~[executing now]~~
         → task:completed { taskId: 3, result: {...} }
         → voice:response "Reminder set ho gaya"
```

### Task Control Messages

**Get queue status:**
```json
{
  "type": "task:status",
  "data": { "taskId": null },
  "timestamp": "2026-02-18..."
}
```

Response:
```json
{
  "type": "queue:status",
  "data": {
    "stats": { "queued": 2, "running": 1, "completed": 5 },
    "tasks": [
      { "id": "task-xxx", "intent": "CHECK_BALANCE", "status": "RUNNING", ... },
      { "id": "task-yyy", "intent": "ADD_CREDIT", "status": "QUEUED", ... }
    ]
  }
}
```

**Cancel specific task:**
```json
{
  "type": "task:cancel",
  "data": { "taskId": "task-xxx" },
  "timestamp": "2026-02-18..."
}
```

## Usage From Client

### JavaScript Example
```javascript
// Start continuous listening
client.send({
  type: 'voice:start',
  data: { ttsProvider: 'browser' },
  timestamp: new Date().toISOString(),
});

// Listen for real-time task updates
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  switch(msg.type) {
    case 'task:queued':
      console.log(`📋 Task queued:`, msg.data.taskId);
      break;
    
    case 'task:started':
      console.log(`▶️ Task running:`, msg.data.taskId);
      break;
    
    case 'task:completed':
      console.log(`✅ Task done:`, msg.data.result);
      break;
    
    case 'task:failed':
      console.log(`❌ Task failed:`, msg.data.error);
      break;
    
    case 'queue:status':
      console.log(`Queue stats:`, msg.data.stats);
      break;
  }
};

// Check status anytime
client.send({
  type: 'task:status',
  data: {},
  timestamp: new Date().toISOString(),
});

// Cancel task if needed
client.send({
  type: 'task:cancel',
  data: { taskId: 'task-xxx' },
  timestamp: new Date().toISOString(),
});
```

## Behavior

### Continuous Voice to Multi-Task

1. **Start listening once**: `voice:start` opens STT socket and keeps it active
2. **Speak commands naturally**: 
   - "Rahul ka balance check karo"
   - "100 credit add karo"
   - "Reminder set karo"
3. **Each utterance auto-queues**: STT's final transcript → intent → task queued
4. **Parallel execution**: Up to 3 tasks run simultaneously
5. **No re-listening needed**: Same socket handles all commands in one session

### Customer Context Preservation

```
Voice: "Rahul ka balance batao"
  → Task 1: CHECK_BALANCE (conversationId, customer: Rahul)
  → Active customer set to: Rahul

Voice: "100 credit add karo"
  → Task 2: ADD_CREDIT (conversationId, no explicit customer)
  → Resolves to active customer: Rahul ✅ (no name repeat needed)

Voice: "reminder set karo"
  → Task 3: CREATE_REMINDER (conversationId, no explicit customer)
  → Resolves to active customer: Rahul ✅
```

## Configuration

In `src/websocket/enhanced-handler.ts`:
```typescript
// Max parallel tasks per session
private maxConcurrentPerSession = 3;

// Queue processing interval
private processingInterval = 100; // ms
```

## Performance Characteristics

- **Task add latency**: ~1ms (in-memory queue)
- **Task scheduling latency**: ~100ms (polling interval)
- **Parallel throughput**: 3 tasks × command processing time
- **Memory per session**: ~50KB (task metadata)
- **Auto-cleanup**: Old completed tasks removed every 5 minutes

## Analytics & Logs

Each task event is logged with:
- Task ID
- Conversation ID
- Intent name
- Duration (start → end)
- Success/failure status
- Error messages if applicable

Access queue health via:
```typescript
const stats = taskQueueService.getQueueStats(conversationId);
console.log(stats); 
// { queued: 2, running: 1, completed: 15, failed: 0, cancelled: 1, total: 19 }
```

## Backward Compatibility

- One-by-one execution still works (just don't queue multiple tasks)
- Existing intents process identically
- Customer resolver now auto-uses active focus for even faster matches
- All existing message types still supported

## Next Steps

**Phase 2 (Optional):**
- Task priority queue (FIFO, round-robin, adaptive scheduling)
- Task dependencies (Task B waits for Task A completion)
- Interrupt handlers (stop all tasks on voice:stop)
- Retry logic with exponential backoff
- Rate limiting per customer (prevent spam)
- Batch operations (multiple customers in one command)
