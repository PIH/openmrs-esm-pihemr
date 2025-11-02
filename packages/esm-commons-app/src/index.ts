/**
 * This is the entrypoint file of the application. It communicates the
 * important features of this microfrontend to the app shell. It
 * connects the app shell to the React application(s) that make up this
 * microfrontend.
 */

import { getAsyncLifecycle } from '@openmrs/esm-framework';

const moduleName = '@pih/esm-commons-app';

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

// export const root = getAsyncLifecycle(() => import('./root.component'), options);

export const o2VisitSummaryWorkspaceSideRailIcon = getAsyncLifecycle(
  () => import('./ward-app/o2-visit-summary-action-button.extension'),
  { featureName: 'o2VisitSummaryWorkspaceSideRailIcon', moduleName },
);

export const o2VisitSummaryWorkspace = getAsyncLifecycle(
  () => import('./ward-app/o2-visit-summary-workspace.component'),
  { featureName: 'o2VisitSummaryWorkspace', moduleName },
);

export const o2VitalSignsWorkspaceSideRailIcon = getAsyncLifecycle(
  () => import('./ward-app/o2-vital-signs-action-button.extension'),
  { featureName: 'o2VitalSignsWorkspaceSideRailIcon', moduleName },
);

export const o2VitalSignsWorkspace = getAsyncLifecycle(() => import('./ward-app/o2-vital-signs-workspace.component'), {
  featureName: 'o2VitalSignsWorkspace',
  moduleName,
});

export const o2PregnancyInfantDashboard = getAsyncLifecycle(
  () => import('./ward-app/o2-pregnancy-infant-dashboard.extension'),
  { featureName: 'o2PregnancyInfantDashboard', moduleName },
);

export const maternalTriageFormWorkspace = getAsyncLifecycle(
  () => import('./service-queues-app/maternal-triage-form.workspace'),
  { featureName: 'maternalTriageFormWorkspace', moduleName },
);

export const triageWaitingQueueActions = getAsyncLifecycle(
  () => import('./service-queues-app/maternal-triage-queue-actions.extension'),
  { featureName: 'triageWaitingQueueActions', moduleName },
);

export const root = getAsyncLifecycle(() => import('./root.component'), { featureName: 'root', moduleName });

export function startupApp() {}
