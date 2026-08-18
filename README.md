# Legally Rental — Next.js (App Router, JSX)

Next.js 16 front-end for the LegallyNG rental marketplace. The static handover in
[html/](html/) is the design source of truth; the app consumes it and renders live data from
the LegallyNG API.

The folder layout mirrors `legally-ecommerce-next-app`: server actions in `src/actions/`,
one API wrapper in `src/lib/api.js`, session state in `src/context/authContext.jsx`,
shared theme components in `src/components/theme/`, and one folder per feature.

## Stack

| Concern    | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, **JSX — no TypeScript**) |
| Styling    | Bootstrap 5.3 + handover `style.css` / `icon.css`          |
| Forms      | react-hook-form + yup                                      |
| Toasts     | react-toastify                                             |
| Fonts      | `next/font` (Poppins, self-hosted)                         |
| Data       | Server Components + server actions                         |
| Lint       | ESLint 9 flat config (`next/core-web-vitals`)              |

## Getting started

```bash
# `.env.local` holds every variable, documented inline. It is gitignored —
# ask a teammate for a copy if it is missing.
npm install
npm run dev                    # http://localhost:3000
```

| Script                | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `npm run dev`         | Dev server (Turbopack)                                      |
| `npm run build`       | Production build                                            |
| `npm start`           | Serve the production build                                  |
| `npm run lint`        | ESLint over `src/` and `scripts/`                            |
| `npm run sync:design` | Re-import `html/css` + `html/images` after a design handover |

## Environment

| Variable                       | Required | Notes                                                      |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `API_BASE_URL`                 | yes      | v1 — `https://staging.legallyng.com/api/` (trailing slash)  |
| `API_V2_URL`                   | yes      | v2 — `https://sue-staging.legallyng.com/api2/`              |
| `NEXT_PUBLIC_SITE_URL`         | no       | Canonical origin used by `metadataBase`                     |
| `DASHBOARD_REVALIDATE_SECONDS` | no       | Cache window for the anonymous dashboard, default `300`      |

Neither URL is `NEXT_PUBLIC_` — every request runs inside a server action, so the API hosts
are never shipped to the browser.

## Structure

