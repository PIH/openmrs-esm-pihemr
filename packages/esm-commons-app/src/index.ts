/**
 * This is the entrypoint file of the application. It communicates the
 * important features of this microfrontend to the app shell. It
 * connects the app shell to the React application(s) that make up this
 * microfrontend.
 */

import { getAsyncLifecycle } from '@openmrs/esm-framework';

const moduleName = '@pih/esm-commons-app';
const options = {
  featureName: 'commons',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

// export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const o2VisitSummaryWorkspaceSideRailIcon = getAsyncLifecycle(
  () => import('./ward-app/o2-visit-summary-action-button.extension'),
  options,
);

export const o2VisitSummaryWorkspace = getAsyncLifecycle(
  () => import('./ward-app/o2-visit-summary-workspace.component'),
  options,
);

export function startupApp() {}
