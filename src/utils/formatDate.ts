import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'

export function getDateLocale(language: string) {
  return language === 'pl' ? pl : enUS
}

export function formatDate(
  dateStr: string,
  language = 'pl',
  formatStr?: string
): string {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  const locale = getDateLocale(language)
  const pattern = formatStr ?? (language === 'pl' ? 'dd.MM.yyyy' : 'MM/dd/yyyy')
  return format(date, pattern, { locale })
}

export function formatDateShort(dateStr: string, language = 'pl'): string {
  const date = parseISO(dateStr)
  const locale = getDateLocale(language)
  return format(date, language === 'pl' ? 'd MMM' : 'MMM d', { locale })
}

export function formatDateGroup(dateStr: string, language = 'pl'): string {
  const date = parseISO(dateStr)
  const locale = getDateLocale(language)
  if (isToday(date)) return language === 'pl' ? 'Dziś' : 'Today'
  if (isYesterday(date)) return language === 'pl' ? 'Wczoraj' : 'Yesterday'
  return format(date, language === 'pl' ? 'd MMMM yyyy' : 'MMMM d, yyyy', { locale })
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function startOfMonthISO(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function endOfMonthISO(year: number, month: number): string {
  const d = new Date(year, month, 0) // last day of month
  return toISODate(d)
}
