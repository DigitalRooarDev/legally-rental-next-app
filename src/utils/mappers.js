import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/lib/constants";

/**
 * @typedef {object} ProductViewModel
 * @property {number|string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} href
 * @property {string} image
 * @property {string} location
 * @property {string|number} amount
 * @property {string} periodType
 * @property {string|number} rating
 * @property {number} ratingCount
 * @property {boolean} isFavorite
 * @property {string} rentalType
 * @property {string} type
 * @property {ListingHighlight[]} highlights At-a-glance specs for the card, per rental type.
 */

/**
 * @typedef {object} ListingHighlight
 * @property {string} label Ready to render — "2 rooms", "5 seats", "150 m²".
 * @property {string} icon  An `icon-*` class, or `""` where no glyph exists.
 */

/**
 * The two or three specs a card shows above the price, chosen per rental type.
 *
 * The icon is decided here rather than derived from the label in the view: only
 * this function knows a given number is a bathroom count, and `icon-${label}`
 * would ask for `icon-2 baths`.
 *
 * `rental_details` carries a block for *every* type on *every* listing — a
 * property's `vehicle` block is present and blank — so the type has to pick the
 * block; reading whichever is non-empty would put "8 seats" on a flat. Blank
 * fields are dropped rather than rendered as "0 rooms", which is why each entry
 * is guarded on the value rather than the key existing.
 *
 * @param {object} details `service.rental_details`
 * @param {string} rentalType
 * @returns {ListingHighlight[]} Empty when the listing has none.
 */
const toHighlights = (details, rentalType) => {
  if (!details || typeof details !== "object") return [];

  const count = (value, singular, icon, plural = `${singular}s`) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return { label: `${parsed} ${parsed === 1 ? singular : plural}`, icon };
  };

  if (rentalType === "VEHICLE") {
    const vehicle = details.vehicle ?? {};

    return [
      // `fuel_type`/`transmission_type` are `{key, value}` objects, and `{}` when
      // unset — hence reading `.value` rather than the block's truthiness.
      vehicle.fuel_type?.value ? { label: vehicle.fuel_type.value, icon: "icon-fuel-type" } : null,
      vehicle.transmission_type?.value
        ? { label: vehicle.transmission_type.value, icon: "icon-transmission-type" }
        : null,
      count(vehicle.seating_capacity, "seat", "icon-seat"),
    ].filter(Boolean);
  }

  if (rentalType === "PROPERTY") {
    const property = details.property ?? {};
    const area = Number.parseFloat(property.built_up_area);

    return [
      count(property.bedroom, "room", "icon-room"),
      count(property.toilet_count, "bath", "icon-bath"),
      Number.isFinite(area) && area > 0 ? { label: `${area} m²`, icon: "icon-size" } : null,
    ].filter(Boolean);
  }

  if (rentalType === "FASHION") {
    const fashion = details.fashion ?? {};
    // `size` arrives either as a bare string or as a `{key, value}` enum.
    const raw = fashion.size;
    const size = String((raw && typeof raw === "object" ? raw.value : raw) ?? "").trim();

    // Size alone. Brand and colour are on the record too, but they belong to the
    // Details table further down the page rather than the at-a-glance row.
    return size ? [{ label: size, icon: "icon-size" }] : [];
  }

  // Halls and Equipment deliberately have none: a hall is booked as a venue and
  // equipment as an item, so a rooms/baths row describes neither.
  return [];
};

/**
 * Normalises a raw API service object into the shape `<ProductBox />` renders.
 *
 * Every listing endpoint (dashboard rails, wishlist, search) returns the same
 * service shape, so one mapper serves all of them.
 *
 * @param {object} service Raw API service object.
 * @returns {ProductViewModel|null} `null` when the record is unusable.
 */
export const toProductViewModel = (service) => {
  if (!service || typeof service !== "object" || service.id === undefined) return null;

  const slug = service.slug || "";
  // `rental_details.rentalType` is the reliable one: the list endpoint leaves the
  // top-level `rental_type` undefined and only sets `rentalType`.
  const rentalType =
    service.rental_details?.rentalType || service.rental_type || service.rentalType || "";

  return {
    id: service.id,
    name: service.name || "Untitled listing",
    slug,
    href: `/rental/${slug || service.id}`,
    // `""` when the API sends none. The card then omits the image entirely rather
    // than framing a stand-in that reads as a real photo of the listing.
    image: service.serviceAttribute?.serviceImageURL || "",
    // `short_address` only. It is already the composed one-liner ("Lekki, Lagos,
    // Nigeria"), so joining city/state/country onto it repeated every part.
    location: service.short_address || "",
    amount: service.amount ?? service.vatIncludedPrice ?? service.price,
    periodType: service.period_type || service.rental_details?.period_type || "",
    rating: service.serviceRating?.rating ?? service.rating ?? "0.00",
    ratingCount: Number.parseInt(service.serviceRating?.totalRatingCount ?? 0, 10) || 0,
    isFavorite: Boolean(service.is_favorite),
    rentalType,
    type: service.type || "",
    highlights: toHighlights(service.rental_details, rentalType),
    // Used to plot results on the listing-page map; often absent.
    latitude: Number.parseFloat(service.l_latitude) || null,
    longitude: Number.parseFloat(service.l_longitude) || null,
  };
};

/** Maps a list and drops unusable records in one pass. */
export const toProductViewModels = (services) =>
  Array.isArray(services) ? services.map(toProductViewModel).filter(Boolean) : [];

/** Dedupes listings by id — the same record can appear in more than one rail. */
export const dedupeProducts = (products) =>
  Array.from(new Map(products.map((product) => [product.id, product])).values());

/**
 * @typedef {object} OrderViewModel
 * @property {number|string} id
 * @property {string} orderNumber
 * @property {string} serviceName
 * @property {string} image
 * @property {string} statusLabel
 * @property {string} statusTone
 * @property {string} grandTotal
 * @property {string} depositAmount
 * @property {string} periodType
 * @property {string} rentalType
 * @property {string} categoryName
 * @property {string} bookingFrom
 * @property {string} bookingTo
 * @property {number} nights
 * @property {number} bookingDays
 * @property {string} placedAt
 * @property {{name: string, email: string, image: string}|null} seller
 */

/**
 * Normalises one row from `orderList`.
 *
 * A rental order is a **single service booked for a date range** — there is no
 * line-item array like a marketplace order, so this is deliberately flat.
 *
 * @param {object} order Raw API order object.
 * @returns {OrderViewModel|null} `null` when the record is unusable.
 */
