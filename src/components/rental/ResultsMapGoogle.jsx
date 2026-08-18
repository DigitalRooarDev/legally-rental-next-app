'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useMap,
} from '@vis.gl/react-google-maps';
import { CURRENCY_SYMBOL } from '@/lib/constants';

/** Fallback view when nothing in the result set is geocoded: Lagos. */
const FALLBACK_CENTRE = { lat: 6.5244, lng: 3.3792 };
const FALLBACK_ZOOM = 11;
/** Bounds around a single pin collapse to a point; this is the zoom used instead. */
const SINGLE_POINT_ZOOM = 14;

/**
 * Advanced markers are only rendered on a map that has a cloud-styled Map ID.
 * `DEMO_MAP_ID` is Google's own development id — fine locally, but it watermarks
 * the map and is rate-limited, so production should set a real one.
 */
const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

const formatAmount = (amount) => {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value)) return '';

  return `${CURRENCY_SYMBOL}${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
};

/**
 * Frames the map on the current results.
 *
 * A child of `<Map>` rather than a prop because it drives the map instance
 * imperatively — `fitBounds` is the only way to frame an arbitrary set of pins,
 * and it has to re-run whenever a filter changes the result set.
 */
function FitToResults({ points }) {
  const map = useMap();

  // Keyed on the coordinates themselves: `points` is a fresh array every render,
  // so depending on it directly would refit the map continuously and fight the
  // user's own panning.
  const key = points.map((point) => `${point.latitude},${point.longitude}`).join('|');

  useEffect(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.setCenter({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(SINGLE_POINT_ZOOM);
      return;
    }

    // A bounds literal rather than `new google.maps.LatLngBounds()`: it needs no
    // reference to the global the loader installs, so this cannot race the API.
    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);

    map.fitBounds(
      {
        north: Math.max(...latitudes),
        south: Math.min(...latitudes),
        east: Math.max(...longitudes),
        west: Math.min(...longitudes),
      },
      48,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands in for `points`; see above
  }, [map, key]);

  return null;
}

/**
 * Interactive results map: one price pin per located listing, and the listing's
 * card on click.
 *
 * @param {object} props
 * @param {string} props.apiKey
 * @param {string} [props.mapId]
 * @param {Array<object>} props.points  Listings with finite coordinates.
 */
export default function ResultsMapGoogle({ apiKey, mapId, points }) {
  const [selectedId, setSelectedId] = useState(null);

  const selected = useMemo(
    () => points.find((point) => point.id === selectedId) ?? null,
    [points, selectedId],
  );

  const centre = points.length
    ? { lat: points[0].latitude, lng: points[0].longitude }
    : FALLBACK_CENTRE;

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId={mapId || DEFAULT_MAP_ID}
        defaultCenter={centre}
        defaultZoom={points.length ? SINGLE_POINT_ZOOM : FALLBACK_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        className="results-map-canvas"
        // Clicking the map itself, not a pin, dismisses the open card.
        onClick={() => setSelectedId(null)}
      >
        <FitToResults points={points} />

        {points.map((point) => (
          <AdvancedMarker
            key={point.id}
            position={{ lat: point.latitude, lng: point.longitude }}
            title={point.name}
            onClick={() => setSelectedId(point.id)}
            zIndex={point.id === selectedId ? 2 : 1}
          >
            <span className={`map-pin ${point.id === selectedId ? 'active' : ''}`}>
              {formatAmount(point.amount) || 'View'}
            </span>
          </AdvancedMarker>
        ))}

        {selected ? (
          <InfoWindow
            position={{ lat: selected.latitude, lng: selected.longitude }}
            pixelOffset={[0, -12]}
            onCloseClick={() => setSelectedId(null)}
            headerDisabled
          >
            <Link href={selected.href} className="map-card">
              <button
                type="button"
                className="map-card-close"
                onClick={(event) => {
                  // The card is one big link; the close button must not follow it.
                  event.preventDefault();
                  setSelectedId(null);
                }}
                aria-label="Close"
              >
                ×
              </button>

              {selected.image ? (
                /* eslint-disable-next-line @next/next/no-img-element -- remote listing images are unoptimised elsewhere in the app too */
                <img src={selected.image} alt="" className="map-card-img" loading="lazy" />
              ) : null}

              <div className="map-card-body">
                <strong className="map-card-title">{selected.name}</strong>
                {Number.parseFloat(selected.rating) > 0 ? (
                  <span className="map-card-rating">
                    <i className="icon icon-star" aria-hidden="true" />
                    {selected.rating}
                    {selected.ratingCount ? ` (${selected.ratingCount})` : ''}
                  </span>
                ) : null}
                <span className="map-card-price">
                  {formatAmount(selected.amount)}
                  {selected.periodType ? <small> /{selected.periodType}</small> : null}
                </span>
              </div>
            </Link>
          </InfoWindow>
        ) : null}
      </Map>
    </APIProvider>
  );
}
