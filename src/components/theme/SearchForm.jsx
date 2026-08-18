'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions';
import DateRangeCalendar from '@/components/theme/DateRangeCalendar';
import { fromISO } from '@/utils/calendarDates';
import PlaceSearchField from '@/components/theme/PlaceSearchField';
import HeroExtraPanel, {
  EMPTY_EXTRA,
  extraToParams,
  readExtraFromParams,
  summariseExtra,
} from '@/components/theme/HeroExtraPanel';
import { useActiveCategory } from '@/context/activeCategoryContext';
import { categoryParam, findCategory } from '@/lib/categories';
import { FALLBACK_CATEGORIES, HERO_EXTRA_BY_RENTAL_TYPE, HERO_EXTRA_LABELS } from '@/lib/constants';

const EMPTY_GUESTS = Object.freeze({ adults: 0, children: 0, infants: 0, pets: 0 });

/** "20 Aug" — the collapsed pill and the When field have no room for the year. */
const PILL_DATE_FORMAT = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' });

/**
 * Only the home page shows the hero expanded on load. Everywhere else in
 * `SEARCH_ROUTES` the header collapses to the top bar and the condensed pill is
 * the way into search.
 *
 * Exported because `<HeaderShell>` marks the same routes with `full-header`, and
 * a header that says "full" while this file renders no hero would be worse than
 * either alone.
 */
export const HERO_ROUTES = ['/'];

/**
 * Search only belongs on pages a search can act on — the home hero, the results
 * page, and a listing's own page so a visitor can search on from it. An
 * allowlist rather than a blocklist: a new account or checkout route should
 * inherit "no search" without anyone remembering to add it.
 */
const SEARCH_ROUTES = ['/', '/search', '/rental'];

/**
 * `/rental` matches a listing — `/rental/<slug>` — but nothing nested under it.
 *
 * A plain `startsWith` also matched `/rental/<slug>/checkout`, which put the
 * search pill on top of a booking being paid for. That contradicted the allowlist
 * above, which already says a checkout route should inherit "no search": the
 * prefix quietly opted it back in. Depth rather than a named exception, so any
 * future `/rental/<slug>/…` step stays out too.
 *
 * `/` must stay an exact match or it would match every route in the app.
 */
const matchesRoute = (pathname, route) => {
  if (pathname === route) return true;
  if (route === '/' || !pathname.startsWith(`${route}/`)) return false;

  // Trailing slash trimmed first, so `/rental/<slug>/` is still the listing.
  const rest = pathname.slice(route.length + 1).replace(/\/$/, '');
  return rest.length > 0 && !rest.includes('/');
};

/**
 * Reads the committed search back out of the URL.
 *
 * The URL is the source of truth and the form is a draft of it — seeding from
 * here is what survives a refresh, a shared link and back/forward. `category`
 * is resolved against the live options rather than used as-is, so a stale or
 * unknown token seeds "no category" instead of a chip that matches nothing.
 */
function readSearchState(params, options) {
  const matched = findCategory(options, params.get('category'));

  return {
    category: matched ? categoryParam(matched) : null,
    /**
     * Two params, because the field shows one thing and filters by another:
     * `address` is the full address the user picked and is display-only, while
     * `city` is the town and the only half that reaches the API. Without
     * `address` in the URL, a refresh or a shared link would replace the chosen
     * address with the bare town.
     */
    location: params.get('address') ?? params.get('city') ?? params.get('q') ?? '',
    place: params.get('city') ?? params.get('q') ?? '',
    dates: [params.get('startDate') ?? '', params.get('endDate') ?? ''],
    extra: readExtraFromParams(params),
  };
}

/**
 * Hero search form + the condensed sticky search bar.
 *
 * Body classes are what the design CSS keys off, so they are driven here rather
 * than through React state on the markup:
 *
 *   `scrolled`   home page, past the fold — reveals the pill
 *   `form-open`  the hero is showing over the page
 *
 * Which pages collapse the 300px hero spacer is *not* decided here: that is
 * `.full-header` on the header itself, set from the route by `<HeaderShell>`.
 *
 * @param {object} props
 * @param {Array<{id: string|number, name: string, slug: string, image_full_path?: string}>} [props.categories]
 */
