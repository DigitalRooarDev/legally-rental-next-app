"use client";

import { useEffect } from "react";

/** Loads Bootstrap's JS bundle after hydration so it never blocks first paint. */
export default function BootstrapClient() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle");
  }, []);

  return null;
}
