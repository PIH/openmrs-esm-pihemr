import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReferralsQueue from "./referrals-queue/referrals-queue.component";
import styles from "./root.css";
import { appPath } from "./constants";

export default function Root() {
  return (
    <div className={`${styles.ovconstantserflowAuto}`}>
      <BrowserRouter basename={appPath}>
        <Routes>
          <Route path="/" element={<ReferralsQueue />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
