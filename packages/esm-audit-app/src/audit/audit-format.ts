import { formatDate, formatDatetime, parseDate } from '@openmrs/esm-framework';
import { type OpenmrsResourceRef } from '../types';

/** Formats a REST date, without the "Today" shorthand — an audit trail wants literal dates. */
export function formatAuditDate(date: string | undefined): string {
  return date ? formatDate(parseDate(date), { mode: 'wide', time: false, noToday: true }) : '';
}

export function formatAuditDatetime(date: string | undefined): string {
  return date ? formatDatetime(parseDate(date), { mode: 'wide', noToday: true }) : '';
}

/**
 * Renders the "who and when" of an audit entry, e.g. `Cos John — 01 Sep 2026, 11:09 AM`. The user
 * reference the API returns for `creator`, `changedBy` and `voidedBy` displays as the person's
 * name, or as the username where the account has no person name.
 */
export function formatUserAndDate(user: OpenmrsResourceRef | undefined, date: string | undefined): string {
  const formattedDate = formatAuditDatetime(date);
  if (user?.display && formattedDate) {
    return `${user.display} — ${formattedDate}`;
  }
  return user?.display ?? formattedDate;
}