export const toOrderViewModel = (order) => {
  if (!order || typeof order !== "object" || order.id === undefined) return null;

  const statusKey = String(order.status ?? "");
  const seller = order.sellerDetails;

  return {
    id: order.id,
    orderNumber: order.order_number || `#${order.id}`,
    serviceId: order.service_id,
    serviceName: order.service_name || "Rental booking",
    image: order.serviceImageURL || "",
    // Unknown codes fall back to "Processing" rather than printing a bare number.
    statusLabel: ORDER_STATUS_LABELS[statusKey] ?? "Processing",
    statusTone: ORDER_STATUS_TONES[statusKey] ?? "info",
    grandTotal: order.grand_total,
    depositAmount: order.depositAmount,
    periodType: order.period_type || order.rental_details?.period_type || "",
    rentalType: order.rentalType || order.rental_details?.rentalType || "",
    categoryName: order.categoryName || "",
    bookingFrom: order.booking_from_date || "",
    bookingTo: order.booking_to_date || "",
    nights: Number.parseInt(order.nights, 10) || 0,
    bookingDays: Number.parseInt(order.totalBookingDays, 10) || 0,
    placedAt: order.createdAt || order.created_at || "",
    seller: seller
      ? {
          name: seller.fullName || "",
          email: seller.emailAddress || "",
          image: seller.profileImageURL || "",
        }
      : null,
  };
};

/** Maps a list and drops unusable records in one pass. */
export const toOrderViewModels = (orders) =>
  Array.isArray(orders) ? orders.map(toOrderViewModel).filter(Boolean) : [];

/** `rentalType` -> the `rental_details` block holding that type's attributes. */
const RENTAL_TYPE_BLOCKS = Object.freeze({
  VEHICLE: "vehicle",
  PROPERTY: "property",
  EQUIPMENT: "equipment",
  FASHION: "fashion",
  HALLS: "property",
});

/**
 * One `rental_details` field as a printable string.
 *
 * Values arrive three ways: a plain string, a `{key, value}` enum, or `{}` for an
 * enum the seller never set. Arrays (`features_list`) are not scalar rows and
 * belong to the features grid, so they collapse to `""` here and drop out.
 */
const attributeText = (raw) => {
  if (raw === undefined || raw === null) return "";
  if (Array.isArray(raw)) return "";
  const value = typeof raw === "object" ? raw.value : raw;
  if (value === undefined || value === null || typeof value === "object") return "";
  return String(value).trim();
};

/**
 * "5000" -> "5000 Kmpl". Anything that is not a bare number is left alone.
 *
 * The field takes free text, so a seller who typed "25000 km" or "18 kmpl"
 * already stated the unit — appending would give "25000 km Kmpl".
 */
const withMileageUnit = (mileage) => (/^[\d.,]+$/.test(mileage) ? `${mileage} Kmpl` : mileage);

/** "Toyota Camry (White)" — the parts that are present, in that order. */
const joinParenthetical = (lead, parenthetical) => {
  if (!lead) return parenthetical;
  return parenthetical ? `${lead} (${parenthetical})` : lead;
};

/**
 * The Details rows, per rental type: which specs, in what order, under what icon.
 *
 * A curated list rather than a dump of every filled field. The previous version
 * walked one flat label map and printed whatever the seller happened to fill in,
 * so the same page showed six rows for one listing and sixteen for the next, in
 * an order nobody chose — and it split facts that belong together, listing Make,
 * Model and Colour as three rows of one line each.
 *
 * `read` takes the whole block, not one field, which is what lets a row compose
 * several ("Petrol · 5000"). A row whose `read` returns `""` is dropped, so a
 * sparse listing still renders a short, ordered table rather than blanks.
 *
 * Icons come from the handover set in `public/images/svg`; there is no glyph for
 * furnishing or parking, so those borrow the nearest thing that reads right at
 * 18px rather than shipping a row with no icon at all.
 */
const SPEC_ROWS = Object.freeze({
  PROPERTY: [
    {
      key: "furnishing_status",
      label: "Furnishing",
      icon: "icon-furnished",
      read: (block) => attributeText(block.furnishing_status),
    },
    {
      key: "built_up_area",
      label: "Built-up area (sqm)",
      icon: "icon-sqm",
      read: (block) => attributeText(block.built_up_area),
    },
    {
      key: "bedroom",
      label: "Bedrooms",
      icon: "icon-bedroom",
      read: (block) => attributeText(block.bedroom),
    },
    {
      key: "toilet_count",
      label: "Bathroom",
      icon: "icon-bathroom",
      read: (block) => attributeText(block.toilet_count),
    },
    {
      key: "parking_availability",
      label: "Parking",
      icon: "icon-parking",
      read: (block) => attributeText(block.parking_availability),
    },
    {
      key: "check_in",
      label: "Check-in",
      icon: "icon-check-in",
      read: (block) => attributeText(block.check_in),
    },
    {
      key: "check_out",
      label: "Check-out",
      icon: "icon-check-out",
      read: (block) => attributeText(block.check_out),
    },
  ],

  VEHICLE: [
    {
      key: "make_model",
      label: "Brand & Model",
      icon: "icon-brand-model",
      read: (block) =>
        joinParenthetical(
          [attributeText(block.make_brand), attributeText(block.model)].filter(Boolean).join(" "),
          attributeText(block.color),
        ),
    },
    {
      key: "year_of_manufacture",
      label: "Year of manufacture",
      icon: "icon-calendar",
      read: (block) => attributeText(block.year_of_manufacture),
    },
    {
      key: "fuel_mileage",
      label: "Fuel & Mileage",
      icon: "icon-fuel",
      read: (block) =>
        [attributeText(block.fuel_type), withMileageUnit(attributeText(block.mileage))]
          .filter(Boolean)
          .join(" • "),
    },
    {
      key: "transmission_type",
      label: "Transmission Type",
      icon: "icon-transmission",
      read: (block) => attributeText(block.transmission_type),
    },
    {
      key: "pickup_time",
      label: "Pick-up Time",
      icon: "icon-pick-up",
      read: (block) => attributeText(block.pickup_time),
    },
    {
      key: "drop_off_time",
      label: "Drop-off Time",
      icon: "icon-drop-off",
      read: (block) => attributeText(block.drop_off_time),
    },
  ],

  EQUIPMENT: [
    {
      key: "brand_name",
      label: "Brand",
      icon: "icon-listed",
      read: (block) => attributeText(block.brand_name),
    },
    {
      key: "date_of_manufacturing",
      label: "Year of manufacture",
      icon: "icon-calendar",
      read: (block) => attributeText(block.date_of_manufacturing),
    },
    {
      key: "pickup_time",
      label: "Pick-up Time",
      icon: "icon-pick-up",
      read: (block) => attributeText(block.pickup_time),
    },
    {
      key: "drop_off_time",
      label: "Drop-off Time",
      icon: "icon-drop-off",
      read: (block) => attributeText(block.drop_off_time),
    },
  ],

  // Size alone, matching the card: the brand, measurements and pickup times are
  // on the record, but the decision was that fashion shows size and nothing else.
  FASHION: [
    {
      key: "size",
      label: "Size",
      icon: "icon-size",
      read: (block) => attributeText(block.size),
    },
  ],
});

