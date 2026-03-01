"use strict";
/**
 * In-memory ConversationMemoryService for unit testing.
 * Same public API as the real Redis-backed service, but uses plain Maps.
 * Import this in conversation.test.ts instead of the production service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationMemory = void 0;
// ── Inline fuzzy-match helpers (pure functions, no external deps) ─────────────
const PHONETIC_RULES = [
    [/aa|aaa/gi, 'a'],
    [/ee|ii/gi, 'i'],
    [/oo|uu/gi, 'u'],
    [/ai|ay|ey/gi, 'e'],
    [/au|aw|ow/gi, 'o'],
    [/bh/gi, 'b'],
    [/ph/gi, 'p'],
    [/th/gi, 't'],
    [/dh/gi, 'd'],
    [/kh/gi, 'k'],
    [/gh/gi, 'g'],
    [/ch/gi, 'c'],
    [/jh/gi, 'j'],
    [/tt|ṭ/gi, 't'],
    [/dd|ḍ/gi, 'd'],
    [/nn|ṇ/gi, 'n'],
    [/sh|ṣ|ś/gi, 's'],
    [/rr|ṛ/gi, 'r'],
    [/v/gi, 'w'],
    [/h$/gi, ''],
    [/([a-z])\1+/gi, '$1'],
];
const NICKNAME_MAP = {
    saurabh: ['sonu', 'sorabh'],
    rahul: ['raju', 'rahool'],
    rajesh: ['raju', 'raj'],
    priya: ['priyu', 'pari'],
    amit: ['amitbhai', 'amit bhai', 'mittu'],
    suresh: ['suri', 'suresh bhai'],
    ramesh: ['ramu', 'ramesh bhai'],
    ganesh: ['ganu', 'gannu', 'ganesha'],
    mahesh: ['mahi', 'mahesh bhai'],
    abhishek: ['abhi', 'abhishekh'],
    aditya: ['adi', 'aditay'],
    aniket: ['ani', 'anikett'],
    ankit: ['anki', 'ankitt'],
    arjun: ['arju', 'arjoon'],
    dinesh: ['dinu', 'dinesh bhai'],
    kiran: ['kiru'],
    mukesh: ['mukku', 'mukesh bhai'],
    prakash: ['prakash bhai'],
    rakesh: ['raki', 'rakesh bhai'],
    sachin: ['sachinbhai', 'sachi'],
    sandeep: ['sandy', 'sandip'],
    sanjay: ['sanju', 'sanjoy'],
    vijay: ['viju', 'vijju', 'bijay'],
    deepak: ['deepu', 'dipak', 'deepakbhai'],
    vivek: ['vicky', 'vivekh'],
    anita: ['anu', 'anitabhabhi'],
    kavita: ['kavi', 'kavitabhabhi'],
    meena: ['meenu', 'meenabhabhi'],
    neeta: ['neetu', 'neetabhabhi'],
    pooja: ['puja', 'pujabhabhi'],
    rekha: ['rekhabhabhi'],
    savita: ['savitabhabhi', 'savithri'],
    sunita: ['sunitabhabhi', 'suni'],
    krishna: ['krish', 'krishnanand', 'kishan'],
    lakshmi: ['laxmi', 'lakshimi'],
    venkatesh: ['venky', 'venkateshwar', 'venkat'],
    srinivas: ['srini', 'shreenivaas'],
    balaji: ['balajibhai'],
    murali: ['murlidhar', 'murlidharan'],
    bharat: ['bharath', 'bharatbhai'],
    gaurav: ['gaurab', 'gauravbhai'],
    harish: ['harischandra', 'harishbhai'],
};
const REVERSE_NICKNAME_MAP = (() => {
    const reverse = {};
    for (const [full, nicks] of Object.entries(NICKNAME_MAP)) {
        for (const nick of nicks)
            reverse[nick.toLowerCase()] = full;
    }
    return reverse;
})();
function phoneticNormalize(name) {
    let s = name.toLowerCase().trim()
        .replace(/\b(bhai|bhabhi|ji|sir|madam|sahab|saheb|bhaiya|didi|anna|akka)\b/gi, '')
        .trim();
    for (const [p, r] of PHONETIC_RULES)
        s = s.replace(p, r);
    return s.replace(/[^a-z0-9]/g, '');
}
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
}
function similarity(a, b) {
    const max = Math.max(a.length, b.length);
    return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}
function checkNickname(n1, n2) {
    const a = n1.toLowerCase(), b = n2.toLowerCase();
    if ((NICKNAME_MAP[a] || []).includes(b))
        return true;
    if ((NICKNAME_MAP[b] || []).includes(a))
        return true;
    const fa = REVERSE_NICKNAME_MAP[a], fb = REVERSE_NICKNAME_MAP[b];
    if (fa && fa === b)
        return true;
    if (fb && fb === a)
        return true;
    if (fa && fb && fa === fb)
        return true;
    return false;
}
function matchIndianName(query, target, threshold = 0.75) {
    const qn = query.toLowerCase().trim(), tn = target.toLowerCase().trim();
    if (qn === tn)
        return { score: 1.0, matched: target, matchType: 'exact' };
    if (checkNickname(qn, tn))
        return { score: 0.95, matched: target, matchType: 'nickname' };
    const qp = phoneticNormalize(query), tp = phoneticNormalize(target);
    if (qp === tp)
        return { score: 0.9, matched: target, matchType: 'phonetic' };
    if (tn.includes(qn) || qn.includes(tn)) {
        const s = Math.min(qn.length, tn.length) / Math.max(qn.length, tn.length);
        if (s >= threshold)
            return { score: s, matched: target, matchType: 'transliteration' };
    }
    const es = similarity(qn, tn);
    if (es >= threshold)
        return { score: es, matched: target, matchType: 'fuzzy' };
    const ps = similarity(qp, tp);
    if (ps >= threshold)
        return { score: ps * 0.9, matched: target, matchType: 'phonetic' };
    return null;
}
function isSamePerson(name1, name2) {
    const m = matchIndianName(name1, name2, 0.8);
    return m !== null && m.score >= 0.8;
}
function findBestMatch(query, candidates, threshold = 0.75) {
    let best = null;
    for (const c of candidates) {
        const m = matchIndianName(query, c, threshold);
        if (m && (!best || m.score > best.score))
            best = m;
    }
    return best;
}
// ── In-memory service ─────────────────────────────────────────────────────────
class InMemoryConversationMemoryService {
    store = new Map();
    get(convId) {
        if (!this.store.has(convId)) {
            this.store.set(convId, {
                messages: [],
                context: {},
                customerHistory: [],
                recentCustomers: {},
                turnCount: 0,
            });
        }
        return this.store.get(convId);
    }
    findExisting(data, name) {
        const exact = data.recentCustomers[name.toLowerCase()];
        if (exact)
            return exact;
        for (const c of Object.values(data.recentCustomers)) {
            if (isSamePerson(name, c.name))
                return c;
        }
        return null;
    }
    trackMention(data, id, name) {
        const existing = this.findExisting(data, name);
        if (existing) {
            existing.lastMentioned = new Date().toISOString();
            existing.mentionCount += 1;
            data.customerHistory = [
                ...data.customerHistory.filter((c) => c.name !== existing.name),
                existing,
            ];
        }
        else {
            const c = {
                id, name, lastMentioned: new Date().toISOString(), mentionCount: 1,
            };
            data.recentCustomers[name.toLowerCase()] = c;
            data.customerHistory.push(c);
        }
        if (data.customerHistory.length > 10) {
            const removed = data.customerHistory.shift();
            delete data.recentCustomers[removed.name.toLowerCase()];
        }
    }
    updateContextInData(data, customerName, updates) {
        const c = data.recentCustomers[customerName.toLowerCase()];
        if (!c)
            return;
        if (updates.balance !== undefined)
            c.latestBalance = updates.balance;
        if (updates.amount !== undefined)
            c.latestAmount = updates.amount;
        if (updates.intent !== undefined)
            c.latestIntent = updates.intent;
        c.lastMentioned = new Date().toISOString();
    }
    async addUserMessage(conversationId, message, intent, entities) {
        const data = this.get(conversationId);
        data.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString(), intent, entities });
        const name = entities?.customer || entities?.name;
        if (name && typeof name === 'string') {
            this.trackMention(data, entities.customerId || `temp_${name}`, name);
        }
        if (name && entities?.amount) {
            this.updateContextInData(data, name, { amount: entities.amount, intent });
        }
        if (data.messages.length > 20)
            data.messages = data.messages.slice(-20);
        data.turnCount += 1;
    }
    async addAssistantMessage(conversationId, message) {
        const data = this.get(conversationId);
        data.messages.push({ role: 'assistant', content: message, timestamp: new Date().toISOString() });
        if (data.messages.length > 20)
            data.messages = data.messages.slice(-20);
    }
    async getConversationHistory(conversationId, limit = 10) {
        return this.get(conversationId).messages.slice(-limit);
    }
    async setActiveCustomer(conversationId, customerId, customerName) {
        const data = this.get(conversationId);
        data.activeCustomer = { id: customerId, name: customerName };
        data.context.activeCustomerId = customerId;
        data.context.activeCustomerName = customerName;
        this.trackMention(data, customerId, customerName);
    }
    async getActiveCustomer(conversationId) {
        return this.get(conversationId).activeCustomer;
    }
    async getAllCustomersInContext(conversationId) {
        return [...this.get(conversationId).customerHistory].reverse();
    }
    async switchToPreviousCustomer(conversationId) {
        const data = this.get(conversationId);
        if (data.customerHistory.length < 2)
            return null;
        const prev = data.customerHistory[data.customerHistory.length - 2];
        data.activeCustomer = { id: prev.id, name: prev.name };
        data.context.activeCustomerId = prev.id;
        data.context.activeCustomerName = prev.name;
        return prev;
    }
    async switchToCustomerByName(conversationId, customerName) {
        const data = this.get(conversationId);
        let customer = data.recentCustomers[customerName.toLowerCase()];
        if (!customer) {
            const candidates = Object.values(data.recentCustomers);
            const best = findBestMatch(customerName, candidates.map((c) => c.name), 0.7);
            if (best)
                customer = candidates.find((c) => c.name === best.matched);
        }
        if (!customer)
            return null;
        data.activeCustomer = { id: customer.id, name: customer.name };
        data.context.activeCustomerId = customer.id;
        data.context.activeCustomerName = customer.name;
        data.customerHistory = [
            ...data.customerHistory.filter((c) => c.name !== customer.name),
            customer,
        ];
        return customer;
    }
    async findMatchingCustomers(conversationId, customerName, threshold = 0.7) {
        const data = this.get(conversationId);
        const candidates = Object.values(data.recentCustomers);
        return candidates
            .map((c) => {
            const m = matchIndianName(customerName, c.name, threshold);
            return m ? { ...m, customer: c } : null;
        })
            .filter((m) => m !== null)
            .sort((a, b) => b.score - a.score);
    }
    async updateCustomerContext(conversationId, customerName, updates) {
        this.updateContextInData(this.get(conversationId), customerName, updates);
    }
    async getContextSummary(conversationId) {
        const data = this.get(conversationId);
        let summary = '';
        if (data.customerHistory.length > 0) {
            const recent = data.customerHistory.slice(-3).reverse();
            summary += '\n\nRecent customers in this conversation:\n';
            for (const c of recent) {
                summary += `- ${c.name}`;
                if (c.latestBalance !== undefined)
                    summary += ` (balance: ${c.latestBalance})`;
                if (c.latestAmount !== undefined)
                    summary += ` (amount: ${c.latestAmount})`;
                if (data.activeCustomer?.name === c.name)
                    summary += ' [CURRENT]';
                summary += '\n';
            }
        }
        return summary;
    }
    async getFormattedContext(conversationId, limit = 6) {
        const history = await this.getConversationHistory(conversationId, limit);
        const contextSummary = await this.getContextSummary(conversationId);
        if (history.length === 0)
            return contextSummary || '';
        const formatted = history
            .map((m) => m.role === 'user'
            ? `User: ${m.content}${m.intent ? ` [Intent: ${m.intent}]` : ''}`
            : `Assistant: ${m.content}`)
            .join('\n');
        return `\n\nPrevious conversation:\n${formatted}${contextSummary}\n`;
    }
    async clearMemory(conversationId) {
        this.store.delete(conversationId);
    }
    async setContext(conversationId, key, value) {
        this.get(conversationId).context[key] = value;
    }
    async getContext(conversationId, key) {
        return this.get(conversationId).context[key];
    }
    async getFullContext(conversationId) {
        return this.get(conversationId).context;
    }
    async getTurnCount(conversationId) {
        return this.get(conversationId).turnCount;
    }
    async getStats() {
        return { activeConversations: this.store.size };
    }
}
exports.conversationMemory = new InMemoryConversationMemoryService();
//# sourceMappingURL=in-memory-conversation.js.map