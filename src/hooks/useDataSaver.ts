"use client";

import { useEffect, useState } from "react";

type NetworkInformation = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
};

function prefersLessData() {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  return Boolean(
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g",
  );
}

/** True when the browser reports Data Saver or a very slow mobile connection. */
export function useDataSaver() {
  // Start conservatively so server-rendered HTML never initiates a video
  // download before the browser can report its connection preference.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const update = () => setEnabled(prefersLessData());
    update();
    connection?.addEventListener("change", update);
    return () => connection?.removeEventListener("change", update);
  }, []);

  return enabled;
}