/**
 * Rows a hall does not take, though its data comes from the same `property` block.
 *
 * A hall is a space hired by the hour or the day, not somewhere anyone sleeps —
 * bedroom and bathroom counts describe a home. The seller portal shares one form
 * across both, so those fields can still arrive filled in; they are dropped here
 * rather than trusted.
 */
const HALL_OMITTED_ROWS = new Set(["bedroom", "toilet_count"]);

/**
 * Otherwise a hall is described exactly as a property is. Derived from the
 * property list rather than copied, so a label, icon or ordering change made
 * there cannot leave halls behind.
 */
const SPEC_ROWS_BY_TYPE = Object.freeze({
  ...SPEC_ROWS,
  HALLS: SPEC_ROWS.PROPERTY.filter((row) => !HALL_OMITTED_ROWS.has(row.key)),
});

/**
 * Which rental types show a Details table. Flip a flag to change it.
 *
 * A switch rather than a deletion, because the hidden types' rows are not wrong —
 * they are turned off. Halls fill Furnishing / Built-up area / Parking / Check-in
 * / Check-out, and Equipment fills Brand / Year / Pick-up / Drop-off, all from
 * real listings. Setting either back to `true` restores its table exactly as it
 * rendered before, with no other change needed.
 *
 * Fashion is the one that would still show nothing useful: `size` is the only row
 * it was ever given, it is empty on the live listings, and the card above already
 * prints it when set.
 *
 * An unlisted type is hidden — a rental type added server-side gets no half-built
 * table on the strength of whichever fields happen to overlap an existing block.
 */
const SHOWS_DETAILS = Object.freeze({
  PROPERTY: true,
  VEHICLE: true,
  HALLS: false,
  EQUIPMENT: false,
  FASHION: false,
});

/**
 * The active rental type's Details rows, filled and in display order.
 *
 * Empty for a type whose flag is off, which is what hides the block: both the
 * listing page and the booking page already render it only when there are rows,
 * so the switch needs no change in either view.
 *
 * @returns {Array<{key: string, label: string, value: string, icon: string}>}
 */
/**
 * Icon per timeline entry, matched against its `type`.
 *
 * `type` is not an enum: the endpoint sends the sentence it wants displayed
 * ("Order created", "Rental order created"), so this matches on substrings in
 * order rather than looking up a key. Same shape as `PERIOD_UNITS` in
 * `bookingLength.js`, and for the same reason — the API owns the wording and can
 * reword it without breaking a lookup here.
 *
 * Order matters: "return declined" has to reach the decline test before the
 * return one, or a refusal would be drawn as a completed return.
 */
const TIMELINE_ICONS = Object.freeze([
  { test: /reject|declin/i, icon: "icon-declined" },
  { test: /cancel/i, icon: "icon-ordercancel" },
  { test: /refund/i, icon: "icon-refund" },
  { test: /return/i, icon: "icon-return" },
  { test: /creat/i, icon: "icon-pencil" },
  { test: /approv|accept|confirm/i, icon: "icon-check-in" },
  { test: /complet|deliver/i, icon: "icon-delivered" },
  { test: /date|reschedul|chang/i, icon: "icon-calendar" },
  { test: /pending|await|request/i, icon: "icon-pending" },
]);

/** Neutral rather than blank: an entry with no icon reads as a broken row. */
const TIMELINE_FALLBACK_ICON = "icon-my-order";

const timelineIcon = (type) =>
  TIMELINE_ICONS.find((entry) => entry.test.test(type))?.icon ?? TIMELINE_FALLBACK_ICON;

/**
 * `orderTimeline` -> the rows the booking page draws down the left of its history.
 *
 * Each entry arrives with the whole booking attached — `serviceDetails`,
 * `orderSummary`, `userDetails`, `sellerDetails`, `rental_details`, repeated in
 * full on every row. Only the handful of fields that describe *the event* are
 * kept; the rest is the same booking the page already has from
 * `getOrderDetails`, and carrying it into the view model would invite two
 * sources of truth for one price.
 *
 * Ordered as the API sends it (oldest first) and deliberately not re-sorted:
 * `createdAt` is a string, and sorting strings by hand is how a history ends up
 * claiming a booking completed before it was made.
 *
 * @returns {Array<{id: string, title: string, description: string, status: string,
 *   at: string, icon: string, reason: string,
 *   attachments: Array<{id: string, url: string, name: string}>}>}
 */
export const toTimeline = (entries) => {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      // Already the sentence to display — the endpoint sends "Order created",
      // not `ORDER_CREATED`, so it is shown as-is rather than de-slugged.
      const title = String(entry.type ?? "").trim();

      return {
        // Two entries of the same kind on one booking are ordinary, so the index
        // backs the key up rather than the type.
        id: String(entry.id ?? `${title}-${index}`),
        title,
        description: entry.description || "",
        status: entry.status || "",
        // `createdAt` here, not `created_at` — this endpoint uses camelCase where
        // `getOrderDetails` uses snake.
        at: entry.createdAt || entry.created_at || "",
        icon: timelineIcon(title),
        /**
         * Why a booking was refused. It hangs off the entry's `orderSummary`
         * rather than the entry, so it repeats on every row once set — shown only
         * where it is the point, which the decline icon already marks.
         */
        reason: /reject|declin|cancel/i.test(title)
          ? entry.orderSummary?.reject_reason || entry.reject_reason || ""
          : "",
        /**
         * Not in this endpoint's payload today. Kept because the ecommerce
         * timeline this mirrors does carry them on dispute entries, and an empty
         * array costs nothing — `<TimelineAttachments>` renders nothing for it.
         */
        attachments: (Array.isArray(entry.attachments) ? entry.attachments : [])
          .map((attachment, position) => ({
            id: String(attachment?.id ?? `${index}-${position}`),
            url: attachment?.attachment_full_path || "",
            name: attachment?.attachment || "",
          }))
          .filter((attachment) => attachment.url),
      };
    });
};

