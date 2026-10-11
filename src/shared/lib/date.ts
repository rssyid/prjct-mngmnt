import { format, parseISO, startOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';

export function toBusinessDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseBusinessDate(dateStr: string): Date {
  return parseISO(dateStr);
}

export function formatBusinessDate(dateInput: Date | string): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';
  return format(d, 'd MMM yyyy', { locale: id });
}

export function getWeekStart(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  // Monday is weekStartsOn: 1
  const monday = startOfWeek(d, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function getCurrentWibDate(): Date {
  return new Date();
}
