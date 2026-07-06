import React from 'react';
import classNames from 'classnames';
import { Tag } from '@carbon/react';
import { type Visit } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useVisitAttribute } from '../hooks/useVisitAttribute';
import styles from './inborn-outborn-tag-row.scss';

/**
 * Carbon `<Tag>` accepts a wider set of color types than its published `type` prop enumerates; this
 * is the subset we use here.
 */
type CarbonTagType = 'blue' | 'purple';

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
 */
const InbornOutbornTagRow: React.FC<InbornOutbornTagRowProps> = ({ visit }) => {
  const { t } = useTranslation();
  const { value, isLoading } = useVisitAttribute(visit?.uuid, INBORN_OUTBORN_ATTRIBUTE_TYPE_UUID);

  // Avoid flashing a (default) Outborn badge before the attribute value has loaded.
  if (isLoading) {
    return null;
  }

  const isInborn = value === true;

  return (
    <div className={classNames(styles.inbornOutbornBadge, BADGE_MARKER_CLASS)}>
      {isInborn ? (
        <Tag type={'blue' as CarbonTagType}>{t('inborn', 'Inborn')}</Tag>
      ) : (
        <Tag type={'purple' as CarbonTagType}>{t('outborn', 'Outborn')}</Tag>
      )}
    </div>
  );
};

export default InbornOutbornTagRow;