const toAttributeRows = (rentalDetails, rentalType) => {
  if (!SHOWS_DETAILS[rentalType]) return [];

  const block = rentalDetails?.[RENTAL_TYPE_BLOCKS[rentalType] ?? ""] ?? {};
  const rows = SPEC_ROWS_BY_TYPE[rentalType] ?? [];

  return rows.reduce((filled, row) => {
    const value = row.read(block);
    if (value) filled.push({ key: row.key, label: row.label, value, icon: row.icon });
    return filled;
  }, []);
};

/**
 * @typedef {object} BookingRules
 * @property {number} maxGuests       0 when the listing sets no cap.
 * @property {number} includedGuests  How many guests the nightly rate covers; 0 when unset.
 * @property {number} extraGuestFee   Per extra guest, per night. 0 when the seller charges none.
 * @property {boolean} takesGuests    Property only — see below.
 * @property {boolean} petsAllowed
 * @property {string} checkIn         "02:00 PM" — display only.
 * @property {string} checkOut        "11:00 AM"
 * @property {number} minNights
 * @property {number} maxNights
 * @property {string} advanceNotice   "Same-Day" | "1 Day" | …
 * @property {string[]} houseRules    Every rule as a printable line, in display order.
 * @property {Array<{key: string, label: string, amount: string}>} fees
 *   Per-stay charges the seller set, already filtered to the non-zero ones.
 */

/**
 * Per-stay fees, in the order the checkout summary lists them.
 *
 * All of these live on the `property` block and are `""` or `"0"` far more often
 * than not, so the list is filtered rather than rendered with zeroes.
 */
const FEE_LABELS = Object.freeze({
  cleaning_fee: "Cleaning fee",
  extra_guest_fee: "Extra guest fee",
  pet_fee: "Pet fee",
  linen_fee_per_stay: "Linen fee",
  management_fee_per_stay: "Management fee",
  community_fee_per_stay: "Community fee",
  resort_fee_per_stay: "Resort fee",
});

/**
 * The permission fields, in the order the house-rules dialog lists them.
 *
 * Each is a yes/no the seller sets. Blank counts as **not** allowed: a guest has
 * to be told the restriction before booking, and a seller who wants to permit
 * something has to say so.
 */
const HOUSE_RULE_FLAGS = Object.freeze([
  { key: "smoking_allowed", yes: "Smoking is allowed", no: "Smoking is not allowed" },
  { key: "pets_allowed", yes: "Pets are allowed", no: "Pets are not allowed" },
  {
    key: "alcohol_allowed",
    yes: "Alcohol consumption is allowed",
    no: "Alcohol consumption is not allowed",
  },
  {
    key: "visitors_allowed",
    yes: "Outside visitors are allowed",
    no: "Outside visitors are not allowed",
  },
]);

/** Only an explicit yes permits; `"No"`, `"0"` and blank all read as no. */
const toFlag = (value) =>
  ["yes", "y", "1", "true", "allowed"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );

/**
 * The booking rules the right-hand column and checkout need.
 *
 * Only Property and Halls carry these; every other type gets the same shape with
 * empty values so callers never branch on rental type just to read a guest cap.
 *
 * @returns {BookingRules}
 */
