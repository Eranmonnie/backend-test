/**
 * Utility functions for date formatting in UTC timezone
 */

/**
 * Converts a Date object to ISO 8601 string in UTC
 * @param date - Date object or ISO string
 * @returns ISO 8601 formatted string in UTC (e.g., "2024-01-15T14:30:00.000Z")
 */
export function toUTC(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
}

/**
 * Formats Prisma model response to ensure all date fields are in UTC ISO format
 * @param data - Object containing date fields
 * @returns Object with formatted dates
 */
export function formatDatesUTC<T extends Record<string, any>>(data: T): T {
  const formatted = { ...data };
  
  for (const key in formatted) {
    const value: any = formatted[key];
    if (value instanceof Date) {
      formatted[key] = toUTC(value) as any;
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      formatted[key] = formatDatesUTC(value);
    }
  }
  
  return formatted;
}

/**
 * Parse date string and return Date object
 * @param dateString - Date string in any valid format
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  return date;
}