```
html/                          # untouched design handover (source of truth)
public/images/                 # synced from html/images
scripts/sync-design.mjs        # html/ -> src/styles + public/images
src/
  actions/                     # one file per API call — the only place endpoints are named
    getBuyerDashboard.js       # v1  home + listing data (server-only, cache()-deduped)
    getUserProfile.js          # v1  signed-in profile (user id read from the cookie)
    getWishlist.js             # v1  saved listings -> ProductViewModel[] + pagination
    toggleWishlist.js          # v1  addWishList — toggles, does not just add
    getOrders.js               # v1  orderList, pinned to type=Rental, paginated
    getOrderDetails.js         # v1  getOrderDetails — one booking + price breakdown
    getTransactionHistory.js   # v1  transactionHistory — wallet balance + ledger
    getServiceList.js          # v1  categoryServiceList — search + filters
    getServiceDetails.js       # v1  buyerServiceDetails — by slug
    getCategories.js           # v1  categoryList — icons + nested sub-categories
    searchAddress.js           # v1  mapboxapi — destination / address autocomplete
    updateProfileImage.js      # v2  updateProfilePicture (multipart, field `profile`)
    logoutUser.js              # v1  revokes the token, clears the cookies
    loginUser.js               # v2  signIn + response adapter
    sendOtp.js                 # v2  emails a code (resend + forgot password)
    verifyOtp.js               # v2  confirms the code
    resetPassword.js           # v2  new password after OTP
    changePassword.js          # v2  signed-in password change
    updateProfile.js           # v2  profile edit (allow-listed fields)
    getUserSession.js          # reads the httpOnly session cookies (server-only)
    storeUserSession.js        # writes them after a successful login
  app/                         # routes only — every page is a thin wrapper
    layout.jsx                 # header, footer, AuthProvider, ToastContainer
    page.jsx                   -> components/home
    login/page.jsx             -> components/auth/Login
    my-account/page.jsx        -> components/my-account
    verify-otp/page.jsx        -> components/auth/VerifyOtp
    forgot-password/page.jsx   -> components/auth/ForgotPassword
    reset-password/page.jsx    -> components/auth/ResetPassword
    product/page.jsx           -> components/rental/ProductList
    error.jsx | not-found.jsx | loading.jsx
  components/
    BodyWrapper.jsx            # route -> <body> class, for the handover CSS
    theme/                     # shared across features
      Header.jsx               # server component
      AccountMenu.jsx          # client: the only session-aware part of the header
      SearchForm.jsx           # client: hero + sticky search, body-class behaviour
      Footer.jsx               # driven by footerNav.js
      ProductBox.jsx           # ← the single reusable listing card
      ProductRail.jsx          # heading + prev/next + N ProductBox
      ProductGrid.jsx          # wrapping grid + N ProductBox
      Pagination.jsx           # windowed pager, callback-driven (account tabs)
      PageLinks.jsx            # windowed pager, <a href> (crawlable search results)
      PhoneField.jsx           # react-phone-input-2 wired into react-hook-form
      BackToTop.jsx | BootstrapClient.jsx | EmptyState.jsx
    auth/                      # Login, VerifyOtp, ForgotPassword, ResetPassword
    my-account/                # index.jsx (tab shell) + one file per tab
                               #   MyOrders + OrderCard, MyWishlist, AccountDetails,
                               #   ManageAddress + AddressForm, Wallet, ChangePassword
    rental/                    # ListingFilters + FilterChip, ResultsMap,
                               #   ServiceDetails, ServiceGallery
    home/index.jsx             # the dashboard rails
    rental/ProductList.jsx     # listing grid page body
  context/authContext.jsx      # useAuth(): user, isAuthenticated, refreshUser, logout
  hooks/
    useWishlistToggle.js       # default heart handler (guest -> login, else toggle)
  lib/
    api.js                     # the one fetch wrapper — never throws
    constants.js               # cookie/storage keys, categories, tabs, currency
  utils/
    formats.js                 # price, period, rating formatting
    mappers.js                 # raw API service -> ProductViewModel
    otpSession.js              # sessionStorage hand-off across the OTP routes
    guestWishlist.js           # hearts tapped while signed out, replayed after login
  proxy.js                     # route guards (Next 16's middleware replacement)
  styles/
    icon.css, style.css        # generated from html/ — do not hand-edit
    app.css                    # all app-specific CSS lives here
```

### Where to add things

| Task                       | Touch                                                       |
| -------------------------- | ----------------------------------------------------------- |
| New API call               | one new file in `src/actions/`                               |
| New page                   | `src/app/<route>/page.jsx` + a component folder             |
| New shared UI              | `src/components/theme/`                                     |
| New CSS                    | `src/styles/app.css` (never `style.css` — it is generated)   |
| Protect a route            | `PROTECTED_ROUTES` in `src/proxy.js`                         |

## The API layer — three bases, one envelope

`src/lib/api.js` exports a single `fetchAPI(endpoint, options, type)`. There are three API bases
and they **all disagree on how they report success**:

| `type`           | Env var         | Envelope                              | Used by                                              |
| ---------------- | --------------- | ------------------------------------- | ---------------------------------------------------- |
| `'v1'` (default) | `API_BASE_URL`  | `{ status: true\|false, message, response }` | dashboard, listings, details, wishlist, orders, addresses |
| `'v2'`           | `API_V2_URL`    | `{ result: "1"\|"0", message, response }`    | sign in, OTP, password, profile, avatar        |
| `'admin'`        | `API_ADMIN_URL` | `{ code: "0000", message, data }`            | parcel shop locations and shops                |

`fetchAPI` collapses `result` and `code` into `status` and lifts `data` into `response`, so
**no call site has to know which base it hit**:

```js
const res = await loginUser({ email, password });   // v2 under the hood
if (res?.status) { /* success */ } else { toast.error(res?.message); }
```

