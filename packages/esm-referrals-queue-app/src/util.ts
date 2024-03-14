import moment from 'moment';

// We use UTC for the present TZ because the dates in the data
// are all midnight Eastern Time, which lines up with UTC
// but not with, e.g. Pacific Time.
export function formatDate(strDate: string) {
  const date = moment.utc(strDate);
  const today = moment.utc(new Date());
  if (date.date() === today.date() && date.month() === today.month() && date.year() === today.year()) {
    return moment().calendar().split(' ')[0]; // locale-specific 'Today'
  } else if (date.year() === today.year()) {
    return date.format('DD MMM');
  } else {
    return date.format('DD MMM YYYY');
  }
}
