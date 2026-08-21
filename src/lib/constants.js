export const SERVICE_TYPES = Object.freeze({
  RENTAL: "Rental",
  SERVICE: "Service",
});

/** httpOnly cookies written on login — read by `middleware.js` and server actions. */
export const COOKIE_KEYS = Object.freeze({
  USER_ID: "LG_USER_ID",
  TOKEN: "LG_TOKEN",
});

/**
 * sessionStorage keys for the OTP hand-off between `/login` or `/forgot-password`,
 * `/verify-otp` and `/reset-password`. Throwaway state — it must not outlive the tab.
 */
export const STORAGE_KEYS = Object.freeze({
  OTP_EMAIL: "lg_otp_email",
  OTP_FLOW: "lg_otp_flow",
  /**
   * The user id `sendOTP` handed back, if any. A *candidate* only: it is written
   * before the code is checked, so it must never gate `/reset-password` on its
   * own — `<VerifyOtp />` promotes it to `RESET_USER_ID` after a successful
   * verification, which is what keeps the reset screen unreachable without one.
   */
  OTP_USER_ID: "lg_otp_user_id",
  RESET_USER_ID: "lg_reset_user_id",
  /**
   * Where to land once a detoured sign-in finishes. Both detours lose the query
   * string: the OAuth hop leaves this origin entirely, and the OTP hop lands on
   * `/verify-otp` with no params of its own. The tab survives both, and with it
   * sessionStorage.
   */
  PENDING_REDIRECT: "lg_pending_redirect",
});

/** Which journey sent the user to `/verify-otp` — it decides where they go next. */
export const OTP_FLOWS = Object.freeze({
  VERIFY_ACCOUNT: "verify_account",
  FORGOT_PASSWORD: "forgot_password",
});

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Fallback categories for the hero search form when the API returns none. */
export const FALLBACK_CATEGORIES = Object.freeze([
  { id: "vehicle", name: "Vehicle", slug: "vehicle", image_full_path: "/images/vehicle.png" },
  { id: "property", name: "Property", slug: "property", image_full_path: "/images/property.png" },
  { id: "hallsspaces", name: "Halls/Spaces", slug: "hallsspaces", image_full_path: "/images/services.png" },
  { id: "fashion", name: "Fashion", slug: "fashion", image_full_path: "/images/fashion.png" },
  { id: "equipment", name: "Equipment", slug: "equipment", image_full_path: "/images/equipment.png" },
]);

/** `category_type` values accepted by `categoryList`. */
export const CATEGORY_TYPES = Object.freeze({
  PHYSICAL: "0",
  DIGITAL: "1",
  RENTAL: "2",
});

/**
 * Fallbacks for the rental attribute enums. The live lists come from
 * `getConfigMarketPlace`'s `rental_type_info`; these only stand in when that
 * call fails, so a network blip degrades to a stale select rather than an empty
 * one. Prefer `useRentalOptions()` in components — reading these directly is how
 * `CNG` stayed missing from the fuel list.
 *
 * NB: `categoryServiceList` currently *ignores* every one of these as a filter —
 * it answers identically for `PETROL`, `CNG` and outright nonsense. They are
 * kept because the selects are built and the values are right; the filtering is
 * a server-side gap.
 */
