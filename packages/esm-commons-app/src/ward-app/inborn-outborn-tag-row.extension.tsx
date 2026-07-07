import React from 'react';
import classNames from 'classnames';
import { useParams } from 'react-router-dom';
import { type Visit, useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useVisitAttribute } from '../hooks/useVisitAttribute';
import styles from './inborn-outborn-tag-row.scss';

/**
 * Stable, non-module class on the badge so card headers can reserve space for it via a `:has()`
 * sibling rule in openmrs-esm-patient-management (see ward-patient-card.scss /
 * admission-request-card.scss). This class is the cross-package contract between the extension slot
 * and the host card layout — keep it in sync with the selectors there.
 */
const BADGE_MARKER_CLASS = 'ward-inborn-outborn-badge';

/**
 * UUID of the visit attribute type that records whether the patient was born in this
 * facility (Inborn) or referred from elsewhere (Outborn).
 */
const INBORN_OUTBORN_ATTRIBUTE_TYPE_UUID = '86f716fc-5e26-4eb1-9484-46370cff28f0';

/**
 * UUID of the NICU ward location. The Inborn/Outborn badge is only relevant on the NICU ward, so the
 * extension renders nothing on any other ward.
 */
const NICU_LOCATION_UUID = '0ce2f6fb-6850-11ee-ab8d-0242ac120002';

interface InbornOutbornTagRowProps {
  /** The active visit, supplied by the extension slot's state. */
  visit: Visit;
}

/**
 * InbornOutbornTagRow displays a tag indicating the patient's place of birth relative to this
 * facility, based on a boolean visit attribute on the active visit. The patient is considered
 * "Inborn" (born here) only when the attribute's value is `true`; in every other case (the value is
 * false, or the visit has no such attribute) they default to "Outborn" (referred in).
 *
 * This is a PIH-specific extension slotted into the maternal ward cards of
 * openmrs-esm-patient-management via `maternal-ward-patient-card-header-slot`. The default visit
 * representation used by the ward hooks does not include attribute values, so the value is fetched
 * on demand via {@link useVisitAttribute}. Following the NICU patient card design, the badge renders
 * as a rounded pill pinned to the top-right corner of the card: blue for Inborn, purple for Outborn.
 * The badge is scoped to the NICU ward only (see {@link NICU_LOCATION_UUID}).
 */
const InbornOutbornTagRow: React.FC<InbornOutbornTagRowProps> = ({ visit }) => {
  const { t } = useTranslation();
  const { value, isLoading } = useVisitAttribute(visit?.uuid, INBORN_OUTBORN_ATTRIBUTE_TYPE_UUID);
  // Resolve the ward being viewed the same way esm-ward-app does: the location UUID comes from the
  // ward route (`.../ward/:locationUuid`), falling back to the session location when unset.
  const { locationUuid } = useParams();
  const { sessionLocation } = useSession();
  const wardLocationUuid = locationUuid ?? sessionLocation?.uuid;

  // Only show the badge on the NICU ward.
  if (wardLocationUuid !== NICU_LOCATION_UUID) {
    return null;
  }

  // Avoid flashing a (default) Outborn badge before the attribute value has loaded.
  if (isLoading) {
    return null;
  }

  const isInborn = value === true;

  return (
    <div className={classNames(styles.inbornOutbornBadge, BADGE_MARKER_CLASS)}>
      {isInborn ? (
        <span className={classNames(styles.badge, styles.inborn)}>{t('inborn', 'Inborn')}</span>
      ) : (
        <span className={classNames(styles.badge, styles.outborn)}>{t('outborn', 'Outborn')}</span>
      )}
    </div>
  );
};

export default InbornOutbornTagRow;