const toBookingRules = (rentalDetails, rentalType) => {
  const block = rentalDetails?.[RENTAL_TYPE_BLOCKS[rentalType] ?? ""] ?? {};
  const int = (value) => Number.parseInt(value, 10) || 0;
  const positive = (value) => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const maxGuests = int(block.maximum_guests);
  /**
   * How many guests the nightly rate already covers, before the extra-guest fee
   * starts. Clamped to the cap: a seller who typed an "included" larger than their
   * own maximum would otherwise have the note promise more guests than the
   * steppers will accept.
   */
  const includedGuests = maxGuests > 0
    ? Math.min(int(block.number_of_guests), maxGuests)
    : int(block.number_of_guests);
  /** Per extra guest, per night — the same rate `deriveExtraGuests` divides by. */
  const extraGuestFee = positive(block.extra_guest_fee);

  /**
   * Every house rule as a printable line. Built here rather than in the view so
   * the card's first three and the dialog's full list are the same sentences in
   * the same order, and the "show all" link only appears when there is more.
   *
   * The permissions are gated on the stay types: because blank reads as "not
   * allowed", an ungated version would tell a car hire that pets and smoking
   * are forbidden, off a `vehicle` block that has no such fields at all.
   */
  /**
   * "Has house-rule fields at all" — both stay types do. Local, and deliberately
   * *not* the same question as `takesGuests`: a hall has a check-in time and a
   * pets policy but is booked as a venue, not per guest.
   */
  const isStay = rentalType === "PROPERTY" || rentalType === "HALLS";
  const houseRules = [
    block.check_in ? `Check-in available after ${block.check_in}` : "",
    block.check_out ? `Checkout required before ${block.check_out}` : "",
    maxGuests > 0 ? `Maximum of ${maxGuests} guest${maxGuests === 1 ? "" : "s"} allowed` : "",
    ...(isStay ? HOUSE_RULE_FLAGS.map((rule) => (toFlag(block[rule.key]) ? rule.yes : rule.no)) : []),
  ].filter(Boolean);

  return {
    maxGuests,
    includedGuests,
    extraGuestFee,
    /**
     * Only a property is booked *per guest*. Every other type — a hall, a car, a
     * dress — is booked as the thing itself, so no party is collected and none is
     * sent to the API.
     */
    takesGuests: rentalType === "PROPERTY",
    petsAllowed: isStay && toFlag(block.pets_allowed),
    checkIn: block.check_in || "",
    checkOut: block.check_out || "",
    minNights: int(block.minimum_nights),
    maxNights: int(block.maximum_nights),
    advanceNotice: block.advance_notice || "",
    houseRules,
    fees: Object.entries(FEE_LABELS)
      .map(([key, label]) => ({ key, label, amount: money(block[key]) }))
      .filter((fee) => fee.amount !== null),
  };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every date the listing cannot be booked on, as `YYYY-MM-DD`.
 *
 * Two sources, both already in that format and both meaning "not available":
 *   `booking_dates`    — days an existing order already holds.
 *   `maintenance_date` — days the seller has blocked off.
 *
 * Merged because the calendar treats them identically; the *reason* a day is
 * unavailable is not something the booker can act on.
 *
 * `booking_dates` is taken as fully occupied, including the last day of a stay.
 * That may block a same-day turnover the seller would in fact allow, but the API
 * does not distinguish a checkout day from an occupied night, and refusing a
 * bookable day is the recoverable mistake — double-booking is not.
 */
const toUnavailableDates = (service) => {
  const merged = [
    ...(Array.isArray(service?.booking_dates) ? service.booking_dates : []),
    ...(Array.isArray(service?.maintenance_date) ? service.maintenance_date : []),
  ].filter((date) => typeof date === "string" && ISO_DATE.test(date.trim()));

  // Deduped: the two lists can name the same day, and the calendar asks per day.
  return [...new Set(merged.map((date) => date.trim()))];
};

/**
 * @typedef {object} ServiceDetailViewModel
 */

/**
 * Normalises `buyerServiceDetails` for the details page.
 *
 * Note `serviceAttribute` is shaped differently here than in list responses: an
 * **array** of `{value: url}` images rather than a single `{serviceImageURL}`.
 *
 * @param {object} response The API's `response` object (`serviceDetails` + `sellerDetails`).
 * @returns {ServiceDetailViewModel|null}
 */
export const toServiceDetailViewModel = (response) => {
  const service = response?.serviceDetails;
  if (!service || typeof service !== "object" || service.id === undefined) return null;

  const seller = response.sellerDetails;
  const rentalType = service.rental_type || service.rental_details?.rentalType || "";

  const images = (Array.isArray(service.serviceAttribute) ? service.serviceAttribute : [])
    .map((attribute) => attribute?.value)
    .filter(Boolean);

  const features = (
    service.rental_details?.[RENTAL_TYPE_BLOCKS[rentalType] ?? ""]?.features_list ?? []
  ).filter((feature) => feature?.name);

  return {
    id: service.id,
    name: service.name || "Untitled listing",
    slug: service.slug || "",
    description: service.description || "",
    // May be empty; `<ServiceGallery />` renders nothing rather than a stand-in.
    images,
    amount: service.amount ?? service.vatIncludedPrice ?? service.price,
    /** Pre-VAT list price, shown in the price breakup beside the weekend rate. */
    basePrice: service.price || "",
    weekendPrice: service.weekend_price || "",
    originalPrice: service.original_price || "",
    discountPercentage: service.discount_percentage || "",
    cautionAmount: service.caution_amount || "",
    periodType: service.period_type || service.rental_details?.period_type || "",
    /**
     * Priced by the hour, so the booking collects an hour count alongside the
     * dates and `checkoutOrder` gets an `hours` value.
     *
     * Matched loosely because `period_type` is free text from the seller portal:
     * "Per Hour" is what the API sends today, but "per hour" and "Hourly" are the
     * same listing and must not fall through to per-night pricing.
     */
    isHourly: /hour/i.test(service.period_type || service.rental_details?.period_type || ""),
    minimumBookingDay: Number.parseInt(service.minimum_booking_day, 10) || 0,
    /**
     * `short_address` when the API sends it, else the same string rebuilt.
     *
     * `buyerServiceDetails` omits `short_address` even though `categoryServiceList`
     * returns it, so the detail page had a blank location. In the list payload
     * the field is exactly `city, state, country` ("Abuja, Federal Capital
     * Territory, Nigeria"), so composing those three reproduces it verbatim —
     * `address` is deliberately not included, as that street line is what made
     * the earlier version longer than the cards.
     */
    location:
      service.short_address ||
      [service.city, service.state, service.country].filter(Boolean).join(", "),
    categoryName: service.categoryName || "",
    /**
     * What the header's category strip pre-selects from.
     *
     * `buyerServiceDetails` sends `category_id` but no `categorySlug` (the list
     * endpoint sends both), so the id is the fallback — `findCategory` resolves
     * either, and an id is exact where the rental type is not: five Equipment
     * categories share `EQUIPMENT`, but only one has id 798.
     */
    categorySlug: service.categorySlug || "",
    categoryId: service.category_id ? String(service.category_id) : "",
    rentalType,
    rating: service.serviceRating?.rating ?? "0.00",
    ratingCount: Number.parseInt(service.serviceRating?.totalRatingCount ?? 0, 10) || 0,
    isFavorite: Boolean(service.is_favorite),
    bookingOptions: service.rental_details?.booking_options || "",
    cancellationPolicy: service.rental_details?.cancellation_policies || "",
    // The same at-a-glance row the cards show, from the same source — the detail
    // page must not disagree with the card the visitor clicked to reach it.
    highlights: toHighlights(service.rental_details, rentalType),
    unavailableDates: toUnavailableDates(service),
    booking: toBookingRules(service.rental_details, rentalType),
    attributes: toAttributeRows(service.rental_details, rentalType),
    features,
    faqs: (Array.isArray(service.faqs) ? service.faqs : []).filter((faq) => faq?.question),
    seller: seller
      ? {
          id: seller.seller_id,
          name: [seller.firstName, seller.lastName].filter(Boolean).join(" "),
          image: seller.profileImage || "",
          rating: seller.rating ?? "0.00",
          ratingCount: Number.parseInt(seller.totalRatingCount ?? 0, 10) || 0,
        }
      : null,
  };
};

/** Keeps a money row out of the breakdown when the API sends 0 or "". */
const money = (value) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed !== 0 ? String(parsed) : null;
};

/**
 * Normalises `getOrderDetails` — a much richer object than an `orderList` row,
 * carrying the full price breakdown, booking window and both parties.
 *
 * Confirmed against a live booking: the record is **flat** on `response`, with the
 * gallery in `serviceAttribute` and both parties in `sellerDetails`/`userDetails`.
 *
 * @param {object} order The API's `response` object.
 */
