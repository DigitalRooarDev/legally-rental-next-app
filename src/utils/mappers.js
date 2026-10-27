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
 * @param {object} [options]
 * @param {boolean} [options.detailed=false] Adds a vehicle's model and driving
 *   options — detail page only; the listing card stays at three specs.
 * @returns {ListingHighlight[]} Empty when the listing has none.
 */
const toHighlights = (details, rentalType, { detailed = false } = {}) => {
  if (!details || typeof details !== "object") return [];

  const count = (value, singular, icon, plural = `${singular}s`) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return { label: `${parsed} ${parsed === 1 ? singular : plural}`, icon };
  };

  if (rentalType === "VEHICLE") {
    const vehicle = details.vehicle ?? {};
    const model = detailed ? attributeText(vehicle.model) : "";
    const drivingOptions = detailed ? attributeText(vehicle.driving_options) : "";

    return [
      // `fuel_type`/`transmission_type` are `{key, value}` objects, and `{}` when
      // unset — hence reading `.value` rather than the block's truthiness.
      vehicle.fuel_type?.value ? { label: vehicle.fuel_type.value, icon: "icon-fuel-type" } : null,
      vehicle.transmission_type?.value
        ? { label: vehicle.transmission_type.value, icon: "icon-transmission-type" }
        : null,
      count(vehicle.seating_capacity, "seat", "icon-seat"),
      model ? { label: model, icon: "icon-brand-model" } : null,
      drivingOptions ? { label: drivingOptions, icon: "icon-account" } : null,
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
      key: "driving_options",
      label: "Driving Options",
      icon: "icon-account",
      read: (block) => attributeText(block.driving_options),
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
 * return one, or a refusal would be drawn as a completed return. Dispute goes
 * first for the same reason from the other side — "Dispute created" would
 * otherwise be drawn with the pencil every *created* row gets, and a dispute is
 * not one more routine step in the booking.
 */
const TIMELINE_ICONS = Object.freeze([
  { test: /disput/i, icon: "icon-warning" },
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
 * The dispute card a "Dispute created" entry carries, or `null`.
 *
 * `disputeCreated` hangs off the **entry**, not the order, so a booking disputed
 * twice carries two of them — each with its own reason, description and date. That
 * is why the card is read per entry rather than from `getOrderDetails`, whose
 * `disputeOrder` only describes the latest one.
 *
 * `dispute_date` arrives already formatted ("2026-08-25 06:49 AM") and is passed
 * through untouched: re-parsing a display string only to re-print it risks shifting
 * the time on a date the API has already decided how to say.
 */
const toTimelineDispute = (dispute) => {
  if (!dispute || typeof dispute !== "object" || !dispute.isDispute) return null;

  return {
    reasonId: String(dispute.order_quality_reason_id ?? ""),
    reason: dispute.reason || "",
    description: dispute.description || "",
    /** Both blank while the dispute is open; filled once an admin rules on it. */
    adminMessage: dispute.admin_message || "",
    refundAmount: dispute.refund_amount || "",
    /** `0` is open. Anything else means an admin has acted. */
    isResolved: String(dispute.status ?? "0") !== "0",
    raisedAt: dispute.dispute_date || "",
  };
};

/**
 * The cancellation card an "Order cancel" timeline entry carries, or `null`.
 *
 * Sibling of `toTimelineDispute` and read the same way — off the entry, not the
 * order, because `getOrderDetails` carries only bare `cancelled_date` and
 * `is_refund` fields and none of the reason, the refund figure or the penalty.
 *
 * `rental_order_cancel_reason` is the reason's **text** here, not the id the cancel
 * request posted under that same name; `message` is the API's own sentence, penalty
 * percentage and currency included, so it is printed rather than recomposed from
 * the parts — recomputing a penalty the server has already applied is how two
 * figures for one refund appear on one screen.
 */
const toTimelineCancellation = (cancellation) => {
  if (!cancellation || typeof cancellation !== "object") return null;

  const cancelledBy = cancellation.cancelled_by || "";
  const reason = cancellation.rental_order_cancel_reason || "";

  // An entry can carry `orderCancel: {}`; without either of these there is no card
  // to draw, only an empty red box.
  if (!cancelledBy && !reason) return null;

  return {
    /** "Client" | "Seller" — which side ended the booking, and the card's heading. */
    cancelledBy,
    reason,
    description: cancellation.description || "",
    isRefund: Boolean(cancellation.is_refund),
    refundAmount: cancellation.refund_amount || "",
    message: cancellation.message || "",
    cancelledAt: cancellation.cancelled_date || "",
  };
};

/**
 * The host's reason for refusing the booking, or `null`.
 *
 * Third sibling of `toTimelineDispute` and `toTimelineCancellation`, and the
 * simplest: a refusal is a sentence and a date, with no refund or penalty attached.
 *
 * `rejected_desc` is the only part worth a card — without it there is nothing the
 * row's own title ("Order rejected") does not already say.
 */
const toTimelineRejection = (rejection) => {
  if (!rejection || typeof rejection !== "object") return null;

  const description = rejection.rejected_desc || "";
  if (!description) return null;

  return { description, rejectedAt: rejection.rejected_date || "" };
};

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
 * Ordered as the API sends it — **newest first**, confirmed against a live
 * booking (ids 3442, 3427, 3426 descending) — and deliberately not re-sorted:
 * `createdAt` is a string, and sorting strings by hand is how a history ends up
 * claiming a booking completed before it was made.
 *
 * The direction matters to the view, not just here: the page fills the icon of the
 * *current* step, which is index 0 under this ordering. An earlier comment here
 * said "oldest first", and the page marked the last row accordingly — permanently
 * flagging "Order created" as the live state.
 *
 * @returns {Array<{id: string, title: string, description: string, status: string,
 *   at: string, icon: string, reason: string,
 *   attachments: Array<{id: string, url: string, name: string}>,
 *   dispute: {reason: string, description: string, adminMessage: string,
 *     refundAmount: string, isResolved: boolean, raisedAt: string}|null,
 *   cancellation: {cancelledBy: string, reason: string, description: string,
 *     isRefund: boolean, refundAmount: string, message: string,
 *     cancelledAt: string}|null,
 *   rejection: {description: string, rejectedAt: string}|null}>}
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
        /** The amber dispute card, on the entries that raised one. */
        dispute: toTimelineDispute(entry.disputeCreated),
        /** The red cancellation card, on the entry that ended the booking. */
        cancellation: toTimelineCancellation(entry.orderCancel),
        /** The host's reason, on the entry that refused the booking. */
        rejection: toTimelineRejection(entry.orderRejected),
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
    // The card's at-a-glance row, from the same source so the two cannot
    // disagree — plus model and driving options, which only the detail page shows.
    highlights: toHighlights(service.rental_details, rentalType, { detailed: true }),
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

    /**
     * The raw enum beside the label, because two features gate on the *code*, not
     * the wording: cancellation is offered at `0` only. `null` when the API sends
     * nothing — deliberately not `0`, which is a real status and would turn an
     * unknown booking into a cancellable one.
     */
    statusCode: Number.isInteger(Number.parseInt(order.status, 10))
      ? Number.parseInt(order.status, 10)
      : null,
    /**
     * True once the booking starts within 24 hours — the window has **closed**.
     *
     * Named after the interval rather than what it permits, which is the API's
     * choice and reads backwards at every call site, so every reader gets the
     * reminder: cancelling needs `is24Hours === false`.
     */
    is24Hours: Boolean(order.is24Hours),
    isReviewGiven: Boolean(order.isReviewGiven),
    /** The scores themselves, for reading back — `null` until one is left. */
    review: toOrderReview(order.orderReviewRating),
    isDispute: Boolean(order.isDispute),
    /**
     * Whether the API will accept a dispute for this booking at all.
     *
     * The server's own answer — it weighs the booking's stage and its own rules —
     * so it is read rather than re-derived here. A client that decided this for
     * itself would offer a button the endpoint then refuses.
     */
    isRentalDisputeAvailable: Boolean(order.isRentalDisputeAvailable),
    /** The dispute already on file, or `null`. */
    dispute: toOrderDispute(order.disputeOrder),
  };
};

/**
 * The review already left for this booking, or `null`.
 *
 * Mirrors what `submitReview` posted, back the other way: an overall rating and
 * comment, then one entry per question answered — its wording, its score, the
 * suggested answers ticked, and the "Others" text if there was one.
 *
 * The questions carry their own wording, so nothing here holds a fixed list to
 * label them with. That matters now the form is server-defined: a review taken
 * before a question was reworded reads back in the words it was actually asked in.
 *
 * Only questions that were answered come back — one live review returned two of the
 * four asked — so the list is rendered as given rather than padded out to the
 * current form.
 *
 * `rating` is passed through, not averaged from the per-question scores. It is
 * `overall_rating` as submitted, which is its own answer and not their mean.
 *
 * @returns {{overall: number, comment: string, questions: Array<{id: string,
 *   question: string, rating: number, comment: string,
 *   selectedOptions: Array<{id: string, label: string}>}>}|null}
 */
const toOrderReview = (review) => {
  if (!review || typeof review !== "object") return null;

  // `{}` is the API's "no review". `review_id` is what separates a record from it;
  // the questions are the fallback, in case a response ever omits the id.
  const hasReview =
    review.review_id !== undefined ||
    (Array.isArray(review.questions) && review.questions.length > 0);
  if (!hasReview) return null;

  const score = (value) => {
    const parsed = Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  return {
    overall: score(review.rating),
    comment: review.comment || "",
    questions: (Array.isArray(review.questions) ? review.questions : [])
      .filter((question) => question?.question_id !== undefined)
      .map((question) => ({
        id: String(question.question_id),
        question: question.question || "",
        rating: score(question.rating),
        /** The "Others" text, blank unless that option was ticked. */
        comment: question.comment || "",
        selectedOptions: (Array.isArray(question.selected_options) ? question.selected_options : [])
          .filter((option) => option?.id !== undefined)
          .map((option) => ({ id: String(option.id), label: option.option_text || "" }))
          .filter((option) => option.label),
      })),
  };
};

/**
 * One raised dispute, or `null` when the booking has none.
 *
 * `disputeOrder` arrives as `{}` rather than `null` when nothing is on file, so
 * the key's presence says nothing and `id` is what separates a record from the
 * empty placeholder — the same test `toOrderDetailViewModel` applies to an order.
 */
const toOrderDispute = (dispute) => {
  if (!dispute || typeof dispute !== "object" || dispute.id === undefined) return null;

  return {
    id: dispute.id,
    reasonId: String(dispute.order_quality_reason_id ?? ""),
    /**
     * The reason's wording when the API joins it in. Left blank rather than
     * guessed from the id: the reason list is a separate call, and a dispute is
     * readable without its heading but not with the wrong one.
     */
    reason: dispute.reason || dispute.orderQualityReason?.reason || "",
    description: dispute.description || "",
    raisedAt: dispute.created_at || "",
  };
};

/**
 * `reviewQuestionList` -> the review dialog's whole form.
 *
 * The questions, their wording and their suggested answers all live server-side, so
 * this reads a form rather than validating one against a fixed set: a question added
 * or reworded there appears here without a deploy, and the count is not assumed —
 * one order came back with four questions where the payload example showed two.
 *
 * `review_to` is carried through from the response rather than taken from the
 * order's `seller.id`. They agree today, but the endpoint is the one that decides
 * who a review is *about* — `review_for` can flip the direction — and the submit
 * has to name whoever this call named.
 *
 * @returns {{reviewTo: string, reviewType: string, questions: Array<{id: string,
 *   question: string, options: Array<{id: string, label: string, isOther: boolean}>}>}|null}
 */
export const toReviewForm = (response) => {
  if (!response || typeof response !== "object") return null;

  const questions = (Array.isArray(response.questions) ? response.questions : [])
    // Retired questions keep arriving so older reviews stay readable; they are not
    // asked again.
    .filter((question) => question?.id !== undefined && String(question.status ?? "1") === "1")
    .map((question) => ({
      id: String(question.id),
      question: question.question || "",
      /** Blank on every row today; sorted by anyway, so setting it starts working. */
      sortOrder: Number.parseInt(question.sort_order, 10) || 0,
      options: (Array.isArray(question.options) ? question.options : [])
        .filter((option) => option?.id !== undefined)
        .map((option) => ({
          id: String(option.id),
          label: option.option_text || "",
          /**
           * "Others" — ticking it opens a free-text box rather than standing as an
           * answer on its own. Read from the flag, never from the wording: the label
           * is editable copy, and one question already omits the option entirely.
           */
          isOther: Boolean(option.is_other),
        })),
    }));

  if (questions.length === 0) return null;

  return {
    reviewTo: String(response.review_to ?? ""),
    reviewType: String(response.review_type ?? ""),
    // `sort` is stable, so equal orders keep the sequence the API sent.
    questions: questions.sort((left, right) => left.sortOrder - right.sortOrder),
  };
};

/** `orderQualityReasonList` -> the dispute dialog's options. */
export const toDisputeReasons = (reasons) => toReasonOptions(reasons);

/**
 * `orderCancellationReasonList` -> the cancel dialog's options.
 *
 * The request already narrows by `role` and `service_type`, and the rows echo both
 * back. They are not re-filtered here: doing so would silently empty the picker if
 * the API ever labelled a row differently from the query that asked for it, and an
 * empty picker is indistinguishable from "no reasons exist".
 */
export const toCancellationReasons = (reasons) => toReasonOptions(reasons);

/**
 * The `{id, reason, status}` shape both reason endpoints answer with.
 *
 * `status` gates each row. A reason is retired by clearing that flag rather than
 * being deleted — it still arrives, and still has to resolve for older records
 * citing it — so filtering here keeps a retired reason out of the picker without
 * making the records that used it unreadable.
 */
const toReasonOptions = (reasons) =>
  (Array.isArray(reasons) ? reasons : [])
    .filter((reason) => reason?.id !== undefined && String(reason.status ?? "1") === "1")
    .map((reason) => ({
      value: String(reason.id),
      label: reason.reason || `Reason ${reason.id}`,
    }));

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

/**
 * @typedef {object} ReviewAnswer
 * @property {string} question
 * @property {string[]} answers  Options ticked, "Others" removed.
 * @property {string} comment    The free text "Others" opened; `""` when unused.
 */

/**
 * @typedef {object} BuyerReview
 * @property {string} id
 * @property {string} hostId
 * @property {string} hostName
 * @property {string} hostImage  `""` when the host has no photo — render initials.
 * @property {string} hostLocation
 * @property {string} date       Raw; the view runs it through `formatMonthYear`.
 * @property {number} rating     `overall_rating` as the host submitted it, 0 when unrated.
 * @property {ReviewAnswer[]} questions  The review in full — what the card renders.
 * @property {string} comment    Every free-text answer joined; the fallback for a
 *   payload from before `questions` existed. `""` when none was written.
 */

/**
 * "Others" is the option that opens the free-text box, not an answer in itself —
 * printing it beside the comment it produced says the same thing twice, and on a
 * question answered with nothing else it reads as a non-answer.
 */
const OTHER_OPTION = /^others?$/i;

/**
 * `what_hosts_are_saying[].questions` -> one entry per question actually answered.
 *
 * `answer` arrives as one comma-joined string ("Helpful, Respectful"), which is
 * split back apart so the view can render the options individually rather than
 * printing the API's punctuation. A question with neither an option nor a comment
 * left is dropped: it was asked, not answered.
 *
 * @param {Array<{question: string, answer: string, comment: string}>} questions
 * @returns {ReviewAnswer[]}
 */
const toReviewAnswers = (questions) =>
  (Array.isArray(questions) ? questions : [])
    .map((entry) => ({
      question: String(entry?.question ?? "").trim(),
      answers: String(entry?.answer ?? "")
        .split(",")
        .map((answer) => answer.trim())
        .filter((answer) => answer && !OTHER_OPTION.test(answer)),
      comment: String(entry?.comment ?? "").trim(),
    }))
    .filter((entry) => entry.answers.length > 0 || entry.comment);

/** The scale every rating on a review is out of. */
export const MAX_REVIEW_RATING = 5;

/**
 * `"4.3"` -> `4.3`; anything unusable -> `0`, so the card can hide the block
 * rather than print "0.00". Clamped to the scale: a payload reading `"7"` would
 * otherwise fill no stars at all, since none of them matches it.
 */
const toOverallRating = (value) => {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_REVIEW_RATING);
};

/**
 * One host review, from either endpoint that sends them.
 *
 * `buyerReviewProfile.what_hosts_are_saying` (the first reviews, inlined in the
 * profile) and `buyerReviewList.reviewData` (every page after it) send the same
 * record, so both come through here and the card never has to know which call it
 * was fetched by.
 *
 * @param {object} review
 * @returns {BuyerReview}
 */
const toBuyerReview = (review) => {
  const questions = toReviewAnswers(review.questions);

  return {
    id: String(review.review_id),
    hostId: String(review.seller_id ?? ""),
    hostName: String(review.seller_name ?? "").trim() || "Legally host",
    hostImage: review.seller_image || "",
    hostLocation: String(review.seller_address ?? review.seller_location ?? "").trim(),
    date: review.date || "",
    rating: toOverallRating(review.overall_rating),
    questions,
    /**
     * The host's own words, for the card that has room for one paragraph.
     *
     * A review no longer carries a single `comment`: the free text now hangs off
     * whichever questions were answered with "Others", so a review can hold none,
     * one or three of them. They are joined in the order asked. The old flat field
     * is still read, for a payload from before the change.
     */
    comment:
      questions
        .map((entry) => entry.comment)
        .filter(Boolean)
        .join(" ") || String(review.comment ?? "").trim(),
  };
};

/**
 * A list of host reviews. A record with no `review_id` is dropped — that is the
 * API's empty placeholder, not a review someone left blank.
 *
 * @param {unknown} list
 * @returns {BuyerReview[]}
 */
export const toBuyerReviews = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((review) => review?.review_id !== undefined)
    .map(toBuyerReview);

/**
 * @typedef {object} BuyerProfile
 * @property {string} id
 * @property {string} name
 * @property {string} location
 * @property {string} image
 * @property {string} initial
 * @property {boolean} isVerified
 * @property {string} verificationNote  The identity-verification explainer.
 * @property {string} memberSince       "December 2025", or `""`.
 * @property {string} bornIn            "Born in the 60s", or `""`.
 * @property {Array<{key: string, value: number, label: string}>} stats
 * @property {number} reviewCount       What the API counts, which can exceed `reviews.length`.
 * @property {BuyerReview[]} reviews
 */

/** A stat is dropped rather than shown as "0 Trips" — an empty row says nothing. */
const toStat = (key, value, singular, plural = `${singular}s`) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return { key, value: parsed, label: parsed === 1 ? singular : plural };
};

/**
 * "1962-04-08" -> "Born in the 60s". The profile shows the decade, never the date:
 * a full date of birth is not this page's to publish.
 *
 * `"1970-01-01"` is dropped along with `""` and `"0000-00-00"`. It is the Unix
 * epoch, which is what the API sends for a member who never gave a birthday — a
 * real one is vanishingly unlikely to land on that exact day, and "Born in the
 * 70s" printed under every unset profile is worse than printing nothing.
 */
const toBirthDecade = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw.startsWith("0000") || raw.startsWith("1970-01-01")) return "";

  const year = Number.parseInt(raw.slice(0, 4), 10);
  if (!Number.isFinite(year) || year < 1900 || year > new Date().getUTCFullYear()) return "";

  return `Born in the ${String(Math.floor(year / 10) * 10 % 100).padStart(2, "0")}s`;
};

