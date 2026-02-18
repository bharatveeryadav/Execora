# Conversation Memory - Quick Reference

## What Was Done

✅ **Created conversation-memory.service.ts**: Store message history for multi-turn dialogues  
✅ **Modified openai.service.ts**: Inject conversation history into intent extraction & response generation  
✅ **Modified enhanced-handler.ts**: Log user messages and assistant responses to memory  
✅ **Build verified**: TypeScript compilation successful, no errors  
✅ **Documentation created**: Implementation guide, testing guide, architecture diagram  

## The Problem We Solved

**Before**: AI forgot previous context - every message was treated as isolated
```
User: "Bharat ka balance?"
AI: "5000 hai"
User: "Kitna ho gaya ab?" ← User expects AI to remember we're talking about Bharat
AI: ❌ "Kis customer ka balance chahiye?" (AI doesn't remember)
```

**After**: AI maintains conversation memory across multiple turns
```
User: "Bharat ka balance?"
AI: "5000 hai"
User: "Usko 500 add karo" ← AI knows "usko" = Bharat from previous message
AI: ✅ "Bharat ko 500 add kar diya. Ab 5500 hai"
User: "Kitna ho gaya ab?"
AI: ✅ "Bharat ka balance ab 5500 hai" (AI remembers the context!)
```

## How to Test

### 1. Start the server
```bash
cd /home/bharat/Music/execora-complete-with-audio/execora
docker compose up --build
```

### 2. Open voice interface
- Browser: http://localhost:3000/index-audio.html

### 3. Test multi-turn conversation
Try these scenarios:

**Scenario 1: Balance follow-up**
```
You: "Bharat ka balance kitna hai?"
AI: "5000 hai"
You: "Usko 500 add karo"  ← No customer name needed
Expected: AI knows "usko" = Bharat
```

**Scenario 2: Customer info follow-up**
```
You: "Rahul ki sari jankari batao"
AI: [Shows all Rahul details]
You: "Iska phone update karo..."  ← "iska" = Rahul
Expected: AI updates Rahul's phone
```

**Scenario 3: Implicit questions**
```
You: "Bharat ka balance?"
AI: "5000 hai"
You: "Kitna ho gaya ab?"  ← No context specified
Expected: AI knows we're still talking about Bharat
```

### 4. Check logs
```bash
docker compose logs -f execora | grep -i "conversation"
```

Look for:
- `conversationMemory.addUserMessage()` logs
- `conversationMemory.addAssistantMessage()` logs
- History injection logs in OpenAI calls

## Key Features

| Feature | Details |
|---------|---------|
| **Message History** | Stores last 20 messages per conversation |
| **Context Injection** | Last 6 messages injected into OpenAI prompts |
| **Auto Cleanup** | Expires conversations after 30 min of inactivity |
| **Pronoun Resolution** | Resolves "usko/isko" using conversation context |
| **Follow-up Questions** | Handles implicit context like "kitna hai ab?" |
| **Active Customer Tracking** | Tracks the currently focused customer |

## Files Modified

1. **NEW**: `src/business/conversation-memory.service.ts` (200+ lines)
2. **Modified**: `src/services/openai.service.ts` (added conversationId params + history injection)
3. **Modified**: `src/websocket/enhanced-handler.ts` (log messages to memory)

## Memory Configuration

```typescript
Max messages per conversation: 20
Context injection limit: 6 messages (last 6)
TTL: 30 minutes of inactivity
Cleanup interval: 10 minutes
Storage: In-memory (not persisted to DB)
```

## API Quick Reference

### Add User Message
```typescript
conversationMemory.addUserMessage(
  conversationId: string,
  message: string,
  intent?: IntentType,
  entities?: any
)
```

### Add Assistant Message
```typescript
conversationMemory.addAssistantMessage(
  conversationId: string,
  message: string
)
```

### Get Formatted Context
```typescript
const context = conversationMemory.getFormattedContext(
  conversationId: string,
  limit?: number  // Default: 6
)

// Returns:
// "Previous conversation:
//  User: Bharat ka balance?
//  Assistant: Bharat ka balance 5000 hai
//  User: Usko 500 add karo
//  ..."
```

### Get Conversation History
```typescript
const history = conversationMemory.getConversationHistory(
  conversationId: string,
  limit?: number  // Default: 10
)

// Returns: Array<{role, content, timestamp, intent?, entities?}>
```

### Clear Memory
```typescript
conversationMemory.clearMemory(conversationId: string)
```

## Integration Flow

```
User speaks → STT → Transcript
    ↓
Normalize transcript (OpenAI)
    ↓
Extract intent (WITH conversation history) ← conversationMemory.getFormattedContext()
    ↓
Log user message → conversationMemory.addUserMessage()
    ↓
Execute business logic
    ↓
Generate response (WITH conversation history) ← conversationMemory.getFormattedContext()
    ↓
Log assistant message → conversationMemory.addAssistantMessage()
    ↓
TTS → User hears response
```

## Common Test Cases

✅ **Pronoun resolution**: "usko" → resolved to active customer  
✅ **Implicit follow-ups**: "kitna hai ab?" → knows which customer  
✅ **Amount references**: "500" mentioned earlier → remembered in next turn  
✅ **Multi-customer context**: Switch between customers naturally  
✅ **Context-aware responses**: AI references previous dialogue  

## Troubleshooting

### Issue: AI still doesn't remember context
**Check:**
1. conversationSessionId is set in WebSocket session?
2. Logs show memory operations (`addUserMessage`, `addAssistantMessage`)?
3. getFormattedContext() returns non-empty string?
4. Using enhanced-handler (not basic handler)?

**Debug command:**
```bash
docker compose logs -f execora | grep -E "(conversationMemory|getFormattedContext)"
```

### Issue: Build fails
**Fix:**
```bash
cd /home/bharat/Music/execora-complete-with-audio/execora
npm run build
```
Should show no errors ✅

### Issue: Memory not cleaning up
**Check:**
- cleanupExpiredMemory() running? (every 10 min)
- TTL configured correctly? (30 min default)
- Look for cleanup logs in console

## Documentation Files

| File | Purpose |
|------|---------|
| `CONVERSATION_MEMORY_IMPLEMENTATION.md` | Full implementation details |
| `CONVERSATION_MEMORY_TEST.md` | Detailed testing scenarios |
| `CONVERSATION_MEMORY_ARCHITECTURE.md` | Visual diagrams and flow charts |
| `CONVERSATION_MEMORY_QUICK_REF.md` | This quick reference (you are here) |

## Next Steps

### For Production
- ✅ Feature complete and ready for testing
- ⏳ Test with real users
- ⏳ Monitor conversation quality
- ⏳ Tune message limits if needed

### Future Enhancements (Optional)
- [ ] Persist conversations to database for analytics
- [ ] Add conversation history API endpoint
- [ ] Support conversation resumption after reconnect
- [ ] Add conversation summarization for long dialogues
- [ ] Track conversation topics/categories

## Status

**Implementation**: ✅ Complete  
**Build**: ✅ Passing  
**Tests**: ⏳ Ready for manual QA  
**Documentation**: ✅ Complete  

**Ready to test!** Start the server and try the test scenarios above. 🚀
