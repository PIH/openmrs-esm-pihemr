import { ExtensionSlot, WorkspaceContainer } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

export default function Root() {
  return (
    <div>
      <BrowserRouter basename={window.spaBase}>
        <Routes>
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/service-queues/queue-table-by-status/:queueUuid" element={<QueueTableByStatus />} />
          <Route path="/ward" element={<Ward />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

function Appointments() {
  return (
    <>
      <WorkspaceContainer overlay contextKey="appointments" />
      <ExtensionSlot name={'appointments-dashboard-slot'} />
    </>
  );
}

function QueueTableByStatus() {
  const { queueUuid } = useParams();
  return (
    <>
      <WorkspaceContainer overlay contextKey="service-queues" />
      <ExtensionSlot name={'queue-table-by-status-view-slot'} state={{ queueUuid }} />
    </>
  );
}

function Ward() {
  return (
    <>
      <WorkspaceContainer overlay contextKey="ward" />
      <ExtensionSlot name={'ward-view-slot'} />
    </>
  );
}
