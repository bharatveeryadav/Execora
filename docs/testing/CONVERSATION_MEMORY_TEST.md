# Conversation Memory Testing Guide

## Overview
The conversation memory system now tracks the last 20 messages in each conversation session, allowing the AI to reference previous context in multi-turn dialogues.

## Features Implemented

### 1. Message History Storage
- Stores user messages with intent and entities
- Stores assistant responses
- Maintains up to 20 messages per conversation
- Auto-expires after 30 minutes of inactivity
- Automatic cleanup every 10 minutes

### 2. Context Injection
- Conversation history is injected into OpenAI prompts for:
  - **Intent extraction**: Helps resolve ambiguous references like "usko", "add more", "kitna hai ab"
  - **Response generation**: Creates coherent responses referencing earlier dialogue

### 3. Active Customer Tracking
- Tracks the currently focused customer in conversation
- Helps resolve pronoun references (usko/isko → customer name)

## Test Scenarios

### Test 1: Balance Query Follow-up
**Goal**: Verify AI remembers balance was just discussed

```
User: "Bharat ka balance kitna hai?"
AI: "Bharat ka balance 5000 hai"

User: "Usko 500 add karo"
Expected: AI resolves "usko" to Bharat, adds 500
AI: "Theek hai. Bharat ko 500 add kar diya. Ab total 5500 hai."

User: "Aur kitna ho gaya?"
Expected: AI knows we're still talking about Bharat's balance
AI: "Bharat ka balance ab 5500 hai"
```

### Test 2: Customer Info Follow-up
**Goal**: Verify AI remembers customer details just retrieved

```
User: "Rahul ki sari jankari batao"
AI: "Rahul ka details:
Name: Rahul
Phone: nau chhah saat char...
Balance: 2000 hai
Status: Active hai"

User: "Iska phone update karo - नाइन एट सेवन सिक्स..."
Expected: AI knows "iska" refers to Rahul from previous query
AI: "Rahul ka phone update ho gaya. Ab Rahul ka nimble phone hai: [words]"

User: "Balance kitna hai?"
Expected: AI knows we're still discussing Rahul
AI: "Rahul ka balance 2000 hai"
```

### Test 3: Multi-Customer Context Switch
**Goal**: Verify AI tracks context switches between customers

```
User: "Bharat ka balance?"
AI: "Bharat ka balance 5000 hai"

User: "Aur Rahul ka?"
Expected: AI understands "Rahul ka?" is asking for Rahul's balance (contextual completion)
AI: "Rahul ka balance 2000 hai"

User: "Dono ko 100-100 add karo"
Expected: AI remembers both customers just mentioned
AI: "Theek hai. Bharat ko 100 add kar diya. Rahul ko bhi 100 add kar diya."
```

### Test 4: Ambiguous Amount Reference
**Goal**: Verify AI recalls amounts from earlier dialogue

```
User: "Bharat ko 500 rupay dena hai"
AI: "Theek hai. Bharat ko 500 add kar diya."

User: "Kal reminder bhej dena"
Expected: AI knows to remind about 500 rupees to Bharat
AI: "Theek hai. Bharat ke liye 500 ka reminder kal bhej denge."
```

### Test 5: Conversation Memory Limits
**Goal**: Verify memory cleanup and limits

```
Test 1: Send 25 messages → Only last 20 retained
Test 2: Wait 30 minutes → Memory auto-expires
Test 3: Start new conversation → Fresh memory context
```

## Testing Steps

### 1. Start the Server
```bash
cd /home/bharat/Music/execora-complete-with-audio/execora
docker compose up --build
```

### 2. Open Voice Interface
- Open browser: http://localhost:3000/index-audio.html
- Or use: public/index.html for testing

### 3. Enable Debug Logging
Check logs for conversation memory activity:
```bash
docker compose logs -f execora
```

Look for:
- `conversationMemory.addUserMessage()` calls
- `conversationMemory.addAssistantMessage()` calls
- `getFormattedContext()` returning conversation history

### 4. Run Test Scenarios
- Execute each test scenario above
- Verify AI responses show context awareness
- Check logs to confirm history is being injected

## Expected Behaviors

### ✅ Working Correctly
- Multi-turn questions about same customer without repeating name
- Pronoun resolution (usko/isko → customer name)
- Contextual amount references
- Follow-up questions: "kitna hai ab?" (how much now?)
- Implicit customer continuation: "balance?" after discussing customer

### ❌ Known Limitations
- Memory limited to 20 messages (by design)
- Auto-expires after 30 minutes of inactivity
- No persistence to database (in-memory only)
- New WebSocket connection = new conversation (no cross-session memory)

## Debugging

### Check Conversation History
Add temporary debug endpoint in routes/index.ts:
```typescript
fastify.get('/api/debug/conversation/:conversationId', async (request, reply) => {
  const { conversationId } = request.params as { conversationId: string };
  const history = conversationMemory.getConversationHistory(conversationId);
  return { conversationId, history };
});
```

### View Active Conversations
```typescript
fastify.get('/api/debug/conversations', async (request, reply) => {
  // Requires exposing getAllConversations() in conversation-memory.service.ts
  return conversationMemory.getAllConversations();
});
```

## Architecture

### Message Flow
1. **User speaks** → STT (ElevenLabs) → Raw transcript
2. **Normalize** → OpenAI normalizes transcript
3. **Extract Intent** → OpenAI + conversation history → Intent + entities
4. **Log User Message** → `conversationMemory.addUserMessage()`
5. **Execute** → Business engine processes intent
6. **Generate Response** → OpenAI + conversation history → Natural response
7. **Log Assistant Message** → `conversationMemory.addAssistantMessage()`
8. **TTS** → Speak response to user

### Context Injection Points
- **extractIntent()**: Injects last 6 messages before system prompt
- **generateResponse()**: Injects last 6 messages before system prompt

### Data Structure
```typescript
ConversationMemory {
  messages: Array<{
    role: 'user' | 'assistant',
    content: string,
    timestamp: Date,
    intent?: string,         // For user messages
    entities?: any,          // For user messages
  }>,
  context: {
    activeCustomerId?: string,
    activeCustomerName?: string,
    [key: string]: any       // Custom context storage
  },
  lastActivity: Date
}
```

## Success Metrics
- ✅ AI resolves "usko/isko" to correct customer from previous message
- ✅ AI answers "kitna hai ab?" without needing customer name again
- ✅ AI tracks multiple customers mentioned in same conversation
- ✅ AI generates coherent responses referencing earlier dialogue
- ✅ Memory auto-cleans after 30 minutes

## Next Steps (Optional Enhancements)
1. **Persist conversations to database** for analytics/auditing
2. **Add conversation history API endpoint** for debugging
3. **Support conversation resumption** across WebSocket reconnections
4. **Expand memory limit** from 20 to configurable size
5. **Add conversation summarization** for very long dialogues
6. **Track conversation topics/categories** for better intent extraction