export const toOrderDetailViewModel = (order) => {
  if (!order || typeof order !== "object" || order.id === undefined) return null;

  const statusKey = String(order.status ?? "");
  /**
   * PROPERTY / VEHICLE / EQUIPMENT / FASHION / HALLS — what drives the attribute
   * rows. Deliberately *not* `order.type`, which is the service type ("Rental" /
   * "Service") and would match no `RENTAL_TYPE_BLOCKS` key.
   */
  const rentalType = order.rentalType || order.rental_order_type || "";
  const seller = order.sellerDetails;

  /**
   * The listing photo, or `""` when the booking has none — the page hides the
   * block rather than framing a placeholder.
   *
   * `getOrderDetails` carries the gallery the same way `buyerServiceDetails` does:
   * `serviceAttribute` as an **array** of `{value: url}`. It has no
   * `serviceImageURL` field at all — that one belongs to `orderList` rows — and
   * reading the list key here is why every booking showed the placeholder.
   *
   * `is_default` wins when the seller has marked one; otherwise the first usable
   * URL, which is the same order the gallery would show.
   */
  const attributes = Array.isArray(order.serviceAttribute) ? order.serviceAttribute : [];
  const image =
    attributes.find((attribute) => Number(attribute?.is_default) === 1 && attribute?.value)?.value ||
    attributes.find((attribute) => attribute?.value)?.value ||
    order.serviceImageURL ||
    "";

  /**
   * The same grouped breakdown the checkout shows, built from the order record.
   *
   * Field names differ from `checkoutOrder`'s — snake_case here, and the deposit
   * is `depositAmount` in both — so this only translates; `buildPriceBreakdown`
   * owns the grouping, the labels and the zero-dropping.
   *
   * The caution deposit belongs *inside* the breakdown: `grand_total` already
   * includes it (verified — the rows sum to `grand_total` only once the deposit
   * is counted), so listing it after the total would read as an extra charge.
   */
  const amount = (value) => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const extraGuestFee = amount(order.extra_guest_fee_price ?? order.extra_guest_fee);
  const extraGuestRate = amount(order.extra_guest_fee);

  const itemisedDiscounts = {
    weekly: amount(order.weekly_discount),
    monthly: amount(order.monthly_discount),
    earlyBird: amount(order.early_bird_discount),
    lastMinute: amount(order.last_minute_discount),
    tripLength: amount(order.trip_length_discount),
  };

  const charges = buildPriceBreakdown({
    // `booking_price` on newer records; the older aliases are what the same figure
    // was called before, and one of them is all some bookings carry.
    rentalTotal: amount(order.booking_price ?? order.total_price ?? order.serviceBasePrice),
    nightlyTotal: amount(order.per_night_total),
    weekendTotal: amount(order.weekend_price_total),
    deposit: amount(order.depositAmount),
    fees: {
      serviceFee: amount(order.service_fee_amount),
      serviceVat: amount(order.vat_amount),
      cleaningFee: amount(order.cleaning_fee),
      petFee: amount(order.pet_fee),
      extraGuestFee,
      insurance: amount(order.insurance_amount),
      delivery: amount(order.totalDeliveryCharge),
    },
    counts: {
      pets: Number.parseInt(order.pets, 10) || 0,
      extraGuests: deriveExtraGuests(
        extraGuestFee,
        extraGuestRate,
        (Number.parseInt(order.nights, 10) || 0) || (Number.parseInt(order.hours, 10) || 0),
      ),
    },
    discounts: {
      ...itemisedDiscounts,
      /**
       * `discount` is the aggregate of the five above. Older records carry only
       * the aggregate, newer ones only the parts — showing both would deduct
       * every discount twice, so the itemised figures win when there are any.
       */
      other: Object.values(itemisedDiscounts).some((value) => value > 0)
        ? 0
        : amount(order.discount),
    },
    walletApplied: amount(order.apply_wallet_amount),
  });

  return {
    id: order.id,
    orderNumber: order.order_number || `#${order.id}`,
    serviceId: order.service_id,
    serviceName: order.service_name || "Rental booking",
    image,
    description: order.description || "",
    statusLabel: ORDER_STATUS_LABELS[statusKey] ?? "Processing",
    statusTone: ORDER_STATUS_TONES[statusKey] ?? "info",
    categoryName: order.categoryName || "",
    rentalType,
    periodType: order.period_type || order.rental_details?.period_type || "",

    bookingFrom: order.booking_from_date || "",
    bookingTo: order.booking_to_date || "",
    bookingFromTime: order.booking_from_time || "",
    bookingToTime: order.booking_to_time || "",
    nights: Number.parseInt(order.nights, 10) || 0,
    hours: Number.parseInt(order.hours, 10) || 0,
    bookingDays: Number.parseInt(order.totalBookingDays, 10) || 0,
    guests: {
      adults: Number.parseInt(order.adults, 10) || 0,
      children: Number.parseInt(order.children, 10) || 0,
      infants: Number.parseInt(order.infants, 10) || 0,
      pets: Number.parseInt(order.pets, 10) || 0,
    },

    charges,
    subtotal: order.booking_price ?? order.total_price ?? order.serviceBasePrice,
    grandTotal: order.grand_total,
    depositAmount: order.depositAmount,
    paymentType: order.payment_type || "",
    transactionNumber: order.txn_no || "",

    location: [order.address, order.address_two, order.city, order.state, order.zip_code, order.country]
      .filter(Boolean)
      .join(", "),

    // Populated only on the matching terminal state; the page shows whichever applies.
    rejectedReason: order.rejected_desc || "",
    rejectedDate: order.rejected_date || "",
    cancelledDate: order.cancelled_date || "",
    deliveredDate: order.delivered_date || "",
    completedDate: order.completed_date || "",
    placedAt: order.created_at || "",

    attributes: toAttributeRows(order.rental_details, rentalType),
    features: (
      order.rental_details?.[RENTAL_TYPE_BLOCKS[rentalType] ?? ""]?.features_list ?? []
    ).filter((feature) => feature?.name),

    seller: seller
      ? {
          id: seller.seller_id,
          name: [seller.firstName, seller.lastName].filter(Boolean).join(" "),
          email: seller.email || "",
          image: seller.profileImage || "",
          rating: seller.rating ?? "0.00",
          ratingCount: Number.parseInt(seller.totalRatingCount ?? 0, 10) || 0,
        }
      : null,

    isReviewGiven: Boolean(order.isReviewGiven),
    isDispute: Boolean(order.isDispute),
  };
};

/**
 * Normalises one row from `getaddresses`.
 *
 * Kept snake_case on the way back out for the fields the form posts, so
 * `saveAddress` can take a row straight back without a second translation.
 */
export const toAddressViewModel = (address) => {
  if (!address || typeof address !== "object" || address.id === undefined) return null;

  return {
    id: address.id,
    type: address.type || "shipping",
    name: address.name || "",
    phone: address.phone || "",
    address_line1: address.address_line1 || "",
    address_line2: address.address_line2 || "",
    city: address.city || "",
    state: address.state || "",
    country: address.country || "",
    postal_code: address.postal_code || "",
    shop_location_id: address.shop_location_id || "",
    shop_id: address.shop_id || "",
    /** Parcel shop name resolved by the API — display only. */
    shopName: address.shopName || "",
    /** Pre-joined for display so the card markup stays declarative. */
    summary: [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ]
      .filter(Boolean)
      .join(", "),
  };
};

