"use client";

/**
 * Listings a signed-out visitor tapped the heart on.
 *
 * Held in localStorage (not sessionStorage) so the intent survives the round trip
 * through `/login`, and merged into the real wishlist by `mergeGuestWishlist`
 * once a session exists.
 */
const STORAGE_KEY = "lg_guest_wishlist";

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const write = (ids) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable — the heart just won't persist across the login hop */
  }
};

export const readGuestWishlist = read;

export const rememberGuestWishlist = (serviceId) => {
  const id = String(serviceId);
  const ids = read();
  if (!ids.includes(id)) write([...ids, id]);
};

export const clearGuestWishlist = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clean up */
  }
};

/**
 * Replays the queued hearts against the API after login, then clears the queue.
 *
 * Failures are logged rather than surfaced: the user came here to sign in, and a
 * wishlist item that did not carry over is not worth blocking that on.
 *
 * @param {(payload: {service_id: string}) => Promise<{status: boolean}>} toggleWishlist
 */
export const mergeGuestWishlist = async (toggleWishlist) => {
  const ids = read();
  if (ids.length === 0) return 0;

  const results = await Promise.all(
    ids.map(async (serviceId) => {
      try {
        const res = await toggleWishlist({ service_id: serviceId });
        return Boolean(res?.status);
      } catch (error) {
        console.error("WISHLIST merge failed for", serviceId, error);
        return false;
      }
    }),
  );

  clearGuestWishlist();
  return results.filter(Boolean).length;
};