const isTruthyFlag = (value) =>
  value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";

/** Whichever name this environment gives the KYC flag; the first one present wins. */
const VERIFICATION_FLAGS = [
  "identity_verified",
  "is_identity_verified",
  "is_verified",
  "kyc_verified",
  "verified",
];

/**
 * `buyerReviewProfile` does not send a verification flag today — it sends
 * `buyerContent`, the identity-verification explainer, and only for a member who
 * has been through the check. So the flag is read when one appears (any of the
 * names above, whichever the API settles on) and the explainer stands in until
 * then. Without the fallback the badge and the "Identity verified" row the design
 * calls for would never render at all.
 */
const toVerified = (response) => {
  const flag = VERIFICATION_FLAGS.find((key) => response[key] !== undefined);
  if (flag) return isTruthyFlag(response[flag]);
  return Boolean(String(response.buyerContent ?? "").trim());
};

/**
 * Normalises `buyerReviewProfile` — the public profile behind `/users/profile/[id]`.
 *
 * Everything the page shows arrives in this one response, reviews included, which
 * is why the "show all reviews" dialog needs no second request: it re-lists the
 * array already on the page.
 *
 * @param {object} response `buyerReviewProfile`'s `response` block.
 * @returns {BuyerProfile|null} `null` for a payload with no buyer in it, which the
 *   page turns into a 404 rather than a nameless profile.
 */
