# Conversation Memory Architecture Diagram

## System Flow with Conversation Memory

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER SPEAKS (VOICE INPUT)                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  ElevenLabs STT        │
                    │  (Speech-to-Text)      │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  Transcript:           │
                    │  "Bharat ka balance?"  │
                    └───────────┬────────────┘
                                │
                                ▼
           ┌────────────────────────────────────────────┐
           │   OpenAI Normalize Transcript              │
           │   Clean filler words, fix ASR errors      │
           └────────────────┬───────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────────────┐
    │           INTENT EXTRACTION (with memory)                 │
    │  ┌─────────────────────────────────────────────────────┐ │
    │  │  1. Get conversation history (last 6 messages)      │ │
    │  │     conversationMemory.getFormattedContext()        │ │
    │  │                                                     │ │
    │  │  2. Inject history into OpenAI prompt:             │ │
    │  │     "Previous conversation:                        │ │
    │  │      User: Bharat ki details batao                 │ │
    │  │      Assistant: Bharat ka details...               │ │
    │  │      User: Bharat ka balance?"                     │ │
    │  │                                                     │ │
    │  │  3. Extract intent: CHECK_BALANCE                  │ │
    │  │     entities: {customer: "Bharat"}                 │ │
    │  └─────────────────────────────────────────────────────┘ │
    └──────────────────────┬────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │  LOG USER MESSAGE TO MEMORY              │
         │  conversationMemory.addUserMessage()     │
         │  {                                       │
         │    role: 'user',                         │
         │    content: 'Bharat ka balance?',        │
         │    intent: 'CHECK_BALANCE',              │
         │    entities: {customer: 'Bharat'},       │
         │    timestamp: Date                       │
         │  }                                       │
         └─────────────┬───────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────┐
        │   BUSINESS ENGINE EXECUTION              │
        │   - Fetch customer: Bharat               │
        │   - Get balance: 5000                    │
        │   - Return result: {balance: 5000}       │
        └─────────────┬────────────────────────────┘
                      │
                      ▼
    ┌────────────────────────────────────────────────────────┐
    │        RESPONSE GENERATION (with memory)               │
    │  ┌──────────────────────────────────────────────────┐ │
    │  │  1. Get conversation history (last 6 messages)   │ │
    │  │     conversationMemory.getFormattedContext()     │ │
    │  │                                                  │ │
    │  │  2. Inject history into OpenAI prompt:          │ │
    │  │     "Previous conversation:                     │ │
    │  │      User: Bharat ki details batao              │ │
    │  │      Assistant: Bharat ka details...            │ │
    │  │      User: Bharat ka balance?                   │ │
    │  │                                                  │ │
    │  │  3. Generate response:                          │ │
    │  │     "Bharat ka balance 5000 hai"                │ │
    │  └──────────────────────────────────────────────────┘ │
    └──────────────────┬─────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────────────┐
         │  LOG ASSISTANT MESSAGE TO MEMORY         │
         │  conversationMemory.addAssistantMessage()│
         │  {                                       │
         │    role: 'assistant',                    │
         │    content: 'Bharat ka balance 5000 hai',│
         │    timestamp: Date                       │
         │  }                                       │
         └─────────────┬───────────────────────────┘
                       │
                       ▼
                ┌──────────────────┐
                │  TTS (Text to    │
                │  Speech) Output  │
                └────────┬─────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  USER HEARS RESPONSE   │
            └────────────────────────┘
```

## Memory Storage Structure

```
ConversationMemory Map
├── conversationId_1
│   ├── messages: [
│   │     {role: 'user', content: 'Bharat ki details?', intent: 'GET_CUSTOMER_INFO', ...},
│   │     {role: 'assistant', content: 'Bharat ka details: Name...', ...},
│   │     {role: 'user', content: 'Bharat ka balance?', intent: 'CHECK_BALANCE', ...},
│   │     {role: 'assistant', content: 'Bharat ka balance 5000 hai', ...},
│   │     ... (max 20 messages)
│   │   ]
│   ├── context: {
│   │     activeCustomerId: 'cust_123',
│   │     activeCustomerName: 'Bharat'
│   │   }
│   └── lastActivity: 2024-01-15T10:30:00Z
│
├── conversationId_2
│   ├── messages: [...]
│   ├── context: {...}
│   └── lastActivity: 2024-01-15T10:25:00Z
│
└── ... (auto-cleanup after 30 min inactivity)
```

## Multi-Turn Conversation Example

```
┌─────────────────────────────────────────────────────────────────────┐
│ Turn 1: Initial Query                                               │
├─────────────────────────────────────────────────────────────────────┤
│ User: "Bharat ka balance kitna hai?"                                │
│                                                                     │
│ Memory State BEFORE:                                                │
│   messages: []                                                      │
│                                                                     │
│ Intent Extraction:                                                  │
│   Intent: CHECK_BALANCE                                             │
│   Entities: {customer: "Bharat"}                                    │
│                                                                     │
│ Response: "Bharat ka balance 5000 hai"                              │
│                                                                     │
│ Memory State AFTER:                                                 │
│   messages: [                                                       │
│     {role: 'user', content: 'Bharat ka balance kitna hai?'},        │
│     {role: 'assistant', content: 'Bharat ka balance 5000 hai'}      │
│   ]                                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Turn 2: Follow-up Without Customer Name                            │
├─────────────────────────────────────────────────────────────────────┤
│ User: "Usko 500 add karo"                                           │
│                                                                     │
│ Memory State:                                                       │
│   messages: [                                                       │
│     {role: 'user', content: 'Bharat ka balance kitna hai?'},        │
│     {role: 'assistant', content: 'Bharat ka balance 5000 hai'}      │
│   ]                                                                 │
│                                                                     │
│ Intent Extraction (WITH HISTORY):                                   │
│   OpenAI sees: "Previous conversation:                              │
│                 User: Bharat ka balance kitna hai?                  │
│                 Assistant: Bharat ka balance 5000 hai               │
│                 User: Usko 500 add karo"                            │
│                                                                     │
│   Intent: ADD_CREDIT                                                │
│   Entities: {customer: "Bharat", amount: 500} ← Resolved "usko"!   │
│                                                                     │
│ Response: "Theek hai. Bharat ko 500 add kar diya. Ab 5500 hai."    │
│                                                                     │
│ Memory State AFTER:                                                 │
│   messages: [                                                       │
│     {role: 'user', content: 'Bharat ka balance kitna hai?'},        │
│     {role: 'assistant', content: 'Bharat ka balance 5000 hai'},     │
│     {role: 'user', content: 'Usko 500 add karo'},                   │
│     {role: 'assistant', content: 'Theek hai. Bharat ko 500...'}     │
│   ]                                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Turn 3: Implicit Question                                          │
├─────────────────────────────────────────────────────────────────────┤
│ User: "Kitna ho gaya?" (How much now?)                              │
│                                                                     │
│ Memory State: [Previous 4 messages]                                 │
│                                                                     │
│ Intent Extraction (WITH HISTORY):                                   │
│   OpenAI sees full previous dialogue context                        │
│                                                                     │
│   Intent: CHECK_BALANCE                                             │
│   Entities: {customer: "Bharat"} ← Inferred from context!           │
│                                                                     │
│ Response: "Bharat ka balance ab 5500 hai"                           │
│                                                                     │
│ Memory State AFTER:                                                 │
│   messages: [... 6 messages total]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Integration Points

