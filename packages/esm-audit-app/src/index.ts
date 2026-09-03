/**
 * This is the entrypoint file of the application. It communicates the
 * important features of this microfrontend to the app shell. It
 * connects the app shell to the React application(s) that make up this
 * microfrontend.
 */

import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle, registerBreadcrumbs } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { dashboardMeta } from './dashboard.meta';
import DashboardLink from './dashboard-link.component';

const moduleName = '@pih/esm-audit-app';
const options = {
  featureName: 'audit',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const auditDashboardLink = getSyncLifecycle(DashboardLink, options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
  registerBreadcrumbs([
    {
      path: `${window.spaBase}/home/${dashboardMeta.name}`,
      title: dashboardMeta.title,
    },
  ]);
}