It also never throws — timeouts, network errors and HTTP errors all come back in that same
envelope. A response that is *not* an envelope (a bare `[]`, HTML, plain text) is reported as a
failure rather than being treated as success, so a request that never reached its handler can't
pass silently.

One endpoint (`mapboxapi`) answers with a bare `{ suggestions: [...] }` and no envelope at all —
pass `raw: true` for those, which returns the parsed body untouched.

Endpoint names and `type` live only in `src/actions/` — nothing outside that folder knows a URL.

### Endpoint naming is inconsistent — check before assuming

Names do not follow one convention, so guessing wastes time. The address family in particular is
lowercase and un-camelled:

| Concern | Endpoint |
| ------- | -------- |
| List addresses | `getaddresses` (**not** `getAllAddress`) |
| Create / update address | `addresses` — passing `id` makes it an update |
| Delete address | `destroyaddresses` |
| Category tree | `categoryList` with `{category_type: "2"}` — **not** the dashboard's category slice; only this one has `icon` and nested `subcategories` |
| Listing search | `categoryServiceList` |
| Listing details | `buyerServiceDetails` — takes the **slug** as `service_id` |
| Wishlist list / toggle | `wishList` / `addWishList` |
| Orders | `orderList` |

## Authentication

```
<Login />          → loginUser()         v2 POST /signIn
  verified         → storeUserSession()  sets httpOnly LG_USER_ID + LG_TOKEN
                   → getUserProfile()    v1 POST /getUserDetails (id from the cookie)
                   → router.refresh()    layout re-renders, header shows the user
  not verified     → /verify-otp         no session issued

<ForgotPassword /> → sendOtp()           v2 POST /sendOTP
                   → /verify-otp         → /reset-password → resetPassword() → /login
```

`/verify-otp` serves both journeys; the flow flag in sessionStorage decides where a verified
code leads. See [src/utils/otpSession.js](src/utils/otpSession.js).

- The access token lives in an **httpOnly** cookie, so injected script cannot read it.
- `getUserProfile`, `getWishlist`, `changePassword` and `updateProfile` take **no user id
  argument** — they read it from the cookie. A client-supplied id would let anyone read or
  modify anyone else's account.
- `updateProfile` allow-lists the fields it forwards, so a crafted call can't reach `wallet`,
  role or verification columns.
- `src/proxy.js` redirects `/my-account` → `/login?redirect=…` without a session, and the auth
  routes → `/my-account` with one. `?redirect=` accepts same-origin paths only.
- The root layout seeds `<AuthProvider initialUser>` from the server, so a signed-in visitor
  never sees the header flash "Sign In".
- Changing a password signs the user out — any other session still holds a token issued
  against the old one.

## `ProductBox` — the reusable card

Every listing surface renders the same card. It takes a normalised `ProductViewModel` (from
`toProductViewModel`), never a raw API object, so any endpoint returning a service can feed it.

```jsx
import ProductBox from '@/components/theme/ProductBox';
import ProductRail from '@/components/theme/ProductRail';
import ProductGrid from '@/components/theme/ProductGrid';

<ProductRail title="Most Popular" products={topServices} viewAllHref="/search" priority />
<ProductGrid products={products} columns={4} emptyMessage="No rentals found." />
<ProductBox
  product={product}
  showListed
  showWishlist={false}
  onWishlistToggle={async (p, next) => saveWishlist(p.id, next)}  // optimistic; throw to revert
/>
```

| Prop               | Type     | Default | Notes                                                |
| ------------------ | -------- | ------- | ---------------------------------------------------- |
| `product`          | object   | —       | `ProductViewModel`; renders `null` if missing        |
| `showWishlist`     | boolean  | `true`  | Heart toggle                                         |
| `showListed`       | boolean  | `false` | "Listed" badge                                       |
| `priority`         | boolean  | `false` | Set on above-the-fold cards only (LCP)               |
| `onWishlistToggle` | function | —       | `(product, nextState)`; optimistic, reverts on throw |

