/**
 * antd theme tokens — the single place the design's brand colour and typeface
 * reach antd components.
 *
 * Plain data, no functions (no `algorithm`), so it stays serialisable and can be
 * handed straight to `<ConfigProvider>` from the server layout.
 *
 * Hover/active/bg shades are deliberately left out: antd derives the full palette
 * from `colorPrimary`, and hardcoding them would drift from that ramp.
 */

/** Brand purple, matching `#8121cf` throughout the handover CSS. */
export const BRAND_PRIMARY = '#8121cf';

/**
 * The next/font variable first so antd matches the self-hosted, preloaded face
 * rather than falling back to a system Poppins that may not be installed.
 */
export const BRAND_FONT_FAMILY = "var(--font-poppins), 'Poppins', sans-serif";

export const antdTheme = {
  token: {
    colorPrimary: BRAND_PRIMARY,
    fontFamily: BRAND_FONT_FAMILY,
  },
};

export default antdTheme;
