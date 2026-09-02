import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Audit from './audit/audit.component';

/**
 * Extensions are mounted as their own React root, so this dashboard does not inherit the home
 * app's router context and needs its own in order to keep the audit trail's position — the
 * selected patient and encounter — in the URL's query string.
 */
export default function Root() {
  return (
    <BrowserRouter>
      <Audit />
    </BrowserRouter>
  );
}
