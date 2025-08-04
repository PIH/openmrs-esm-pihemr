/**
 * This is the entrypoint file of the application. It communicates the
 * important features of this microfrontend to the app shell. It
 * connects the app shell to the React application(s) that make up this
 * microfrontend.
 */

import { getAsyncLifecycle, defineConfigSchema } from "@openmrs/esm-framework";
import { configSchema } from "./config-schema";

const moduleName = '@pih/esm-oncology-patient-status-app';
const options = {
  featureName: 'Oncology Patient Status',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const root = getAsyncLifecycle(() => import('./patient-status-widget'), options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

