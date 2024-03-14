/**
 * This is the entrypoint file of the application. It communicates the
 * important features of this microfrontend to the app shell. It
 * connects the app shell to the React application(s) that make up this
 * microfrontend.
 */

import { getAsyncLifecycle, defineConfigSchema, registerBreadcrumbs } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@pih/esm-referrals-queue-app';
const options = {
  featureName: 'referrals-queue',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
  registerBreadcrumbs([
    {
      path: `${window.spaBase}/referrals-queue`,
      title: 'Referrals Queue',
    },
  ]);
}