export const toBuyerProfileViewModel = (response) => {
  if (!response || typeof response !== "object" || !response.buyer_id) return null;

  const name = String(response.buyer_name ?? "").trim() || "Legally member";

  const reviews = toBuyerReviews(response.what_hosts_are_saying);

  return {
    id: String(response.buyer_id),
    name,
    location: String(response.buyerAddress ?? "").trim(),
    /** `buyerImage` is the field the endpoint sends; the rest are older spellings. */
    image:
      response.buyerImage ||
      response.buyer_image ||
      response.profileImage ||
      response.profile_image ||
      "",
    initial: name.charAt(0).toUpperCase(),
    isVerified: toVerified(response),
    /** Collapses the API's embedded newlines and indentation into one paragraph. */
    verificationNote: String(response.buyerContent ?? "").replace(/\s+/g, " ").trim(),
    memberSince: response.join_date || response.created_at || response.member_since || "",
    bornIn: toBirthDecade(response.born_in),
    stats: [
      toStat("trips", response.trips, "Trip"),
      toStat("reviews", response.reviews, "Review"),
      toStat("years", response.years_on_legally, "Year on Legally", "Years on Legally"),
    ].filter(Boolean),
    reviewCount: Number.parseInt(response.reviews, 10) || reviews.length,
    reviews,
  };
};
