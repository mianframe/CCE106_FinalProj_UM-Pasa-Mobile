/**
 * Date and time formatting utilities for UM-Pasa.
 * Enforces Philippine Standard Time (PST / Asia/Manila, UTC+8) across all platforms.
 */

const PHILIPPINE_TIMEZONE = 'Asia/Manila';
const LOCALE = 'en-PH';

/**
 * Formats a timestamp into a full date and time string in Philippine Time.
 * Example: "Oct 10, 2026, 3:30 PM"
 */
export function formatPhilippineDateTime(
  timestamp: string | number | Date | null | undefined,
  fallback = 'Not scheduled'
): string {
  if (!timestamp) return fallback;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  return date.toLocaleString(LOCALE, {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date-only timestamp (or rental due date) into Philippine Time.
 * Example: "Oct 10, 2026"
 */
export function formatPhilippineDate(
  timestamp: string | number | Date | null | undefined,
  fallback = 'Not set'
): string {
  if (!timestamp) return fallback;
  // Handle "YYYY-MM-DD" date strings without timezone shifts
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp.trim())) {
    const [year, month, day] = timestamp.trim().split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  return date.toLocaleDateString(LOCALE, {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a timestamp into a time-only string in Philippine Time.
 * Example: "3:30 PM"
 */
export function formatPhilippineTime(
  timestamp: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!timestamp) return fallback;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  return date.toLocaleTimeString(LOCALE, {
    timeZone: PHILIPPINE_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parses an HTML5 datetime-local string ("YYYY-MM-DDTHH:mm") as local device time,
 * avoiding browser-dependent timezone assumptions.
 */
export function parseWebDateTimeLocal(value: string): Date | null {
  if (!value || typeof value !== 'string') return null;
  const [datePart, timePart] = value.trim().split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Formats a Date object into a "YYYY-MM-DDTHH:mm" string for HTML5 input[type=datetime-local].
 */
export function toWebDateTimeLocalString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns true if the given date is in the future.
 */
export function isFutureDate(date: Date | null | undefined): boolean {
  if (!date) return false;
  return date.getTime() > Date.now();
}

/**
 * Formats a timestamp into a friendly relative time string.
 * Examples: "Just now", "5 min ago", "2 hrs ago", "Yesterday", "3 days ago", "Oct 8"
 */
export function formatRelativeTime(
  timestamp: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!timestamp) return fallback;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatPhilippineDate(date);
}