Rating, location and price blocks are omitted when the API has no value, so cards never render
`0.0`, `NaN` or a dangling `/per day`.

## Wishlist

| Concern | Endpoint | Notes |
| ------- | -------- | ----- |
| Toggle  | v1 `POST /addWishList` | `{user_id, service_id}` — a **toggle**, so calling it on a saved listing removes it |
| List    | v1 `POST /wishList`    | `{user_id, type: 'Rental', page, per_page}` → `response.serviceList` + `response.pagination` |

Use `wishList`, **not** `productWishList`: the latter returns e-commerce products (brand,
stock, discount) rather than rental services. Records from `wishList` are the same shape as the
dashboard rails, so `toProductViewModel` maps them unchanged.

### How a card gets its handler

Rails and grids are rendered by **server** components, which cannot pass a function across the
boundary. So `<ProductBox />` wires itself up via `useWishlistToggle()` instead of receiving a
callback:

- **Signed out** — the id is queued in `localStorage` (`lg_guest_wishlist`) and the visitor goes
  to `/login?redirect=<current path>`. On success `<Login />` calls `mergeGuestWishlist()` to
  replay the queue, then reports how many carried over.
- **Signed in** — calls `toggleWishlist` and toasts the API's message.
- The heart is **optimistic**; the handler rejects on failure and the card reverts it.

Pass `onWishlistToggle` only to override that from a client component — the wishlist tab does,
because there an un-favourite has to remove the row and step back a page when it empties.

```jsx
// default: each card handles itself, works from a server component
<ProductGrid products={products} />

// override: parent needs to react (client component only)
<ProductGrid products={products} onWishlistToggle={handleToggle} />
```

## My Account

One file per tab under `src/components/my-account/`. `index.jsx` is only a shell: it maps
`?tab=` to a panel via `TAB_PANELS` and renders the nav from `MY_ACCOUNT_TABS`. Adding a tab
means one entry in each — nothing else changes.

| Tab | Endpoint | State |
| --- | -------- | ----- |
| My Orders | v1 `orderList` | ✅ paginated, status filter |
| My Wishlist | v1 `wishList` / `addWishList` | ✅ paginated, remove inline |
| Account details | v2 `updateProfile` + `updateProfilePicture` | ✅ editable, avatar upload |
| Manage Address | v1 `getaddresses` / `addresses` / `destroyaddresses` | ✅ list, add, edit, delete |
| Wallet | v1 `transactionHistory` | ✅ balance + paginated ledger |
| Change password | v2 `changePassword` | ✅ signs the user out after |

### Manage Address

Laid out in the reference's three groups: **General Information**, a collapsible **Address
Details** panel, and **Parcel Shop Locations**.

- **Search Address** is the primary input. It calls v1 `mapboxapi` — the API proxies Mapbox
  server-side, so this app needs **no Mapbox token of its own**. Each suggestion carries a
  `context` block that pre-splits city / state / country / postcode, so picking one fills the
  Address Details group in a single step. That group is collapsed until it has something in it.
- **Nearest Bus Stop** → `config/shop-location/list` on the admin base. Choosing one loads
  **Parcel Shop** from `config/shop/list`, filtered by `shopLocationId` (an **array**).
  Each shop carries `fullAddress`, which is what fills the highlighted **Parcel Shop Address**
  panel — no second lookup needed.
- Add and edit both open in an **antd `<Modal>`**. `destroyOnHidden` is deliberate: without it
  the form keeps the previously edited address's values on the next open.
- Create and update are the **same** endpoint; `saveAddress` adds `id` to switch to an update.
- **Why the dropdowns seed a placeholder option:** both lists load asynchronously, but the form
  is seeded synchronously when editing. A `<select>` whose value has no matching `<option>`
  silently resets to `""` — which is why an edited address used to lose its bus stop and parcel
  shop. `locationOptions` / `shopOptions` render the saved value as a provisional option until
  the real list arrives. Don't "simplify" that back to mapping the raw arrays.