/** Wallet ledger entry types seen from `transactionHistory`. */
const TRANSACTION_DIRECTIONS = Object.freeze({
  Deduct: "debit",
  Refund: "credit",
});

/**
 * Normalises one `transactionHistory` row.
 *
 * `direction` drives the sign and the colour. Only `Deduct` and `Refund` are
 * mapped: `Subscribed` rows are plan payments taken by Paystack (and one carries
 * `amount: "0"`), so they are *not* wallet movements and get no sign rather than a
 * guessed one — a "-20,000" against a balance that never changed would be wrong.
 *
 * @param {object} entry
 * @returns {object|null} `null` when the row is unusable.
 */
export const toTransactionViewModel = (entry) => {
  if (!entry || typeof entry !== "object" || entry.id === undefined) return null;

  const type = String(entry.transaction_type ?? "").trim();

  return {
    id: entry.id,
    type: type || "Transaction",
    direction: TRANSACTION_DIRECTIONS[type] ?? "neutral",
    amount: entry.amount ?? "0",
    description: entry.txn_desc || "",
    // "18-12-2025 06:19 PM" — day-first; `parseApiDate` handles it.
    at: entry.createdAt ?? entry.created_at ?? "",
  };
};

export const toTransactionViewModels = (entries) =>
  Array.isArray(entries) ? entries.map(toTransactionViewModel).filter(Boolean) : [];

/** `getaddresses` returns a flat array rather than the usual object envelope. */
export const toAddressViewModels = (addresses) =>
  Array.isArray(addresses) ? addresses.map(toAddressViewModel).filter(Boolean) : [];

/** Normalises the API's snake_case pagination block. */
export const toPagination = (pagination, fallbackPerPage = 10) => {
  const raw = pagination ?? {};

  return {
    currentPage: Number.parseInt(raw.current_page, 10) || 1,
    lastPage: Number.parseInt(raw.last_page, 10) || 1,
    perPage: Number.parseInt(raw.per_page, 10) || fallbackPerPage,
    total: Number.parseInt(raw.total, 10) || 0,
  };
};

/**
 * How many extra guests a billed extra-guest fee covers.
 *
 * The API bills the fee but never says how many guests it was for, and the fee is
 * charged **per guest per night** — so `extra_guest_fee_price / extra_guest_fee`
 * gives the *night* count, which is what made a single extra guest on a 4-night
 * stay read as "4 guests extra". The stay length has to divide out too.
 *
 * Returns `0` — no annotation at all — unless the division lands on a whole
 * number. A rate that turns out to be per stay rather than per night, or a fee
 * with a component this cannot see, would otherwise print a confidently wrong
 * count beside a correct figure; saying nothing is the honest failure.
 *
 * @param {number} total  `extra_guest_fee_price` — what was actually charged.
 * @param {number} rate   `extra_guest_fee` — per guest, per night.
 * @param {number} units  Nights, or hours for an hourly listing.
 */
const deriveExtraGuests = (total, rate, units) => {
  if (!(total > 0) || !(rate > 0) || !(units > 0)) return 0;

  const guests = total / (rate * units);
  // Tolerance, not exactness: the figures arrive as decimal strings.
  return Math.abs(guests - Math.round(guests)) < 0.01 && guests >= 1 ? Math.round(guests) : 0;
};

/**
 * @typedef {object} PriceLine
 * @property {string} key
 * @property {string} label
 * @property {number} amount    Always positive; `isCredit` decides the sign shown.
 * @property {string} [note]    Secondary text beside the label ("refundable").
 * @property {boolean} [isCredit]  Deducted from the total, rendered as `−amount`.
 * @property {PriceLine[]} [sublines]
 */

/**
 * @typedef {object} PriceSection
 * @property {string} key
 * @property {string} title  `""` for the opening block, which carries no heading.
 * @property {PriceLine[]} lines
 */

/**
 * Builds the grouped price breakdown: the rental block, then Fees, then Discounts.
 *
 * One builder for both screens on purpose. The checkout and the booking detail
 * page must agree line for line — a visitor who approved a figure at payment and
 * finds a differently-itemised one on the receipt has no way to tell which is
 * right, and that mismatch was the whole reason these drifted apart.
 *
 * The two endpoints disagree on field names (`serviceFeeAmount` vs
 * `service_fee_amount`, and so on), so each caller normalises into `source`
 * rather than this function learning both vocabularies.
 *
 * Zero and missing values are dropped, and a section left with no lines is
 * dropped with them — the breakdown never shows "Cleaning Fee ₦0.00" or a
 * "Discounts" heading with nothing under it.
 *
 * `Rental Amount` is `booking_price`, *not* `rentalFinalAmount`: the latter is
 * already net of the discounts and the per-stay fees, so using it here would
 * count both a second time. The sum of every section reconciles to `grandTotal`.
 *
 * @param {object} source
 * @param {number} source.rentalTotal   `booking_price` — the nights, gross.
 * @param {number} source.nightlyTotal  `per_night_total` — weekday nights, totalled.
 * @param {number} source.weekendTotal  `weekend_price_total`.
 * @param {number} source.deposit       Refundable; inside the total, not on top of it.
 * @param {object} [source.fees]        Absolute amounts, not percentages.
 * @param {object} [source.counts]      `{pets, extraGuests}` — annotate their fee labels.
 * @param {object} [source.discounts]   Positive amounts; rendered as credits.
 * @param {number} [source.walletApplied]
 * @returns {PriceSection[]}
 */
