"use strict";
/**
 * Shared formatting helpers for mobile screens.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.toFloat = toFloat;
function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}
function formatCurrency(amount) {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(isNaN(n) ? 0 : n);
}
function formatDate(date) {
    if (!date)
        return '—';
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date));
}
function formatDateTime(date) {
    if (!date)
        return '—';
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}
function toFloat(v) {
    const n = parseFloat(String(v ?? 0));
    return isNaN(n) ? 0 : n;
}
//# sourceMappingURL=utils.js.map