- `deleteAddress` requires a session, but note the API does **not** check the address belongs to
  the caller — that authorisation belongs server-side and is worth raising with the backend team.

### Orders are single-rental, not marketplace

`orderList` returns one **service booked over a date range** — `booking_from_date`,
`booking_to_date`, `nights`, `totalBookingDays`, `depositAmount`, `rentalType`, `sellerDetails`.
There is no nested line-item array, so `toOrderViewModel` is deliberately flat and `OrderCard`
renders one listing per order. Do not reach for the ecommerce app's basket shape here.

`type` is pinned to `Rental` inside `getOrders`, so a marketplace order can never appear.

Order status arrives as a bare number with **no label** (the ecommerce API sends `statusLabel`;
this one does not). The enum, from the Postman collection:

| Code | Label |
| ---- | ----- |
| 0 | Active |
| 1 | Late |
| 2 | Cancelled |
| 3 | Delivered |
| 4 | Completed |
| 5 | Rejected — **not documented**; inferred because such orders carry `rejected_date` / `rejected_desc` with `approval_status: 3`. Confirm before relying on it. |

`ORDER_STATUS_LABELS` / `ORDER_STATUS_TONES` in [constants.js](src/lib/constants.js) are the only
place these live; unknown codes fall back to "Processing".

`orderList` also takes `type_filter` (`today` | `upcoming`) to narrow by booking window — sent
only when set, since an empty `status` means "all" but an empty `type_filter` matches nothing.

### Order detail

`/my-account/order/[id]` → `getOrderDetails`, a far richer object than a list row.

**`grand_total` includes the caution deposit.** Verified: the charge rows only reconcile to
`grand_total` once the deposit is counted (122,449.36 + 25,000 = 147,449.35). So the deposit is a
row *inside* the breakdown, not a line after the total — listing it after would read as an extra
charge on top. `money()` drops zero/empty rows so the breakdown never prints "Cleaning fee ₦ 0.00".

### Avatar upload

The action takes a `File`, not a client-built `FormData`, so `user_id` comes from the session
cookie and the type/size limits (JPG/PNG/WebP, 5 MB) are enforced server-side where the browser
cannot skip them. The API's multipart field is `profile` — not `image`, despite its error message
reading "Image is required". A local `blob:` preview shows immediately, then `refreshUser()`
swaps in the uploaded URL so the header avatar updates too.

## Design re-sync

`src/styles/icon.css` and `src/styles/style.css` are generated. When the design team ships an
update, drop it into `html/` and run:

```bash
npm run sync:design
```

The script rewrites `../images/…` URLs to `/images/…`, strips the render-blocking Google Fonts
`@import` (handled by `next/font`), copies images to `public/images`, and leaves `app.css` alone.

## Not yet wired

| Gap                         | Reason                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `/signup`                   | v2 `createAccount` exists but needs a long field chain — its own piece of work.                     |
| Manage Address              | **No endpoint on either base.** `getAllAddress`/`addAddress`/`deleteAddress` and every naming variant probed return 404. |
| Order detail page           | No order-detail endpoint (`orderDetail`, `getOrderItem`, `orderView` all 404), so `OrderCard` shows everything the list returns. |
| Order cancellation          | `cancelOrder` is 404 on both bases.                                                                |
| Booking / checkout          | No create-order endpoint exposed, so the details page's book button is disabled.                    |
| `notFound()` returns 200    | On Next 16.3, `notFound()` from `/rental/[slug]` and `/my-account/order/[id]` renders the correct 404 page but with a **200** status. A genuinely unmatched route still 404s, and it is not caused by `generateMetadata` (verified by removing it). Framework-side; the call is the correct API, so it will start working when Next fixes it. Matters for `/rental/[slug]` (public/SEO); harmless on the noindex order page. |
| Signed-out listing details  | `buyerServiceDetails` **rejects an empty `user_id`** and 500s on `"0"`, so `/rental/[slug]` asks guests to sign in. `categoryServiceList` has no such limit — worth raising with the backend team. |
| Hero date/guest pickers     | Static placeholders, as in the handover.                                                           |

