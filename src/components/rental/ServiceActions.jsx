'use client';

import { useState } from 'react';
import { useToast } from '@/context/toastContext';
import useWishlistToggle from '@/hooks/useWishlistToggle';

/**
 * Share and Save, top-right of the details head.
 *
 * Save reuses the cards' `useWishlistToggle`, so the heart, the guest queue and
 * the sign-in redirect behave exactly as they do in a grid — one listing cannot
 * be wishlisted two different ways.
 *
 * @param {object} props
 * @param {string|number} props.serviceId
 * @param {string} props.name
 * @param {boolean} [props.isFavorite=false]
 */
export default function ServiceActions({ serviceId, name, isFavorite = false }) {
  const toast = useToast();
  const [saved, setSaved] = useState(Boolean(isFavorite));
  const [isPending, setIsPending] = useState(false);
  const toggle = useWishlistToggle();

  const handleSave = async () => {
    if (isPending) return;

    const next = !saved;
    setSaved(next);
    setIsPending(true);

    try {
      await toggle({ id: serviceId }, next);
    } catch {
      // Rejects on failure *and* on the sign-in redirect, so the heart must not
      // stay filled on a page we are leaving.
      setSaved(!next);
    } finally {
      setIsPending(false);
    }
  };

  const handleShare = async () => {
    // `window.location.href` rather than a composed URL: it is already canonical
    // here, and shares the exact page the visitor is looking at.
    const url = window.location.href;

    // The share sheet is the native path on mobile; the clipboard is the desktop
    // fallback. Both can be blocked, hence the message of last resort.
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (error) {
        // Dismissing the sheet rejects too — that is a choice, not a failure.
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.info(url);
    }
  };

  return (
    <div className="service-details-actions">
      <button type="button" className="service-action" onClick={handleShare}>
        <i className="icon icon-share" aria-hidden="true" />
        <span>Share</span>
      </button>

      <button
        type="button"
        className={`service-action ${saved ? 'is-saved' : ''}`}
        onClick={handleSave}
        disabled={isPending}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      >
        <i
          className={`icon ${saved ? 'icon-wishlist-fill' : 'icon-wishlist'}`}
          aria-hidden="true"
        />
        <span>{saved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
}
