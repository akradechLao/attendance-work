"use client";

import { useEffect } from "react";

export default function UnregisterOldSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          // Unregister old service workers from previous app
          if (reg.scope.includes("/Attendance-front") || reg.active?.scriptURL?.includes("/service-worker")) {
            reg.unregister();
            console.log("[SW] Unregistered old service worker:", reg.scope);
          }
        }
      });
    }
  }, []);

  return null;
}
