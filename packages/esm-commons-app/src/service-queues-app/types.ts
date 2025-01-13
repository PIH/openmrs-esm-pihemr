import { type Concept, type OpenmrsResource, type Patient, type Visit } from '@openmrs/esm-framework';

export interface Queue {
  uuid: string;
  display: string;
  name: string;
  description: string;
  location: Location;
  service: Concept;
  allowedPriorities: Array<Concept>;
  allowedStatuses: Array<Concept>;
}

export interface QueueEntry {
  uuid: string;
  display: string;
  endedAt: string;
  locationWaitingFor: Location;
  patient: Patient;
  priority: Concept;
  priorityComment: string | null;
  providerWaitingFor: Provider;
  queue: Queue;
  startedAt: string;
  status: Concept;
  visit: Visit;
  sortWeight: number;
  queueComingFrom: Queue;
  previousQueueEntry: QueueEntry;
}

export interface Provider extends OpenmrsResource {}

export interface Encounter {
  uuid: string;
  encounterDateTime: string;
  encounterProviders: Array<{
    uuid: string;
    display: string;
    encounterRole: {
      uuid: string;
      display: string;
    };
    provider: {
      uuid: string;
      person: {
        uuid: string;
        display: string;
      };
    };
  }>;
  encounterType: {
    uuid: string;
    display: string;
  };
  obs: Array<OpenmrsResource>;
  orders: Array<OpenmrsResource>;
}
