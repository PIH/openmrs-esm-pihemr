import React, { useMemo } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';
import { dashboardMeta } from './dashboard.meta';

function AuditLink() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isActive = useMemo(
    () =>
      pathname
        .split('/')
        .map((segment) => decodeURIComponent(segment))
        .includes(dashboardMeta.name),
    [pathname],
  );

  return (
    <ConfigurableLink
      to={`${window.spaBase}/home/${dashboardMeta.name}`}
      className={`cds--side-nav__link ${isActive ? 'active-left-nav-link' : ''}`}>
      {t('audit', dashboardMeta.title)}
    </ConfigurableLink>
  );
}

/**
 * Extensions are mounted as their own React root, so they do not inherit the
 * home app's router context and need their own to read the current location.
 */
export default function DashboardLink() {
  return (
    <BrowserRouter>
      <AuditLink />
    </BrowserRouter>
  );
}
