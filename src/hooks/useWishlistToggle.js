"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/toastContext";
import { toggleWishlist } from "@/actions/toggleWishlist";
import { useAuth } from "@/context/authContext";
import { rememberGuestWishlist } from "@/utils/guestWishlist";

/**
 * The default wishlist handler for `<ProductBox />`.
 *
 * Returning a callback rather than threading one down from a page matters here:
 * the rails and grids are rendered by *server* components, which cannot pass a
 * function across the boundary. Each card wires itself up instead.
 *
 * Signed out, the heart is remembered locally and the visitor is sent to `/login`
 * with a redirect back — `<Login />` replays the queue once a session exists.
 *
 * @returns {(product: {id: string|number}, next: boolean) => Promise<void>}
 *   Rejects on failure, which is how `<ProductBox />` knows to roll the
 *   optimistic heart back.
 */
export default function useWishlistToggle() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  return useCallback(
    async (product, next) => {
      const serviceId = product?.id;
      if (!serviceId) throw new Error("Missing listing id.");

      if (!isAuthenticated) {
        rememberGuestWishlist(serviceId);

        const query = searchParams.toString();
        const returnTo = query ? `${pathname}?${query}` : pathname;
        router.push(`/login?redirect=${encodeURIComponent(returnTo)}`);

        // Reject so the heart does not stay filled on a page we're leaving.
        throw new Error("Sign in required.");
      }

      const res = await toggleWishlist({ service_id: serviceId });

      if (!res?.status) {
        toast.error(res?.message || "Could not update your wishlist.");
        throw new Error(res?.message || "Wishlist update failed.");
      }

      toast.success(res.message || (next ? "Added to your wishlist." : "Removed from your wishlist."));
    },
    // `toast` comes from antd's `useMessage`, whose api object is memoised with
    // empty deps — stable for the component's life, so it never re-creates this.
    [isAuthenticated, pathname, router, searchParams, toast],
  );
}
