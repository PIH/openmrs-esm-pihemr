import { Button, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { isDesktop, launchWorkspace, showModal, useConfig, useLayoutType } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './maternal-trial-queue-actions.scss';
import { type QueueEntry } from './types';
import { transitionQueueEntry, useMutateQueueEntries } from './maternal-triage-queue-actions.resource';

// types taken from esm-service-queues-app
interface QueueTableCellComponentProps {
  queueEntry: QueueEntry;
}

interface ConfigObject {
  concepts: {
    defaultTransitionStatus: string;
  };
  // other fields not shown
}

/**
 * This extension provides an extra "Triage" action, along with the other standard actions for
 * queue entries in the queues table. The Triage action opens the maternal triage form, and also
 * has the side effect of putting the patient's queue entry into the "in service" status, if they have
 * not yet already
 * @param param0
 * @returns
 */
const MaternalTriageQueueActions: React.FC<QueueTableCellComponentProps> = ({ queueEntry }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();

  const { mutateQueueEntries } = useMutateQueueEntries();
  const { concepts } = useConfig<ConfigObject>({ externalModuleName: '@openmrs/esm-service-queues-app' });
  const inServiceStatus = concepts.defaultTransitionStatus;

  const { patient } = queueEntry;

  return (
    <div className={styles.actionsCell}>
      <Button
        kind="ghost"
        aria-label={t('triage', 'Triage')}
        onClick={async () => {
          if (queueEntry.status.uuid !== inServiceStatus) {
            const res = await transitionQueueEntry({
              queueEntryToTransition: queueEntry.uuid,
              newStatus: inServiceStatus,
            });
            mutateQueueEntries();
            const updatedQueueEntry = { ...res.data, visit: queueEntry.visit };
            launchWorkspace('maternal-triage-form-workspace', { queueEntry: updatedQueueEntry, patient });
          } else {
            launchWorkspace('maternal-triage-form-workspace', { queueEntry, patient });
          }
        }}
        size={isDesktop(layout) ? 'sm' : 'lg'}>
        {t('triage', 'Triage')}
      </Button>

      <OverflowMenu aria-label="Actions menu" size={isDesktop(layout) ? 'sm' : 'lg'} align="left" flipped>
        <OverflowMenuItem
          className={styles.menuItem}
          aria-label={t('transition', 'Transition')}
          hasDivider
          onClick={() => {
            const dispose = showModal('transition-queue-entry-modal', {
              closeModal: () => dispose(),
              queueEntry,
            });
          }}
          itemText={t('transition', 'Transition')}
        />
        <OverflowMenuItem
          className={styles.menuItem}
          aria-label={t('edit', 'Edit')}
          hasDivider
          onClick={() => {
            const dispose = showModal('edit-queue-entry-modal', {
              closeModal: () => dispose(),
              queueEntry,
            });
          }}
          itemText={t('edit', 'Edit')}
        />
        <OverflowMenuItem
          className={styles.menuItem}
          aria-label={t('removePatient', 'Remove patient')}
          hasDivider
          onClick={() => {
            const dispose = showModal('end-queue-entry-modal', {
              closeModal: () => dispose(),
              queueEntry,
            });
          }}
          itemText={t('removePatient', 'Remove patient')}
        />
        {queueEntry.previousQueueEntry == null ? (
          <OverflowMenuItem
            className={styles.menuItem}
            aria-label={t('delete', 'Delete')}
            hasDivider
            isDelete
            onClick={() => {
              const dispose = showModal('void-queue-entry-modal', {
                closeModal: () => dispose(),
                queueEntry,
              });
            }}
            itemText={t('delete', 'Delete')}
          />
        ) : (
          <OverflowMenuItem
            className={styles.menuItem}
            aria-label={t('undoTransition', 'Undo transition')}
            hasDivider
            isDelete
            onClick={() => {
              const dispose = showModal('undo-transition-queue-entry-modal', {
                closeModal: () => dispose(),
                queueEntry,
              });
            }}
            itemText={t('undoTransition', 'Undo transition')}
          />
        )}
      </OverflowMenu>
    </div>
  );
};

export default MaternalTriageQueueActions;