### 1. WebSocket Handler (enhanced-handler.ts)
```typescript
// Receives voice transcript
async processFinalTranscript(sessionId, text) {
  
  // Extract intent WITH conversation context
  const intent = await openaiService.extractIntent(
    normalizedText, 
    text, 
    session.conversationSessionId  // ← Conversation ID
  );
  
  // LOG USER MESSAGE (with intent + entities)
  if (session.conversationSessionId) {
    conversationMemory.addUserMessage(
      session.conversationSessionId,
      normalizedText,
      intent.intent,
      intent.entities
    );
  }
  
  // Execute business logic
  const result = await businessEngine.execute(...);
  
  // Generate response WITH conversation context
  const response = await openaiService.generateResponse(
    result, 
    intent.intent, 
    session.conversationSessionId  // ← Conversation ID
  );
  
  // LOG ASSISTANT MESSAGE
  if (session.conversationSessionId) {
    conversationMemory.addAssistantMessage(
      session.conversationSessionId,
      response
    );
  }
}
```

### 2. OpenAI Service (openai.service.ts)
```typescript
async extractIntent(transcript, rawText, conversationId) {
  
  // GET CONVERSATION HISTORY
  let conversationContext = '';
  if (conversationId) {
    conversationContext = conversationMemory.getFormattedContext(
      conversationId, 
      6  // Last 6 messages
    );
  }
  
  // INJECT INTO PROMPT
  const systemPrompt = `You are an intent extraction system...
  
  ${conversationContext}
  
  When extracting intent, consider the conversation history above...`;
  
  // Call OpenAI
  const response = await this.client.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript }
    ]
  });
}
```

### 3. Conversation Memory Service (conversation-memory.service.ts)
```typescript
class ConversationMemoryService {
  private memory: Map<conversationId, ConversationMemory> = new Map();
  
  addUserMessage(conversationId, message, intent, entities) {
    const memory = this.getOrCreateMemory(conversationId);
    memory.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
      intent,
      entities
    });
    
    // Keep only last 20 messages
    if (memory.messages.length > 20) {
      memory.messages.shift();
    }
  }
  
  getFormattedContext(conversationId, limit = 6): string {
    const memory = this.memory.get(conversationId);
    if (!memory) return '';
    
    const recentMessages = memory.messages.slice(-limit);
    
    let context = 'Previous conversation:\n';
    for (const msg of recentMessages) {
      context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    
    return context;
  }
}
```

## Cleanup Process

```
Every 10 minutes:
┌────────────────────────────────────────┐
│  conversationMemory.cleanupExpiredMemory() │
└──────────────┬─────────────────────────┘
               │
               ▼
    For each conversation in memory:
    ┌────────────────────────────────────┐
    │ Check: lastActivity > 30 min ago? │
    └──────────┬─────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
        Yes         No
         │           │
         ▼           ▼
    ┌────────┐   ┌────────┐
    │ Delete │   │  Keep  │
    └────────┘   └────────┘
```

## Memory Limits & TTL

```
┌──────────────────────────────────────────────────────────┐
│ Conversation Memory Configuration                        │
├──────────────────────────────────────────────────────────┤
│ Max messages per conversation: 20                        │
│ Max message history for context: 6 (last 6 messages)     │
│ Time-to-live (TTL): 30 minutes of inactivity            │
│ Cleanup interval: 10 minutes                             │
│ Storage: In-memory (no database persistence)             │
└──────────────────────────────────────────────────────────┘
```

This architecture enables natural multi-turn conversations while maintaining reasonable memory usage and automatic cleanup!
