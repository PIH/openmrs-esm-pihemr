import React from "react";
import styles from "./value-tile.scss";

export interface ValueTileProps {
  label: string;
  children: React.ReactNode;
}

export function ValueTile({ label, children }: ValueTileProps) {
  return (
    <div>
      <p className={styles.label}>{label}</p>
      <p className={styles.content}>
        <span className={styles.value}>{children}</span>
      </p>
    </div>
  );
}