Every My Account tab is now wired to a real endpoint. Where a list can come back empty, the
panel says so in the visitor's terms rather than reporting an API gap.

**Endpoints not used, and why:** v1 `forgotPassword` 500s on staging (`Table
'legally_new.customers' doesn't exist`) — the reset flow goes through v2 `sendOTP` instead,
which is what the ecommerce app does. v1 `updateUserDetails` is the **seller/professional**
profile (`professional_title`, `seller_level`, `tin`), not the buyer profile — the buyer edit
is v2 `updateProfile`.

### Unverified against a real account

Every endpoint below was confirmed to exist and to validate its input, but the success paths
need a real staging login to exercise end to end:

- `signIn` success shape — `session` in [loginUser.js](src/actions/loginUser.js) reads `id`,
  `token`/`access_token` and `verify_otp` defensively; confirm the field names on first login.
- `updateProfile` and `changePassword` return a bare `[]` for incomplete input rather than an
  envelope, so their exact required fields are taken from the ecommerce app's payloads.
- `addWishList` — required fields confirmed (`user_id`, `service_id`) but not called against a
  real account, since it mutates. `wishList` **is** verified end to end: a live response maps to
  3 products with correct pagination, images and hrefs.
- `updateProfilePicture` — multipart field name confirmed as `profile` and the response shape
  (`response.profileImageURL`) is known, but no avatar has been set on a real account.
- `orderList` **is** verified end to end: 8 live bookings map with correct dates, totals,
  deposits, hosts and pagination; the `status` filter is honoured.
- Order status **labels** are unconfirmed apart from `4` — see the My Account section.
- Address **create / update** (`addresses`) is not exercised end to end: verifying it would write
  real rows to production. Read (`getaddresses`) and both validation paths are verified, and the
  payload matches the reference app's exactly.

## Listing pages

| Page | Endpoint | Notes |
| ---- | -------- | ----- |
| `/search` | v1 `categoryServiceList` + `subCategoryList` | Chip filters, results grid, map panel, numbered pagination. |
| `/rental/[slug]` | v1 `buyerServiceDetails` | `service_id` takes the **slug**. `cache()`d so `generateMetadata` and the page body share one request. |

### Search layout

Results grid on the left, sticky map on the right; collapses to one column (map first) below
`1200px`. Filters are **chips that open popovers** — Rental Categories, Sub Category, Rental
Type, Price Range, Availability — and every one of them writes to the **URL**, never to
component state. That keeps results shareable, makes the back button correct, and means the
server component refetches with no client cache to reconcile. `PageLinks` emits real `<a href>`
so result pages stay crawlable and middle-clickable.

Sub-categories load only once a category is chosen, and changing the category clears the
sub-category under it.

**The map uses OpenStreetMap's embed** — no API key, no client library, nothing to provision.
Swap in a tile provider here if per-listing pins or clustering become a requirement; the embed
can only mark one point.

### Hero search

- **Where** — debounced autocomplete against v1 `mapboxapi` (the API proxies Mapbox, so no
  token here). Suggestions carry **no coordinates**, only `context {place, region, country}`, so
  there is no radius search to build on. Picking one stores the short place token (`Lagos`), not
  the full address, and submits it as `q` → `search_name`: the **only** place-aware filter the
  API honours. `city` and `location` are silently ignored (verified — both return the full 1775).
- **When** and the **third field** are static readouts, not inputs. They display saved state and
  open a panel; only *Where* takes typing.
- Panels open **below `.form-input-section`**, anchored to `.banner-form` (which app.css makes a
  positioning context — the handover CSS leaves it static). One panel at a time.
- Submitting collapses the hero (`form-open` removed) so the sticky pill takes over.

### The third field changes with the category

`rental_type` on the selected category picks the variant — see `HERO_EXTRA_BY_RENTAL_TYPE`.
Only attributes **verified to filter** are offered; anything the API ignored was left out.

