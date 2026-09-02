/**
 * The home app renders one dashboard per extension assigned to the
 * `homepage-dashboard-slot`, keyed off the `name` in the extension's meta.
 * That name is also the last segment of the dashboard's URL, so this dashboard
 * lives at `/openmrs/spa/home/audit`.
 */
export const dashboardMeta = {
  name: 'audit',
  slot: 'audit-dashboard-slot',
  title: 'Audit',
};
