import React from 'react';
import ReportComponent from './pathology-report/ReportComponent';
import styles from './root.css';

export default function Root() {
  return (
    <div className={`omrs-main-content ${styles.container}`}>
      <ReportComponent />
    </div>
  );
}
