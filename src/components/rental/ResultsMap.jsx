import EmptyState from "@/components/theme/EmptyState";
import ResultsMapGoogle from "@/components/rental/ResultsMapGoogle";

/** Padding around the results' bounding box, in degrees, so pins aren't on the edge. */
const BBOX_PADDING = 0.02;
/** Fallback view when nothing in the result set is geocoded: Lagos. */
const FALLBACK_CENTRE = { lat: 6.5244, lng: 3.3792 };

/**
 * Map panel beside the search results.
 *
 * Google Maps when a browser key is configured — that is what gives per-listing
 * price pins and the card popup. Without a key it falls back to the keyless
 * OpenStreetMap embed, which can only mark a single point: the page still
 * renders a map rather than an error, so a missing key degrades the feature
 * instead of breaking the route.
 *
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ships to the browser by design — restrict it
 * to the site's domains in the Google Cloud console; it cannot be kept secret.
 *
 * @param {object} props
 * @param {Array<{latitude: number|null, longitude: number|null}>} props.products
 */
export default function ResultsMap({ products }) {
  const points = (products ?? []).filter(
    (product) => Number.isFinite(product.latitude) && Number.isFinite(product.longitude),
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="results-map">
      {apiKey ? (
        <ResultsMapGoogle
          apiKey={apiKey}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          points={points}
        />
      ) : (
        <OpenStreetMapFallback points={points} />
      )}

      {points.length === 0 ? (
        <div className="results-map-note">
          <EmptyState message="None of these listings have map coordinates yet." />
        </div>
      ) : (
        <div className="results-map-count">
          {points.length} of {products.length} listings located
        </div>
      )}
    </div>
  );
}

/** Keyless embed. One marker at the centre of the results is all it supports. */
function OpenStreetMapFallback({ points }) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  const bounds = points.length
    ? {
        minLat: Math.min(...latitudes) - BBOX_PADDING,
        maxLat: Math.max(...latitudes) + BBOX_PADDING,
        minLng: Math.min(...longitudes) - BBOX_PADDING,
        maxLng: Math.max(...longitudes) + BBOX_PADDING,
      }
    : {
        minLat: FALLBACK_CENTRE.lat - 0.15,
        maxLat: FALLBACK_CENTRE.lat + 0.15,
        minLng: FALLBACK_CENTRE.lng - 0.15,
        maxLng: FALLBACK_CENTRE.lng + 0.15,
      };

  const centre = points.length
    ? { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 }
    : FALLBACK_CENTRE;

  const src =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${bounds.minLng}%2C${bounds.minLat}%2C${bounds.maxLng}%2C${bounds.maxLat}` +
    `&layer=mapnik&marker=${centre.lat}%2C${centre.lng}`;

  return (
    <iframe
      title="Map of search results"
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
