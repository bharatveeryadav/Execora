/** Format amount as Indian Rupee string */
export function fmtRupee(n: number | string | null | undefined): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Short rupee (K/L) */
export function fmtRupeeShort(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return fmtRupee(n);
}

/** Format date as "15 Mar 2026" */
export function fmtDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format date as "15 Mar" */
export function fmtDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Format time as "10:30 AM" */
export function fmtTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Relative time: "2m ago", "1h ago", "yesterday" */
export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/** Today's date as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Amount in Indian words */
export function amountInWords(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function toWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + units[n % 10] + ' ';
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 1_00_000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 1_00_00_000) return toWords(Math.floor(n / 1_00_000)) + 'Lakh ' + toWords(n % 1_00_000);
    return toWords(Math.floor(n / 1_00_00_000)) + 'Crore ' + toWords(n % 1_00_00_000);
  }

  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let result   = toWords(rupees).trim();
  if (!result) result = 'Zero';
  result += ' Rupees';
  if (paise > 0) result += ' and ' + toWords(paise).trim() + ' Paise';
  result += ' Only';
  return result;
}

/** Invoice status colors */
export function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':      return { bg: '#dcfce7', text: '#16a34a' };
    case 'partial':   return { bg: '#fef9c3', text: '#ca8a04' };
    case 'pending':   return { bg: '#dbeafe', text: '#1d4ed8' };
    case 'cancelled': return { bg: '#fee2e2', text: '#dc2626' };
    case 'draft':     return { bg: '#f1f5f9', text: '#64748b' };
    default:          return { bg: '#f1f5f9', text: '#64748b' };
  }
}

/** Initials from name */
export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
