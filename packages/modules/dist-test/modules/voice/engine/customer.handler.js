"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTotalPendingAmount = executeTotalPendingAmount;
exports.executeListCustomerBalances = executeListCustomerBalances;
exports.executeCheckBalance = executeCheckBalance;
exports.executeCreateCustomer = executeCreateCustomer;
exports.executeUpdateCustomer = executeUpdateCustomer;
exports.executeGetCustomerInfo = executeGetCustomerInfo;
exports.executeDeleteCustomerData = executeDeleteCustomerData;
/**
 * Customer intent handlers.
 * Covers: CREATE_CUSTOMER, UPDATE_CUSTOMER, UPDATE_CUSTOMER_PHONE,
 *         GET_CUSTOMER_INFO, DELETE_CUSTOMER_DATA, CHECK_BALANCE,
 *         LIST_CUSTOMER_BALANCES, TOTAL_PENDING_AMOUNT
 */
const core_1 = require("@execora/core");
const customer_service_1 = require("../../customer/customer.service");
const conversation_1 = require("../conversation");
const core_2 = require("@execora/core");
const openai_1 = require("../../../integrations/openai");
const shared_1 = require("./shared");
// ── TOTAL_PENDING_AMOUNT ─────────────────────────────────────────────────────
async function executeTotalPendingAmount() {
    const totalPending = await customer_service_1.customerService.getTotalPendingAmount();
    return {
        success: true,
        message: `Total pending amount hai ₹${totalPending}.`,
        data: { totalPending },
    };
}
// ── LIST_CUSTOMER_BALANCES ───────────────────────────────────────────────────
async function executeListCustomerBalances() {
    const customers = await customer_service_1.customerService.getAllCustomersWithPendingBalance();
    if (!customers.length) {
        return { success: true, message: 'Sab customers ka balance zero hai.', data: { customers: [] } };
    }
    const total = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
    return {
        success: true,
        message: `Total ${customers.length} customers ke paas ₹${total} baki hai.`,
        data: {
            customers: customers.map((c) => ({ name: c.name, balance: c.balance, landmark: c.landmark || '', phone: c.phone || '' })),
            totalPending: total,
        },
    };
}
// ── CHECK_BALANCE ────────────────────────────────────────────────────────────
async function executeCheckBalance(entities, conversationId) {
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    const balance = conversationId
        ? await customer_service_1.customerService.getBalanceFast(customer.id, conversationId)
        : await customer_service_1.customerService.getBalance(customer.id);
    return {
        success: true,
        message: `${customer.name} ka balance ₹${balance} hai`,
        data: { customer: customer.name, balance },
    };
}
// ── CREATE_CUSTOMER ──────────────────────────────────────────────────────────
async function executeCreateCustomer(entities, conversationId) {
    const name = entities.name || entities.customer;
    if (!name) {
        return { success: false, message: 'Customer name is required', error: 'MISSING_NAME' };
    }
    const { phone, nickname, landmark, notes, amount } = entities;
    if (conversationId) {
        const result = await customer_service_1.customerService.createCustomerFast(name, conversationId);
        if (!result.success) {
            return {
                success: false,
                message: result.message,
                error: result.duplicateFound ? 'DUPLICATE_FOUND' : 'CUSTOMER_CREATE_FAILED',
                data: result.suggestions ? { suggestions: result.suggestions } : undefined,
            };
        }
        if (amount && result.customer) {
            await customer_service_1.customerService.updateBalance(result.customer.id, Number(amount));
        }
        if (result.customer) {
            customer_service_1.customerService.setActiveCustomer(conversationId, result.customer.id);
            await conversation_1.conversationMemory.setActiveCustomer(conversationId, result.customer.id, result.customer.name);
        }
        return {
            success: true,
            message: result.message,
            data: { customerId: result.customer?.id, name: result.customer?.name, balance: amount ? Number(amount) : result.customer?.balance },
        };
    }
    const customer = await customer_service_1.customerService.createCustomer({ name, phone, nickname, landmark, notes });
    if (amount)
        await customer_service_1.customerService.updateBalance(customer.id, Number(amount));
    return {
        success: true,
        message: `Customer ${name} created`,
        data: { customerId: customer.id, name: customer.name },
    };
}
// ── UPDATE_CUSTOMER / UPDATE_CUSTOMER_PHONE ──────────────────────────────────
const FIELD_MAP = {
    phone: 'phone', alternatePhone: 'alternatePhone', email: 'email', name: 'name',
    nickname: 'nickname', landmark: 'landmark', area: 'area', city: 'city',
    state: 'state', pincode: 'pincode', addressLine1: 'addressLine1', addressLine2: 'addressLine2',
    gstin: 'gstin', pan: 'pan', notes: 'notes',
};
const FIELD_LABELS = {
    phone: 'Phone', alternatePhone: 'Alternate phone', email: 'Email', name: 'Naam',
    nickname: 'Nickname', landmark: 'Landmark', area: 'Area', city: 'City',
    state: 'State', pincode: 'Pincode', addressLine1: 'Address', addressLine2: 'Address line 2',
    gstin: 'GSTIN', pan: 'PAN', notes: 'Notes',
};
async function executeUpdateCustomer(entities, conversationId) {
    try {
        const updates = {};
        for (const [key, dbKey] of Object.entries(FIELD_MAP)) {
            if (entities[key] !== undefined && entities[key] !== null && entities[key] !== '') {
                updates[dbKey] = entities[key];
            }
        }
        if (Object.keys(updates).length === 0) {
            return { success: false, message: 'Kya update karna hai? Phone, email, naam, address, GSTIN — kuch batao.', error: 'NO_FIELDS_PROVIDED' };
        }
        const { customer, multiple } = await (0, shared_1.resolveCustomer)(entities, conversationId);
        if (!customer)
            return { success: false, message: 'Customer nahi mila.', error: 'CUSTOMER_NOT_FOUND' };
        if (multiple)
            return { success: false, message: `Kai customers hain "${entities.customer}" naam se. Landmark ke saath batao.`, error: 'AMBIGUOUS_CUSTOMER' };
        const updated = await customer_service_1.customerService.updateCustomer(customer.id, updates);
        if (!updated)
            return { success: false, message: 'Update nahi ho saka. Dobara try karo.', error: 'UPDATE_FAILED' };
        if (conversationId) {
            customer_service_1.customerService.setActiveCustomer(conversationId, customer.id);
            customer_service_1.customerService.invalidateConversationCache(conversationId);
        }
        const lines = Object.entries(updates)
            .map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${k === 'phone' ? openai_1.openaiService.phoneToWords(String(v)) : v}`)
            .join('\n');
        return {
            success: true,
            message: `${customer.name} ki details update ho gayi:\n${lines}`,
            data: { customerId: customer.id, updatedFields: updates },
        };
    }
    catch (error) {
        core_1.logger.error({ error, entities, conversationId }, 'Update customer execution failed');
        return { success: false, message: 'Customer update nahi ho saka.', error: error.message };
    }
}
// ── GET_CUSTOMER_INFO ────────────────────────────────────────────────────────
async function executeGetCustomerInfo(entities, conversationId) {
    try {
        const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
        if (resolution.multiple) {
            return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
        }
        if (!resolution.customer) {
            return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
        }
        const customer = resolution.customer;
        const balance = conversationId
            ? await customer_service_1.customerService.getBalanceFast(customer.id, conversationId)
            : await customer_service_1.customerService.getBalance(customer.id);
        let phoneWords = 'Nahi hai';
        if (customer.phone) {
            try {
                phoneWords = openai_1.openaiService.phoneToWords(customer.phone);
            }
            catch (err) {
                core_1.logger.error({ err, phone: customer.phone }, 'Phone conversion failed');
                phoneWords = customer.phone;
            }
        }
        const infoMessage = [
            `${customer.name} ki puri jankari mil gayi hai.`,
            `- Naam: ${customer.name}`,
            `- Phone: ${phoneWords}`,
            customer.nickname ? `- Nickname: ${customer.nickname}` : '',
            customer.landmark ? `- Landmark: ${customer.landmark}` : '',
            `- Balance: ${balance} rupees`,
            `Kya aapko isse kuch karna hai?`,
        ].filter(Boolean).join('\n');
        return {
            success: true,
            message: infoMessage,
            data: { customerId: customer.id, name: customer.name, phone: customer.phone || null, nickname: customer.nickname || null, landmark: customer.landmark || null, balance },
        };
    }
    catch (error) {
        core_1.logger.error({ error, entities, conversationId }, 'Get customer info execution failed');
        return { success: false, message: 'Failed to retrieve customer information', error: error.message };
    }
}
// ── DELETE_CUSTOMER_DATA ─────────────────────────────────────────────────────
async function executeDeleteCustomerData(entities, conversationId) {
    try {
        const isAdmin = entities?.operatorRole === 'admin' || !!entities?.adminEmail;
        if (!isAdmin)
            return { success: false, message: 'Yeh admin ke liye hai', error: 'UNAUTHORIZED' };
        const adminEmail = entities?.adminEmail || process.env.ADMIN_EMAIL;
        const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
        if (!resolution.customer)
            return { success: false, message: 'Customer not found', error: 'NOT_FOUND' };
        const customer = resolution.customer;
        const confirmPhrase = (entities?.confirmation || '').toLowerCase();
        // Step 1: Send OTP if not yet provided
        if (!confirmPhrase.match(/\d{6}/)) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            core_1.logger.info({ customerId: customer.id, adminEmail, otp }, 'Delete: Sending OTP');
            try {
                await core_2.emailService.sendAdminDeletionOtpEmail(adminEmail, customer.name, otp);
            }
            catch (e) {
                core_1.logger.error({ error: e.message }, 'Delete: OTP email failed');
            }
            return { success: false, message: `OTP sent to ${adminEmail}`, error: 'OTP_SENT', data: { otp, adminEmail } };
        }
        // Step 2: Delete after OTP confirmed
        core_1.logger.info({ customerId: customer.id }, 'Delete: OTP confirmed, deleting');
        const result = await customer_service_1.customerService.deleteCustomerAndAllData(customer.id);
        if (!result.success)
            return { success: false, message: 'Delete failed', error: result.error };
        core_1.logger.info({ customerId: customer.id, adminEmail }, 'Delete: Customer data deleted by admin');
        return { success: true, message: `${customer.name} ke data permanently delete ho gaye`, data: result };
    }
    catch (error) {
        core_1.logger.error({ error }, 'Delete: Exception');
        return { success: false, message: 'Delete operation failed', error: error.message };
    }
}
//# sourceMappingURL=customer.handler.js.map