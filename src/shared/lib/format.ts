import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format nominal rupiah Indonesia (contoh: Rp1.250.000.000)
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp0';

  const formatted = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp${formatted}`;
}

/**
 * Format persen Indonesia (contoh: 65,4%)
 */
export function formatPercent(value: number | string, decimals = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,0%';

  const formatted = num.toFixed(decimals).replace('.', ',');
  return `${formatted}%`;
}

/**
 * Format tanggal Indonesia (contoh: 10 Okt 2026)
 */
export function formatDate(dateInput: Date | string): string {
  if (!dateInput) return '-';
  const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return '-';

  return format(dateObj, 'd MMM yyyy', { locale: id });
}