export const buildPriceBreakdown = ({
  rentalTotal = 0,
  nightlyTotal = 0,
  weekendTotal = 0,
  deposit = 0,
  fees = {},
  counts = {},
  discounts = {},
  walletApplied = 0,
}) => {
  /** Keeps a line only when the API actually priced it. */
  const line = (key, label, amount, extra = {}) =>
    amount > 0 ? { key, label, amount, ...extra } : null;

  const rentalLines = [];

  // The API's own figure. Falls back to the two halves only when the record
  // omits it — a Rental Amount of zero above a priced base and weekend line would
  // read as a bug in the total rather than a missing field.
  const rental = rentalTotal > 0 ? rentalTotal : nightlyTotal + weekendTotal;
  if (rental > 0) {
    rentalLines.push({
      key: "rental",
      label: "Rental Amount",
      amount: rental,
      // The split beneath the total, not unit prices: a stay spanning both kinds
      // of night is quoted at two different rates and the breakdown has to show
      // which part of the figure came from which.
      sublines: [
        line("base", "Service Base Price", nightlyTotal),
        line("weekend", "Service Weekend Price", weekendTotal),
      ].filter(Boolean),
    });
  }

  const depositLine = line("deposit", "Deposit Amount", deposit, { note: "refundable" });
  if (depositLine) rentalLines.push(depositLine);

  // Both fees are charged per unit, so the count is what makes the figure
  // checkable. Placed as the mobile app places them — the pet count in the label,
  // the guest count as a note under the row — so the two clients read alike.
  const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  const petCount = counts.pets > 0 ? ` (${plural(counts.pets, "pet")})` : "";
  const guestNote = counts.extraGuests > 0 ? `${plural(counts.extraGuests, "guest")} extra` : "";

  const feeLines = [
    line("fee", "Service Fee", fees.serviceFee ?? 0),
    line("vat", "Service VAT", fees.serviceVat ?? 0),
    line("cleaning", "Cleaning Fee", fees.cleaningFee ?? 0),
    line("pet", `Pet Fee${petCount}`, fees.petFee ?? 0),
    line("extra-guest", "Extra Guest Fee", fees.extraGuestFee ?? 0, { note: guestNote }),
    line("insurance", "Insurance", fees.insurance ?? 0),
    line("delivery", "Delivery", fees.delivery ?? 0),
  ].filter(Boolean);

  const credit = (key, label, amount) => line(key, label, amount, { isCredit: true });

  const discountLines = [
    credit("weekly-discount", "Weekly Discount", discounts.weekly ?? 0),
    credit("monthly-discount", "Monthly Discount", discounts.monthly ?? 0),
    credit("early-bird-discount", "Early Bird Discount", discounts.earlyBird ?? 0),
    credit("last-minute-discount", "Last Minute Discount", discounts.lastMinute ?? 0),
    credit("trip-length-discount", "Trip Length Discount", discounts.tripLength ?? 0),
    credit("discount", "Discount", discounts.other ?? 0),
    // Grouped with the discounts because it reads as one — money already held,
    // coming off what is left to pay. `key: "wallet"` keeps its green styling.
    credit("wallet", "Paid from wallet", walletApplied),
  ].filter(Boolean);

  return [
    { key: "rental", title: "", lines: rentalLines },
    { key: "fees", title: "Fees", lines: feeLines },
    { key: "discounts", title: "Discounts", lines: discountLines },
  ].filter((section) => section.lines.length > 0);
};

/**
 * @typedef {object} CheckoutQuote
 * @property {PriceSection[]} sections
 * @property {number} total       `grandTotal` — what will actually be charged.
 * @property {number} refundable  The deposit, already inside `total`.
 * @property {number} walletApplied
 * @property {number} walletBalance
 * @property {number} nights
 * @property {number} guests
 */

/**
 * Normalises `checkoutOrder` — the pricing call — into the checkout breakdown.
 *
 * This endpoint **quotes**, it does not book: it answers "Order checkout
 * successfully" with every component of the price and creates nothing. So it is
 * safe to call whenever the dates, the party or the wallet toggle change, and it
 * is the only authority on the total — the client can add up nightly × nights,
 * but only the server knows the service fee percentage, the VAT rate and how the
 * weekend nights in a range are counted.
 *
 * The shape mirrors the app's Review screen: a rental amount split into its base
 * and weekend halves, then Fees, then Discounts, totalling `grandTotal`.
 *
 * @param {object} response `checkoutOrder`'s `response` block.
 * @returns {CheckoutQuote|null}
 */
export const toCheckoutQuote = (response) => {
  if (!response || typeof response !== "object") return null;

  const num = (value) => {
    const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const rentalTotal = num(response.booking_price);
  const nightlyTotal = num(response.per_night_total);
  const weekendTotal = num(response.weekend_price_total);
  const deposit = num(response.depositAmount);
  const walletApplied = num(response.applyWalletAmount);
  const extraGuestFee = num(response.extra_guest_fee_price);
  const extraGuestRate = num(response.extra_guest_fee);

  const sections = buildPriceBreakdown({
    rentalTotal,
    nightlyTotal,
    weekendTotal,
    deposit,
    fees: {
      serviceFee: num(response.serviceFeeAmount),
      serviceVat: num(response.vatAmount),
      cleaningFee: num(response.cleaning_fee),
      petFee: num(response.pet_fee),
      extraGuestFee,
      insurance: num(response.insuranceAmount),
    },
    counts: {
      pets: Number.parseInt(response.pets, 10) || 0,
      // An hourly listing has no nights, and there the fee is charged by the hour.
      extraGuests: deriveExtraGuests(
        extraGuestFee,
        extraGuestRate,
        (Number.parseInt(response.nights, 10) || 0) || (Number.parseInt(response.hours, 10) || 0),
      ),
    },
    discounts: {
      weekly: num(response.weekly_discount),
      monthly: num(response.monthly_discount),
      earlyBird: num(response.early_bird_discount),
      lastMinute: num(response.last_minute_discount),
      tripLength: num(response.trip_length_discount),
    },
    walletApplied,
  });

  return {
    sections,
    total: num(response.grandTotal),
    /**
     * What the nights themselves cost — `booking_price`, before the deposit, the
     * fees and the discounts land. The same figure the breakdown heads with, so
     * the listing card and the checkout cannot quote the booking differently.
     *
     * Exposed separately because the listing card quotes the booking, not the
     * bill: a headline figure carrying a deposit the visitor gets back and a fee
     * they have not reached yet reads as the listing being dearer than it is.
     * `grandTotal` stays the number the checkout settles on.
     */
    rentalAmount: rentalTotal > 0 ? rentalTotal : nightlyTotal + weekendTotal,
    /**
     * Naira per one US dollar, for the PayPal option — PayPal settles in USD while
     * every figure here is in naira.
     *
     * `0` when the API omits it, which the caller must treat as "cannot convert"
     * rather than falling back to a guessed rate: showing the wrong dollar amount
     * beside a payment button is worse than showing none.
     */
    paypalRate: num(response.paypal_rate),
    /**
     * PayPal's processing percentage, e.g. `1.5`. Added on top of the converted
     * dollar amount rather than absorbed, which is why the payment step states it.
     */
    
    paypalCharges: num(response.paypal_charges),
    refundable: deposit,
    walletApplied,
    walletBalance: num(response.walletAmount),
    nights: Number.parseInt(response.nights, 10) || 0,
    guests: (Number.parseInt(response.adults, 10) || 0) + (Number.parseInt(response.children, 10) || 0),
  };
};
