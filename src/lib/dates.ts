/**
 * Returns YYYY-MM-DD for the user's local date, matching how dates are stored in the DB.
 * Using toISOString() would return UTC, producing off-by-one bugs for users not in UTC.
 */
export function todayLocal(): string {
  return new Date().toLocaleDateString('en-CA')
}
