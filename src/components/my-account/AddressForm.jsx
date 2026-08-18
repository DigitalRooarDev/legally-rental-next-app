"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { searchAddress } from "@/actions/searchAddress";
import { getShopLocations, getParcelShops } from "@/actions/getShopLocations";
import PhoneField from "@/components/theme/PhoneField";

const SEARCH_DEBOUNCE_MS = 350;
/** Matches the minimum the `mapboxapi` proxy will act on. */
const MIN_QUERY_LENGTH = 3;

const schema = yup.object().shape({
  name: yup.string().trim().required("Full name is required."),
  phone: yup
    .string()
    .trim()
    .required("Phone number is required.")
    // Stored without the dial code, which `phone_code` carries separately.
    .matches(/^[0-9]{6,15}$/, "Enter a valid phone number."),
  phone_code: yup.string().trim().default(""),
  address_line1: yup.string().trim().required("Address is required."),
  address_line2: yup.string().trim().default(""),
  country: yup.string().trim().required("Country is required."),
  state: yup.string().trim().required("State is required."),
  city: yup.string().trim().required("City is required."),
  postal_code: yup.string().trim().default(""),
  shop_location_id: yup.string().trim().default(""),
  shop_id: yup.string().trim().default(""),
});

/**
 * Add / edit address, laid out in the same three groups as the reference:
 * General Information, Address Details (collapsible) and Parcel Shop Locations.
 *
 * The search field is the primary input — picking a suggestion fills the
 * Address Details group, which is why that group is collapsed by default and
 * only opens when it needs attention.
 *
 * @param {object} props
 * @param {object|null} [props.address] Existing row — switches the form to edit mode.
 * @param {(values: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function AddressForm({ address, onSubmit, onCancel }) {
  const [query, setQuery] = useState(address?.address_line1 ?? "");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(address));
  const [shopLocations, setShopLocations] = useState([]);
  const [parcelShops, setParcelShops] = useState([]);
  // Set while a suggestion is being applied so the effect below doesn't
  // immediately re-search for the text we just wrote into the box.
  const skipNextSearch = useRef(true);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: address?.name ?? "",
      phone: String(address?.phone ?? "").replace(/^\+/, ""),
      phone_code: String(address?.phone_code ?? "").replace(/^\+/, ""),
      address_line1: address?.address_line1 ?? "",
      address_line2: address?.address_line2 ?? "",
      country: address?.country ?? "Nigeria",
      state: address?.state ?? "",
      city: address?.city ?? "",
      postal_code: address?.postal_code ?? "",
      shop_location_id: address?.shop_location_id ?? "",
      shop_id: address?.shop_id ?? "",
    },
  });

  // `useWatch` rather than `watch()` — the latter returns a fresh function each
  // render, which opts the whole component out of the React Compiler.
  const selectedLocationId = useWatch({ control, name: "shop_location_id" });
  const selectedShopId = useWatch({ control, name: "shop_id" });

  /**
   * Both dropdowns load asynchronously, but the form is seeded synchronously
   * when editing. A `<select>` whose value has no matching `<option>` silently
   * resets to "", which is why an edited address used to lose its bus stop and
   * parcel shop. Seeding the saved value as a provisional option keeps the
   * selection intact until the real list arrives and replaces it.
   */
  const locationOptions =
    shopLocations.length > 0
      ? shopLocations
      : address?.shop_location_id
        ? [{ id: address.shop_location_id, name: "Saved bus stop" }]
        : [];

  const shopOptions =
    parcelShops.length > 0
      ? parcelShops
      : address?.shop_id
        ? [{ id: address.shop_id, name: address.shopName || "Saved parcel shop", address: "" }]
        : [];

  const selectedShop = shopOptions.find((shop) => shop.id === selectedShopId) ?? null;

  useEffect(() => {
    let cancelled = false;

    getShopLocations()
      .then((locations) => {
        if (!cancelled) setShopLocations(locations);
      })
      .catch((error) => console.error("SHOP LOCATIONS failed", error));

    return () => {
      cancelled = true;
    };
  }, []);

  // Parcel shops depend on the chosen location, so they reload with it. The
  // "no location" case resolves to `[]` inside the async body rather than a
  // synchronous setState, which would cascade renders.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const shops = selectedLocationId ? await getParcelShops(selectedLocationId) : [];
        if (!cancelled) setParcelShops(shops);
      } catch (error) {
        console.error("PARCEL SHOPS failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedLocationId]);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      // Short queries clear the list here rather than in the effect body, so no
      // setState runs synchronously during the effect.
      if (query.trim().length < MIN_QUERY_LENGTH) {
        if (!cancelled) setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchAddress(query);
        if (!cancelled) setSuggestions(results);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  /**
   * Typing writes straight through to `address_line1`.
   *
   * The box used to be search-only, with `address_line1` written by the picker
   * alone. Editing a saved address then meant the text could be changed on
   * screen and still save the old value — the only way to actually change it was
   * to search again and take a suggestion, which is a lot to demand of someone
   * correcting a house number. The suggestions still appear while typing; they
   * are now a shortcut rather than the only road.
   */
  const handleQueryChange = (next) => {
    setQuery(next);
    setValue("address_line1", next, { shouldValidate: true });
  };

  /**
   * A picked suggestion replaces the address outright — every derived field is
   * overwritten, including with a blank where the suggestion resolved nothing.
   *
   * Keeping the old value for whatever the pick did not resolve was worse than a
   * gap: choosing a street in Abuja while the previous address said Lagos left
   * the new street sitting under the old city, and it saved that way. A blank is
   * visible and the schema already refuses to submit it; a stale value is
   * neither. `address_line2` goes with them — a flat number belongs to the
   * address it was typed for, not to the next one.
   */
  const applySuggestion = (suggestion) => {
    skipNextSearch.current = true;
    // The street, not the whole `label`: the box *is* `address_line1`, and the
    // town, region and country it also carries have their own inputs below.
    setQuery(suggestion.line1 || suggestion.label);
    setSuggestions([]);

    const replace = (field, next) =>
      // Validated only where the pick supplied something: flagging the fields it
      // could not fill the instant it is chosen reads as an error the visitor
      // made. Submitting still catches them.
      setValue(field, next, { shouldValidate: Boolean(next) });

    replace("address_line1", suggestion.line1 || suggestion.label);
    replace("address_line2", "");
    replace("city", suggestion.city || "");
    replace("state", suggestion.state || "");
    replace("country", suggestion.country || "");
    replace("postal_code", suggestion.postalCode || "");

    // Opened rather than left alone: after a replace there is always something
    // here worth checking, and sometimes a blank that has to be filled in.
    setDetailsOpen(true);
  };

  const detailFields = [
    { name: "country", label: "Country", placeholder: "Enter Country", autoComplete: "country-name" },
    { name: "state", label: "State", placeholder: "Enter State", autoComplete: "address-level1" },
    { name: "city", label: "City", placeholder: "Enter City", autoComplete: "address-level2" },
    { name: "postal_code", label: "Postal Code", placeholder: "Enter Postal Code", autoComplete: "postal-code" },
  ];

  return (
    <form className="address-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset className="address-fieldset">
        <legend className="address-group-title">General Information</legend>

        <div className="row">
          <div className="col-sm-6">
            <div className="form-group">
              <label className="form-label" htmlFor="address-name">
                Full Name
              </label>
              <input
                id="address-name"
                autoComplete="name"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                placeholder="Enter Full Name"
                {...register("name")}
              />
              {errors.name ? <p className="invalid-feedback d-block">{errors.name.message}</p> : null}
            </div>
          </div>

          <div className="col-sm-6">
            <PhoneField
              control={control}
              name="phone"
              countryCodeName="phone_code"
              setValue={setValue}
              label="Phone Number"
              error={errors.phone?.message}
            />
          </div>

          <div className="col-12">
            <div className="form-group address-search">
              {/* Named for what it is, not for the search attached to it: this
                  is Address Line 1, and typing in it is enough. */}
              <label className="form-label" htmlFor="address-search">
                Address
              </label>
              <div className="address-search-control">
                <input
                  id="address-search"
                  className={`form-control ${errors.address_line1 ? "is-invalid" : ""}`}
                  placeholder="Enter or search address.."
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={suggestions.length > 0}
                  aria-controls="address-suggestions"
                  onBlur={() => {
                    // Delayed so a click on a suggestion lands before it closes.
                    setTimeout(() => setSuggestions([]), 150);
                  }}
                />
                <span className="address-search-icon" aria-hidden="true">
                  {isSearching ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className="icon icon-search" />
                  )}
                </span>

                {suggestions.length > 0 ? (
                  <ul className="address-suggestions" id="address-suggestions" role="listbox">
                    {suggestions.map((suggestion, index) => (
                      <li key={`${suggestion.label}-${index}`}>
                        <button type="button" role="option" aria-selected="false" onClick={() => applySuggestion(suggestion)}>
                          {suggestion.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {/* Registers the field with the form; the visible box above is what
                  writes it, whether by typing or by taking a suggestion. */}
              <input type="hidden" {...register("address_line1")} />
              {errors.address_line1 ? (
                <p className="invalid-feedback d-block">{errors.address_line1.message}</p>
              ) : null}
            </div>
          </div>

          <div className="col-12">
            <div className="form-group">
              <label className="form-label" htmlFor="address-line2">
                Address Line 2
              </label>
              <input
                id="address-line2"
                autoComplete="address-line2"
                className="form-control"
                placeholder="Enter Address Line 2"
                {...register("address_line2")}
              />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="address-fieldset address-fieldset--grouped">
        <button
          type="button"
          className="address-group-toggle"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="address-details-group"
        >
          <span className="address-group-title">Address Details</span>
          <i className={`icon icon-chevron-${detailsOpen ? "up" : "down"}`} aria-hidden="true" />
        </button>

        <div id="address-details-group" hidden={!detailsOpen}>
          <div className="row">
            {detailFields.map((field) => (
              <div className="col-sm-6" key={field.name}>
                <div className="form-group">
                  <label className="form-label" htmlFor={`address-${field.name}`}>
                    {field.label}
                  </label>
                  <input
                    id={`address-${field.name}`}
                    autoComplete={field.autoComplete}
                    className={`form-control ${errors[field.name] ? "is-invalid" : ""}`}
                    placeholder={field.placeholder}
                    {...register(field.name)}
                  />
                  {errors[field.name] ? (
                    <p className="invalid-feedback d-block">{errors[field.name].message}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="address-fieldset">
        <legend className="address-group-title">Parcel Shop Locations</legend>

        <div className="row">
          <div className="col-sm-6">
            <div className="form-group">
              <label className="form-label" htmlFor="address-shop-location">
                Nearest Bus Stop
              </label>
              <select
                id="address-shop-location"
                className="form-control form-select"
                {...register("shop_location_id", {
                  // Changing the location invalidates whatever shop was chosen.
                  onChange: () => setValue("shop_id", ""),
                })}
              >
                <option value="">Select Nearest Bus Stop</option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-sm-6">
            <div className="form-group">
              <label className="form-label" htmlFor="address-shop">
                Parcel Shop
              </label>
              <select
                id="address-shop"
                className="form-control form-select"
                disabled={!selectedLocationId || shopOptions.length === 0}
                {...register("shop_id")}
              >
                <option value="">
                  {selectedLocationId && shopOptions.length === 0
                    ? "No shops at this stop"
                    : "Select Parcel Shop"}
                </option>
                {shopOptions.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedShop?.address ? (
            <div className="col-12">
              <div className="parcel-shop-address">
                <div className="parcel-shop-address-title">Parcel Shop Address:</div>
                <p>{selectedShop.address}</p>
              </div>
            </div>
          ) : null}
        </div>
      </fieldset>

      {/* Kept inside the <form> so Enter submits and the button is a real submit. */}
      <div className="address-form-actions">
        <button type="submit" className="btn btn-save" disabled={isSubmitting}>
          {isSubmitting ? "SAVING…" : address ? "UPDATE ADDRESS" : "SAVE ADDRESS"}
        </button>
        <button type="button" className="btn btn-label" onClick={onCancel} disabled={isSubmitting}>
          CANCEL
        </button>
      </div>
    </form>
  );
}
