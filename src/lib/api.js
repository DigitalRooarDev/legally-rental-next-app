/**
 * Single entry point for every LegallyNG API call.
 *
 * There are three API bases, and they disagree on how they report success:
 *
 *   v1     API_BASE_URL   { status: true|false, message, response }  dashboard, listings, wishlist
 *   v2     API_V2_URL     { result: "1"|"0",    message, response }  auth, password, profile edit
 *   admin  API_ADMIN_URL  { code: "0000",       message, data }      parcel shops / shop locations
 *
 * `fetchAPI` normalises `result` and `code` into `status`, and lifts `data` into
 * `response`, so no call site has to know which base it hit. It never throws —
 * transport errors, timeouts and HTTP errors all come back in the same envelope.
 * Every call site then reads alike:
 *
 *   const res = await loginUser(payload);
 *   if (res?.status) { ...success... } else { toast.error(res?.message); }
 *
 * A few endpoints (`mapboxapi`) answer with a bare object and no envelope at all;
 * pass `raw: true` for those.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

/** Success code used by the admin/logistics base. */
const ADMIN_OK_CODE = "0000";

/** `type` values accepted as `fetchAPI`'s third argument. */
export const API_TYPES = Object.freeze({
  V1: "v1",
  V2: "v2",
  ADMIN: "admin",
});

const BASE_URL_ENV = Object.freeze({
  [API_TYPES.V1]: "API_BASE_URL",
  [API_TYPES.V2]: "API_V2_URL",
  [API_TYPES.ADMIN]: "API_ADMIN_URL",
});

function resolveBaseUrl(type) {
  const base = process.env[BASE_URL_ENV[type] ?? BASE_URL_ENV[API_TYPES.V1]];
  if (!base) return null;
  return base.endsWith("/") ? base : `${base}/`;
}

function buildUrl(endpoint, query, type) {
  const base = resolveBaseUrl(type);
  if (!base) return null;

  // A leading slash on the endpoint would drop the base path (`/api2/`), so strip it.
  const url = new URL(String(endpoint).replace(/^\/+/, ""), base);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

/**
 * @param {string} endpoint  Endpoint relative to the API base, e.g. `login`.
 * @param {object} [options]
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {object|FormData} [options.body]
 * @param {boolean} [options.isFormData=false]  Send `body` as-is (file uploads).
 * @param {object} [options.query]              Query-string params.
 * @param {object} [options.headers]            Extra headers.
 * @param {string} [options.token]              Bearer token for authed endpoints.
 * @param {number} [options.timeoutMs=15000]
 * @param {number} [options.revalidate]         ISR window in seconds; omit for no cache.
 * @param {string[]} [options.tags]             Next.js cache tags.
 * @param {boolean} [options.raw=false]         Endpoint returns no envelope (`mapboxapi`).
 * @param {'v1'|'v2'|'admin'} [type='v1']  Which API base to hit.
 * @returns {Promise<{status: boolean, message: string, response: object}>}
 */
export async function fetchAPI(endpoint, options = {}, type = API_TYPES.V1) {
  const {
    method = "GET",
    body,
    isFormData = false,
    query,
    headers = {},
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    revalidate,
    tags,
    raw = false,
  } = options;

  const url = buildUrl(endpoint, query, type);
  if (!url) {
    console.error(`API MISCONFIGURED: ${BASE_URL_ENV[type] ?? "API_BASE_URL"} is not set.`);
    return { status: false, message: "API is not configured.", response: {} };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    signal: controller.signal,
    ...(typeof revalidate === "number"
      ? { next: { revalidate, ...(tags ? { tags } : {}) } }
      : { cache: "no-store" }),
  };

  if (body) {
    requestInit.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(url, requestInit);
    const text = await res.text();

    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      // One interpolated string, not an object: the dev overlay serialises server
      // console args across the RSC boundary and renders the object as `{}`, which
      // hides the status and body — the only two things worth logging here.
      console.error(`API ERROR ${res.status} ${method} ${url} :: ${text?.slice(0, 500)}`);
      return {
        status: false,
        message: parsed?.message || res.statusText || `Request failed with ${res.status}.`,
        statusCode: res.status,
        response: {},
      };
    }

    // Envelope-free endpoints (`mapboxapi`) hand back whatever they return.
    if (raw) {
      return parsed ?? {};
    }

    // Every other endpoint answers with an envelope. Anything else (a bare `[]`,
    // HTML, plain text) means the request did not reach the handler it was meant
    // to — treating that as success would silently swallow a real failure.
    const isEnvelope =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (parsed.status !== undefined || parsed.result !== undefined || parsed.code !== undefined);

    if (!isEnvelope) {
      console.error(`API UNEXPECTED SHAPE ${method} ${url} :: ${text?.slice(0, 300)}`);
      return { status: false, message: "Unexpected response from the server.", response: {} };
    }

    return {
      response: parsed.response ?? parsed.data ?? {},
      ...parsed,
      // v2 reports `result: "1"|"0"`, admin reports `code: "0000"`; collapse both
      // into `status` so the caller never has to know which base answered.
      status:
        parsed.status ??
        (parsed.result !== undefined
          ? String(parsed.result) === "1"
          : String(parsed.code) === ADMIN_OK_CODE),
    };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    console.error(`FETCH FAILED ${method} ${url} :: ${error?.message}`);
    return {
      status: false,
      message: aborted
        ? "The request took too long. Please try again."
        : "Unable to reach the server. Please check your connection.",
      response: {},
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
