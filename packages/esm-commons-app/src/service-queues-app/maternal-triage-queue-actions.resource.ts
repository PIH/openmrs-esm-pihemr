import { type Concept, type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import { type QueueEntry } from './types';

// Hooks here copied from esm-service-queues-app

export function useMutateQueueEntries() {
  const { mutate } = useSWRConfig();

  return {
    mutateQueueEntries: () => {
      return mutate((key) => {
        return (
          typeof key === 'string' &&
          (key.includes(`${restBaseUrl}/queue-entry`) || key.includes(`${restBaseUrl}/visit-queue-entry`))
        );
      }).then(() => {
        window.dispatchEvent(new CustomEvent('queue-entry-updated'));
      });
    },
  };
}

interface TransitionQueueEntryParams {
  queueEntryToTransition: string;
  transitionDate?: string;
  newQueue?: string;
  newStatus?: string;
  newPriority?: string;
  newPriorityComment?: string;
}

/**
 * A transition is defined as an action that ends a current queue entry and immediately starts a new one
 * with (slightly) different values. For now, this could be used to transition the queue entry's status,
 * priority or queue. This allows us to keep a history of queue entries through a patient's visit.
 * Note that there are some use cases (like RDE or data correction) where a transition is NOT appropriate.
 * @param params
 * @param abortController
 * @returns
 */
export function transitionQueueEntry(
  params: TransitionQueueEntryParams,
  abortController?: AbortController,
): Promise<FetchResponse<QueueEntry>> {
  return openmrsFetch(`${restBaseUrl}/queue-entry/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController?.signal,
    body: params,
  });
}

interface UpdateQueueEntryParams {
  status?: Concept;
  priority?: Concept;
  priorityComment?: string;
  sortWeight?: number;
  startedAt?: string;
  endedAt?: string;
  loationWaitingFor?: Location;
  providerWaitingFor?: Location;
}

export function updateQueueEntry(
  queueEntryUuid: string,
  params: UpdateQueueEntryParams,
  abortController?: AbortController,
) {
  return openmrsFetch(`${restBaseUrl}/queue-entry/${queueEntryUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController?.signal,
    body: params,
  });
}