export default function SearchForm({ categories = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupName = useId();

  const hasHero = HERO_ROUTES.includes(pathname);
  const isVisible = SEARCH_ROUTES.some((route) => matchesRoute(pathname, route));

  const options = useMemo(
    () => (Array.isArray(categories) && categories.length > 0 ? categories : FALLBACK_CATEGORIES),
    [categories],
  );

  const committed = useMemo(() => readSearchState(searchParams, options), [searchParams, options]);

  // Seeded, not empty: a refresh or a shared `/search?...` link has to come back
  // with the form already reflecting the results on screen.
  const [selectedCategory, setSelectedCategory] = useState(committed.category);

  // `location` is what the user sees; `place` is the short token actually sent to
  // the API. They differ once a suggestion is picked ("Lekki, Lagos" vs "Lagos").
  const [location, setLocation] = useState(committed.location);
  const [place, setPlace] = useState(committed.place);
  const {
    suggestions: places,
    suppress: suppressPlaceQuery,
    clear: clearPlaces,
  } = usePlaceSuggestions(location, committed.location);
  const [dates, setDates] = useState(committed.dates);
  const [extra, setExtra] = useState(committed.extra);

  /**
   * `null` | `'where'` | `'dates'` | `'extra'` — the one field currently in play.
   *
   * A single value rather than a flag per field: focusing any field implicitly
   * closes the others, which is what makes clicking Where while the calendar is
   * open dismiss it. Two independent booleans could not express that.
   */
  const [activeField, setActiveField] = useState(null);
  const openPanel = activeField === 'dates' || activeField === 'extra' ? activeField : null;

  const datesTriggerRef = useRef(null);
  const extraTriggerRef = useRef(null);

  // Swiper owns the category strip's scroll position; the arrows are plain buttons
  // driving the instance, which keeps their existing markup and disabled states.
  const categorySwiper = useRef(null);
  const [categoryNav, setCategoryNav] = useState({ atStart: true, atEnd: true });

  // freeMode drags without firing slideChange, so this hangs off onProgress too.
  const syncCategoryNav = useCallback((swiper) => {
    setCategoryNav({ atStart: swiper.isBeginning, atEnd: swiper.isEnd });
  }, []);

  /**
   * Re-seed the draft when the URL itself changes — submitting, back/forward, or
   * a link into `/search`. Keyed on the serialised params and guarded by a ref so
   * it fires once per distinct URL; running on every render would overwrite what
   * the user is typing.
   */
  const paramsKey = searchParams.toString();
  const appliedParamsKey = useRef(paramsKey);

  useEffect(() => {
    if (appliedParamsKey.current === paramsKey) return;
    appliedParamsKey.current = paramsKey;

    suppressPlaceQuery(committed.location);

    setSelectedCategory(committed.category);
    setLocation(committed.location);
    setPlace(committed.place);
    clearPlaces();
    setDates(committed.dates);
    setExtra(committed.extra);
    setActiveField(null);
  }, [paramsKey, committed, suppressPlaceQuery, clearPlaces]);

  /**
   * What the strip falls back to when nothing has been picked and the URL names
   * no category: on a listing page, that listing's own category, so opening a
   * Property shows Property selected — and with it the right third field.
   * Elsewhere it stays the first option.
   */
  const detailCategory = useActiveCategory();
  const fallbackOption =
    // Resolved rather than string-matched: a listing page publishes a slug when
    // it has one and a category id when it does not.
    findCategory(options, detailCategory.categorySlug) ??
    // Several Equipment categories share a rental type, so this is a hint, not
    // an identity — first match is the best available guess when the API omits
    // the slug.
    options.find(
      (option) => detailCategory.rentalType && option.rentalType === detailCategory.rentalType,
    ) ??
    options[0];

  // Derived rather than synced in an effect: when the category list changes and the
  // current pick is no longer in it, this falls back on its own.
  const activeCategory =
    selectedCategory && options.some((option) => categoryParam(option) === selectedCategory)
      ? selectedCategory
      : categoryParam(fallbackOption);

  useEffect(() => {
    const body = document.body;

    // if (!isVisible) {
    //   body.classList.remove('scrolled', 'form-open');
    //   return undefined;
    // }

    const onScroll = () => {
      // On inner pages the pill is permanently visible, so there is nothing for
      // the scroll position to reveal.
      if (!hasHero) return;

      const scrolled = window.scrollY > 300;
      body.classList.toggle('scrolled', scrolled);
      // Scrolling back to the top puts the real hero on screen again.
      if (!scrolled) body.classList.remove('form-open');
    };

    const onDocumentClick = (event) => {
      const { target } = event;

      // React's handler has already run by the time the event reaches document,
      // so anything it unmounted — a picked suggestion, a spent clear button — is
      // now detached, and `closest()` on a detached node finds no ancestors. That
      // read as "clicked outside" and closed the hero on inner pages. An element
      // this app just removed is by definition not a click away from it.
      if (!target.isConnected) return;

      // A click inside an open panel — including antd's calendar, which can
      // portal out of the form — is never a click away from it. Clicks on the
      // fields themselves are left alone: their own handlers set `activeField`,
      // which closes whatever was open before.
      const insideSearch =
        target.closest('.hero-panel') ||
        target.closest('.ant-picker-dropdown') ||
        target.closest('.form-input-section');

      if (insideSearch) return;

      setActiveField(null);

      /**
       * `.banner-form`, not `.header-main`.
       *
       * The hero *lives inside* the header, so excluding the whole header excluded
       * the hero's surroundings along with it: the gradient either side of the
       * form, the logo, the account menu — and below `lg`, where the open header
       * is a fixed 300px band across the top, most of what a visitor would read
       * as "outside". Clicking there did nothing, which is what made the hero feel
       * stuck open.
       *
       * The form itself is what must not dismiss on click, and that is exactly
       * `.banner-form`. Its fields and panels never reach this line — `insideSearch`
       * above returns first — so this only has to catch the rest of it: the
       * category strip, the padding, the close button's own frame.
       */
      if (!target.closest('.form-input-section-sticky') && !target.closest('.banner-form')) {
        body.classList.remove('form-open');
      }
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      // Close the open field first; only a second Escape dismisses the hero.
      setActiveField(null);
      body.classList.remove('form-open');
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
      body.classList.remove('scrolled', 'form-open');
    };
  }, [isVisible, hasHero]);

  const selectPlace = (suggestion) => {
    suppressPlaceQuery(suggestion.label);
    setLocation(suggestion.label);
    setPlace(suggestion.place || suggestion.label);
    clearPlaces();

    // Picking a destination advances to dates, the way the design reads.
    setActiveField('dates');
    datesTriggerRef.current?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();

    // The slug, not the id: `/search` resolves it back to the `category_id` the
    // API wants, and the URL stays readable and stable across a renumbering.
    const category = categoryParam(activeOption);
    if (category) params.set('category', category);

    // `city` filters, `address` only displays. `current_city` matches a
    // listing's own city exactly, so it gets the town off the picked suggestion
    // — while the full address the user chose rides along to be shown back.
    const address = location.trim();
    const city = (place || location).trim();

    if (city) params.set('city', city);
    if (address && address !== city) params.set('address', address);

    if (dates[0]) params.set('startDate', dates[0]);
    if (dates[1]) params.set('endDate', dates[1]);

    // Only the attributes the active category actually offers — switching from
    // Vehicle to Fashion must not leave a stale `fuelType` in the URL.
    Object.entries(extraToParams(extraVariant, extra)).forEach(([key, entry]) => {
      params.set(key, entry);
    });

    setActiveField(null);
    // Collapse the hero so the sticky pill takes over on the results page.
    document.body.classList.remove('form-open');

    router.push(`/search?${params.toString()}`);
  };

  const activeOption =
    options.find((option) => categoryParam(option) === activeCategory) ?? options[0];

  // Which third field the selected category calls for. Services and anything
  // unmapped fall back to guests.
  const extraVariant = HERO_EXTRA_BY_RENTAL_TYPE[activeOption?.rentalType] ?? 'guests';
  const extraLabels = HERO_EXTRA_LABELS[extraVariant];
  const extraSummary = summariseExtra(extraVariant, extra);

  const dateSummary = [dates[0], dates[1]]
    .map(fromISO)
    .filter(Boolean)
    .map((date) => PILL_DATE_FORMAT.format(date))
    .join(' – ');

  // if (!isVisible) return null;

  return (
    <>
      <div
        className={`form-input-section-sticky ${isVisible ? '' : 'd-lg-none'}`}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          document.body.classList.add('form-open');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            document.body.classList.add('form-open');
          }
        }}
      >
        <div>
          {/* Guarded on the same field it renders — checking `image_full_path`
              here rendered a broken <img> for any category without an `icon`. */}
          {activeOption?.icon ? (
            /* eslint-disable-next-line @next/next/no-img-element -- remote category icons vary in size; no optimisation needed at 20px */
            <img src={activeOption.icon} alt="" width={20} height={20} />
          ) : null}
          <span>{location.trim() || 'Anywhere'}</span>
        </div>
        {/* The pill is the collapsed form, so it reads back the same three values
            the form holds — the third one follows the category's rental type. */}
        <div>{dateSummary || 'Anytime'}</div>
        <div>{extraSummary || extraLabels.placeholder}</div>
        
        <button type="button" aria-label="Open search">
          <i className="icon icon-search" aria-hidden="true" />
        </button>
      </div>

      <div className="banner-section">
        <div className="container">
          <div className="banner-form">
            <form onSubmit={handleSubmit}>
              <div
                className={`form-category-section ${categoryNav.atStart ? 'slider-start' : ''}${categoryNav.atEnd ? 'slider-end' : ''}`}
              >
                <button
                  type="button"
                  className="prev-btn"
                  onClick={() => categorySwiper.current?.slidePrev()}
                  disabled={categoryNav.atStart}
                  aria-label="Previous categories"
                >
                  <i className="icon icon-chevron-left" aria-hidden="true" />
                </button>
                <Swiper
                  className="radio-section"
                  modules={[FreeMode]}
                  slidesPerView="auto"
                  spaceBetween={0}
                  freeMode={{ enabled: true, momentumBounce: false }}
                  slideToClickedSlide={true}
                  watchOverflow
                  // The hero is shown/hidden by body classes, so the strip can init at
                  // zero width; these re-measure once it is actually on screen.
                  observer
                  observeParents
                  onSwiper={(swiper) => {
                    categorySwiper.current = swiper;
                    syncCategoryNav(swiper);
                  }}
                  onProgress={syncCategoryNav}
                  onResize={syncCategoryNav}
                >
                  {options.map((option) => (
                    <SwiperSlide key={option.id ?? option.slug}>
                      <label>
                        <input
                          type="radio"
                          name={groupName}
                          value={categoryParam(option)}
                          checked={activeCategory === categoryParam(option)}
                          onChange={() => setSelectedCategory(categoryParam(option))}
                        />
                        <span>
                          {option.icon ? (
                            /* eslint-disable-next-line @next/next/no-img-element -- see note above */
                            <img src={option.icon} alt="" width={24} height={24} />
                          ) : null}{' '}
                          {option.name}
                        </span>
                      </label>
                    </SwiperSlide>
                  ))}
                </Swiper>
                <button
                  type="button"
                  className="next-btn"
                  onClick={() => categorySwiper.current?.slideNext()}
                  disabled={categoryNav.atEnd}
                  aria-label="Next categories"
                >
                  <i className="icon icon-chevron-right" aria-hidden="true" />
                </button>
              </div>

              <div className="form-input-section">
                <div className={`form-input-group ${activeField === 'where' ? 'active' : ''}`}>
                  <PlaceSearchField
                    id="search-location"
                    value={location}
                    suggestions={places}
                    // Focusing Where is what closes an open calendar, so the
                    // list only shows while Where is the field in play.
                    open={activeField === 'where'}
                    onChange={setLocation}
                    onFocus={() => setActiveField('where')}
                    onClear={() => {
                      setLocation('');
                      setPlace('');
                      clearPlaces();
                      setActiveField('where');
                    }}
                    onSelect={selectPlace}
                  />
                </div>

                <div className={`form-input-group ${activeField === 'dates' ? 'active' : ''}`}>
                  <div className="form-input-inner">
                    <label htmlFor="search-dates">When</label>
                    <button
                      type="button"
                      ref={datesTriggerRef}
                      className={`form-input form-input--button ${dateSummary ? 'has-value' : ''}`}
                      onClick={() =>
                        setActiveField((field) => (field === 'dates' ? null : 'dates'))
                      }
                      aria-expanded={activeField === 'dates'}
                      aria-haspopup="dialog"
                    >
                      {dateSummary || 'Add Dates'}
                    </button>
                    {dateSummary ? (
                      <button
                        type="button"
                        className="field-clear"
                        onClick={() => {
                          setDates(['', '']);
                          setActiveField('dates');
                        }}
                        aria-label="Clear dates"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`form-input-group form-input-group--last ${
                    activeField === 'extra' ? 'active' : ''
                  }`}
                >
                  <div className="form-input-inner">
                    <label htmlFor="search-extra">{extraLabels.label}</label>
                    <button
                      type="button"
                      ref={extraTriggerRef}
                      className={`form-input form-input--button ${extraSummary ? 'has-value' : ''}`}
                      onClick={() =>
                        setActiveField((field) => (field === 'extra' ? null : 'extra'))
                      }
                      aria-expanded={activeField === 'extra'}
                      aria-haspopup="dialog"
                    >
                      {extraSummary || extraLabels.placeholder}
                    </button>
                    {extraSummary ? (
                      <button
                        type="button"
                        className="field-clear"
                        onClick={() => {
                          setExtra(EMPTY_EXTRA);
                          setActiveField('extra');
                        }}
                        aria-label={`Clear ${extraLabels.label.toLowerCase()}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>

                  <div className="form-button-group">
                    <button type="submit">
                      <i className="icon icon-search" aria-hidden="true" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </div>
              {openPanel ? (
                <div
                  className={`hero-panel hero-panel--${openPanel}`}
                  role="dialog"
                  aria-label={openPanel === 'dates' ? 'Dates' : extraLabels.label}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    // Enter inside a panel field would otherwise submit the form.
                    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
                      event.preventDefault();
                    }
                  }}
                >
                  {openPanel === 'dates' ? (
                    /* The calendar *is* the panel — the When button above is
                       already the trigger, so no field is needed in here.
                       `minNights: 0` because this searches listings rather than
                       booking one: a single day is a valid hire. */
                    <DateRangeCalendar
                      className="hero-dates-calendar"
                      value={{ from: dates[0], to: dates[1] }}
                      minNights={0}
                      onChange={({ from, to }) => {
                        setDates([from, to]);
                        // Both ends chosen — move the user on to the last field.
                        if (from && to) {
                          setActiveField('extra');
                          extraTriggerRef.current?.focus();
                        }
                      }}
                    />
                  ) : (
                    <HeroExtraPanel variant={extraVariant} value={extra} onChange={setExtra} />
                  )}
                </div>
              ) : null}
            </form>

            {/* The way out of the open hero.
                Below `lg` the pill expands the hero over the page behind a
                backdrop, and until now nothing dismissed it: the desktop escape
                is scrolling back up, which a touch user cannot do while the
                hero covers the scroller. `activeField` is cleared alongside the
                body class so reopening does not restore whichever panel happened
                to be open when it was dismissed.

                Hidden above the breakpoint by CSS rather than by a viewport
                check here — a media query cannot be wrong about the width, and
                this component already renders on the server. */}
            <button
              type="button"
              className="banner-form-close d-lg-none"
              onClick={() => {
                setActiveField(null);
                document.body.classList.remove('form-open');
              }}
              aria-label="Close search"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
