import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { type AuditObs, type ObsChangeStatus, type ObsTreeNode } from '../types';
import { formatUserAndDate } from './audit-format';
import { flattenObsTree, formatObsValue, getConceptDescription, isVoidedStatus } from './obs-audit';
import styles from './audit.scss';

interface ObsAuditTableProps {
  obsTree: Array<ObsTreeNode>;
}

/** One indent step per level of obs group nesting. */
const indentPerLevel = 1.5;

function collectObs(nodes: Array<ObsTreeNode>, into: Map<string, AuditObs>): Map<string, AuditObs> {
  for (const node of nodes) {
    into.set(node.obs.uuid, node.obs);
    collectObs(node.children, into);
  }
  return into;
}

/**
 * The audit trail for one encounter's observations: what was entered, what was changed, what was
 * deleted, and by whom. Deleted obs are struck through, as they were on the legacy admin page, and
 * every obs carries the change status derived by `getObsChangeStatus`.
 */
export default function ObsAuditTable({ obsTree }: ObsAuditTableProps) {
  const { t, i18n } = useTranslation();
  const [showDeleted, setShowDeleted] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(false);

  /** The tag and the legend entry for each status that is worth calling out. */
  const statusMeta = useMemo(
    () => ({
      edited: {
        label: t('edited', 'Edited'),
        type: 'blue' as const,
        legend: t('editedLegend', 'the value was changed after it was first recorded'),
      },
      addedAfterEncounter: {
        label: t('addedLater', 'Added later'),
        type: 'teal' as const,
        legend: t('addedLaterLegend', 'recorded after the encounter itself was created'),
      },
      deleted: {
        label: t('deleted', 'Deleted'),
        type: 'red' as const,
        legend: t('deletedLegend', 'removed from the encounter'),
      },
      supersededValue: {
        label: t('previousValue', 'Previous value'),
        type: 'gray' as const,
        legend: t('previousValueLegend', 'the value that an edit replaced'),
      },
    }),
    [t],
  );

  const obsByUuid = useMemo(() => collectObs(obsTree, new Map<string, AuditObs>()), [obsTree]);
  const rows = useMemo(() => flattenObsTree(obsTree, showDeleted), [obsTree, showDeleted]);
  const hasDeletedObs = useMemo(() => Array.from(obsByUuid.values()).some((obs) => obs.voided), [obsByUuid]);

  return (
    <>
      <h3 className={styles.sectionHeading}>{t('observations', 'Observations')}</h3>
      <div className={styles.toolbar}>
        <Checkbox
          checked={showDeleted}
          disabled={!hasDeletedObs}
          id="show-deleted-obs"
          labelText={t('showDeletedObs', 'Show deleted observations')}
          onChange={(_event, { checked }) => setShowDeleted(checked)}
        />
        <Checkbox
          checked={showDescriptions}
          id="show-obs-descriptions"
          labelText={t('showConceptDescriptions', 'Show concept descriptions')}
          onChange={(_event, { checked }) => setShowDescriptions(checked)}
        />
      </div>
      <div className={styles.legend}>
        {Object.entries(statusMeta).map(([status, meta]) => (
          <span className={styles.legendItem} key={status}>
            <Tag type={meta.type}>{meta.label}</Tag>
            {meta.legend}
          </span>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={styles.emptyState}>{t('noObservations', 'This encounter has no observations.')}</p>
      ) : (
        <TableContainer className={styles.tableContainer}>
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>{t('questionConcept', 'Question concept')}</TableHeader>
                <TableHeader>{t('value', 'Value')}</TableHeader>
                <TableHeader>{t('change', 'Change')}</TableHeader>
                <TableHeader>{t('recordedBy', 'Recorded by')}</TableHeader>
                <TableHeader>{t('deletedBy', 'Deleted by')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ obs, status, depth, children }) => {
                const meta = status === 'unchanged' ? undefined : statusMeta[status];
                const previous = obs.previousVersion ? obsByUuid.get(obs.previousVersion.uuid) : undefined;
                const description = showDescriptions ? getConceptDescription(obs, i18n?.language) : undefined;
                const isGroup = children.length > 0;
                const indent = { paddingInlineStart: `${depth * indentPerLevel}rem` };

                return (
                  <React.Fragment key={obs.uuid}>
                    <TableRow className={isVoidedStatus(status) ? styles.voidedRow : undefined}>
                      <TableCell>
                        <span className={styles.obsConcept} style={indent}>
                          {isGroup ? <strong>{obs.concept?.display}</strong> : obs.concept?.display}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isGroup ? null : formatObsValue(obs.value)}
                        {previous ? (
                          <div className={styles.obsDescription}>
                            {t('wasPreviously', 'was {{value}}', { value: formatObsValue(previous.value) })}
                          </div>
                        ) : null}
                        {obs.comment ? <div className={styles.obsDescription}>{obs.comment}</div> : null}
                      </TableCell>
                      <TableCell>{meta ? <Tag type={meta.type}>{meta.label}</Tag> : null}</TableCell>
                      <TableCell>
                        <div>{formatUserAndDate(obs.auditInfo?.creator, obs.auditInfo?.dateCreated)}</div>
                        {obs.auditInfo?.changedBy ? (
                          <div className={styles.obsDescription}>
                            {t('changedByUser', 'Changed by {{user}}', {
                              user: formatUserAndDate(obs.auditInfo.changedBy, obs.auditInfo.dateChanged),
                            })}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {obs.voided ? (
                          <>
                            <div>{formatUserAndDate(obs.auditInfo?.voidedBy, obs.auditInfo?.dateVoided)}</div>
                            {obs.auditInfo?.voidReason ? (
                              <div className={styles.obsDescription}>{obs.auditInfo.voidReason}</div>
                            ) : null}
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {description ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className={styles.obsDescription} style={indent}>
                            {description}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
