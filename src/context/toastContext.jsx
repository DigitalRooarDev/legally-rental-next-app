"use client";

import { createContext, useContext } from "react";
import { message } from "antd";

/**
 * App-wide toasts, backed by antd's `message`.
 *
 * `message.useMessage()` rather than the static `message.success(...)`: the
 * static methods render outside React, so they never see `<ConfigProvider>` and
 * would show every toast in antd's default typeface instead of the brand one set
 * in `antdTheme`.
 *
 * A context of our own rather than antd's `<App>`, which is the usual way to get
 * the same thing: `<App>` renders a `.ant-app` wrapper that sets `color`,
 * `fontSize`, `lineHeight` and `fontFamily` on itself, and wrapping the whole
 * tree in it would push antd's 14px/`colorText` onto everything that inherits
 * from it. `component={false}` avoids the element but warns when CSS variables
 * are on. This holds the message context and adds no DOM at all.
 */
const ToastContext = createContext(null);

/**
 * Nothing here is critical, so a missing provider must not crash a page. Calls
 * are dropped instead, which is also what keeps `useToast()` safe to hold in a
 * hook that may run in a tree without the provider.
 */
const NOOP_TOAST = Object.freeze({
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  loading: () => {},
  open: () => {},
  destroy: () => {},
});

export function ToastProvider({ children }) {
  const [api, contextHolder] = message.useMessage();

  return (
    <ToastContext.Provider value={api}>
      {/* Where the toasts actually mount. Renders no box of its own. */}
      {contextHolder}
      {children}
    </ToastContext.Provider>
  );
}

/**
 * @returns {import('antd').MessageInstance} `.success` / `.error` / `.info` /
 *   `.warning` / `.loading`, each taking the message string.
 */
export const useToast = () => useContext(ToastContext) ?? NOOP_TOAST;