| Category | Field | API params |
| -------- | ----- | ---------- |
| Property / Halls | Guests | `maximum_guests`, `child_members`, `adult_members` |
| Vehicle | Vehicle Details | `fuel_type`, `transmission_type`, `seating_capacity`, `year_of_manufacture` |
| Equipment | Year of Manufacture | `date_of_manufacturing` |
| Fashion | Fashion Details | `date_of_manufacturing`, `size` |
| Services / unmapped | falls back to Guests | — |

Submit only emits the active variant's params, so switching Vehicle → Fashion cannot leave a
stale `fuelType` in the URL.

**Ignored by the API** (probed, returned the unfiltered 1775 — do not add them): `number_of_seats`,
`seats`, `year`, `brand_name`, `make_brand`, `infants`, `pets`, `city`, `location`.

Enum values: `fuel_type` = PETROL · DIESEL · ELECTRIC · HYBRID, `transmission_type` = MANUAL ·
AUTOMATIC. (ELECTRIC/HYBRID and SEMI_AUTOMATIC/CVT are accepted but have no listings yet.)

Each variant verified end to end:

```
no filters                              1775
PROPERTY  + adults=2,children=1,max=4    224
VEHICLE   + PETROL/AUTOMATIC/4 seats/2022  2
EQUIPMENT + date_of_manufacturing=2022     4
FASHION   + size=M                         1
```
- Submits `?category=<id>` rather than the slug. The API resolves either, but `<ListingFilters>`
  matches `?category=` against `category.id` to decide which chip reads as selected.

> ⚠️ **The API's date filter returns nothing.** Any `start_date` on `categoryServiceList` gives
> `total: 0` — every range tried, and start-only too — while `number_of_guests` filters normally
> (383). So date search currently finds nothing regardless of availability. The picker is wired
> and the params are sent, so it will work the moment the API is fixed; until then `/search`
> shows a message naming dates as the cause instead of an ambiguous "no results".
> **Raise this with the backend team.**

> ⚠️ **No listing currently has usable coordinates.** `categoryServiceList` returns
> `l_latitude`/`l_longitude` as `"0.0"` or `""` for every record, so the map always shows its
> Lagos fallback. `toProductViewModel` maps `0.0` to `null` deliberately — 0,0 is the Gulf of
> Guinea, and plotting it would be worse than plotting nothing. The map will start working the
> moment the API returns real coordinates; no code change needed.

### Gallery

Two layouts, switched on image count:

| Images | Layout |
| ------ | ------ |
| 1–4 | one full-width image |
| 5+ | mosaic — 2 stacked · 1 large · 2 stacked |

A two-photo listing looks broken in a five-tile grid, and most listings on this API still have
exactly one, so the single-image case is the common path rather than a fallback.

Built on antd `Image.PreviewGroup`. **Images beyond the visible tiles are still rendered, hidden**
(`.gallery-hidden`) — that is what makes "Show all photos" page through the whole set instead of
just what the layout had room for. Verified: a 10-image listing has all 10 in the DOM behind 5
tiles. The main tile's hover mask is replaced with the design's "Click to Full View" label, since
antd's default "Preview" mask would otherwise sit on top of it.

`serviceAttribute` is shaped **differently** between the two: an object with `serviceImageURL`
on list responses, an **array** of `{value: url}` images on details. `toProductViewModel` and
`toServiceDetailViewModel` handle that split — don't reuse one for the other.

`rental_details` returns all four attribute blocks (vehicle / property / equipment / fashion)
with the inactive ones full of empty strings. `toAttributeRows` keeps only the block matching
`rental_type` and only its filled fields, so the page never renders an empty row.

### Design

Built from the reference app's structure and the supplied screenshot of the account nav. The
Figma file (`Pp5wLoa5CqQI35DoFbIydR`, node `9798-12324`) has **not** been consulted — it needs
an authorised Figma connector. Spacing, badge colours and the order-card layout are therefore
best-effort and worth a design review.
