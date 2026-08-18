"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The handover CSS scopes several page layouts off a class on `<body>`
 * (`.my-account-page .wrapper`, …). Next.js owns `<body>`, so the class is
 * applied here from the current route instead of being hard-coded in markup.
 */
const BODY_CLASS_BY_PREFIX = [
  { prefix: "/my-account", className: "my-account-page" },
  { prefix: "/login", className: "authentication-page" },
  { prefix: "/signup", className: "authentication-page" },
  { prefix: "/rental/", className: "product-details-page" },
];

export default function BodyWrapper({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    const active = BODY_CLASS_BY_PREFIX.filter(({ prefix }) => pathname.startsWith(prefix)).map(
      ({ className }) => className,
    );

    const all = [...new Set(BODY_CLASS_BY_PREFIX.map(({ className }) => className))];
    document.body.classList.remove(...all);
    if (active.length) document.body.classList.add(...active);

    return () => document.body.classList.remove(...all);
  }, [pathname]);

  return children;
}