export const FUEL_TYPES = Object.freeze([
  { value: 'PETROL', label: 'Petrol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'CNG', label: 'CNG' },
]);

export const TRANSMISSION_TYPES = Object.freeze([
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTOMATIC', label: 'Automatic' },
]);

export const FURNISHING_STATUSES = Object.freeze([
  { value: 'FURNISHED', label: 'Furnished' },
  { value: 'SEMI_FURNISHED', label: 'Semi Furnished' },
  { value: 'UNFURNISHED', label: 'Unfurnished' },
]);

/**
 * Which third field the hero search shows, keyed by the selected category's
 * `rental_type`. Anything unmapped (Services) falls back to guests.
 */
export const HERO_EXTRA_BY_RENTAL_TYPE = Object.freeze({
  PROPERTY: 'guests',
  HALLS: 'guests',
  VEHICLE: 'vehicle',
  EQUIPMENT: 'equipment',
  FASHION: 'fashion',
});

/** Label + placeholder for each third-field variant. */
export const HERO_EXTRA_LABELS = Object.freeze({
  guests: { label: 'Guests', placeholder: 'Add guests' },
  vehicle: { label: 'Vehicle Details', placeholder: 'Add Details' },
  equipment: { label: 'Year of Manufacture', placeholder: 'Add Year' },
  fashion: { label: 'Fashion Details', placeholder: 'Add Details' },
});

/** `rental_type` values accepted by `categoryServiceList`. */
export const RENTAL_TYPE_OPTIONS = Object.freeze([
  { value: "PROPERTY", label: "Property" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "FASHION", label: "Fashion" },
  { value: "HALLS", label: "Halls / Spaces" },
]);

export const CURRENCY_SYMBOL = "₦";

/**
 * PayPal's processing percentage, added on top of the converted dollar amount
 * rather than absorbed.
 *
 * A fallback for `checkoutOrder`'s `paypal_charges`, not a replacement for it: the
 * API stays the authority whenever it sends a figure. It exists because it does
 * not always send one, and the previous code read a missing field as **zero
 * fee** — charging the bare converted amount while the payment step told the
 * visitor 1.5% applied. A rate that silently disappears is the one case where a
 * platform-wide rule has to be stated in the client.
 *
 * Change this only alongside the server's own rate; the two describe one charge.
 */
export const PAYPAL_FEE_PERCENT = 1.5;

/** Tabs rendered by `<MyAccount />` — `id` doubles as the `?tab=` query value. */
export const MY_ACCOUNT_TABS = Object.freeze([
  { id: "my-bookings", label: "My Bookings" },
  { id: "my-wishlist", label: "My Wishlist" },
  { id: "account-details", label: "Account details" },
  { id: "my-address", label: "Manage Address" },
  { id: "my-wallet", label: "Wallet" },
  { id: "change-password", label: "Change password" },
]);

/**
 * `orderList` returns a numeric `status` and no label (unlike the ecommerce API,
 * which supplies `statusLabel`).
 *
 * 0-4 are the enum documented in the Postman collection. `5` is not documented,
 * but orders carrying it also carry `rejected_date` / `rejected_desc` with
 * `approval_status: 3`, so it is read as Rejected — confirm before relying on it.
 */
export const ORDER_STATUS_LABELS = Object.freeze({
  0: "Active",
  1: "Late",
  2: "Cancelled",
  3: "Delivered",
  4: "Completed",
  5: "Rejected",
});

/** Applied as `order-status--<tone>`; drives the badge colour. */
export const ORDER_STATUS_TONES = Object.freeze({
  0: "info",
  1: "pending",
  2: "danger",
  3: "success",
  4: "success",
  5: "danger",
});

/** `status` filters supported by `orderList`. `''` means every status. */
export const ORDER_STATUS_FILTERS = Object.freeze([
  { value: "", label: "All" },
  { value: "0", label: "Active" },
  { value: "1", label: "Late" },
  { value: "3", label: "Delivered" },
  { value: "4", label: "Completed" },
  { value: "2", label: "Cancelled" },
]);

/**
 * Fallback for the rental cancellation terms.
 *
 * The live address comes from `getConfigMarketPlace` -> `pages.rentalCancellationPolicy`,
 * so the CMS can move the page without a deploy. This is only what
 * `/cancellation-policy` frames when that call fails or the key is missing —
 * better the terms as they stood at build time than an empty frame.
 */
export const RENTAL_CANCELLATION_POLICY_URL = "https://247sue.com/Rentalcancellationpolicy";

/** The local route that frames the above. What every policy link points at. */
export const CANCELLATION_POLICY_PATH = "/cancellation-policy";

/** `type_filter` narrows by booking window; `''` means no window filter. */
export const ORDER_WINDOW_FILTERS = Object.freeze([
  { value: "", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
]);
