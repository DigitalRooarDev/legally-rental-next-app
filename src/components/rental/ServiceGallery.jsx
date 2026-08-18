'use client';

import { useState } from 'react';
import { Image } from 'antd';

/** Above this the mosaic is used; at or below it, one full-width image. */
const MOSAIC_MIN = 5;
/** The mosaic shows one large tile plus four small ones. */
const MOSAIC_TILES = 5;

/**
 * Details-page gallery.
 *
 * Two layouts, because a listing with two photos looks broken in a five-tile
 * mosaic and most listings on this API have exactly one:
 *
 *   1–4 images   one full-width image
 *   5+ images    mosaic — 2 stacked · 1 large · 2 stacked
 *
 * Uses antd's `Image.PreviewGroup` for the lightbox. Images beyond the visible
 * tiles are still rendered (hidden) so "Show all photos" pages through the whole
 * set rather than just what is on screen.
 *
 * @param {object} props
 * @param {string[]} props.images
 * @param {string} props.name Used for alt text.
 */
export default function ServiceGallery({ images, name }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];

  // No photos on the listing: render nothing rather than a stand-in image, which
  // would read as a real photo of the property.
  if (safeImages.length === 0) return null;

  const isMosaic = safeImages.length >= MOSAIC_MIN;
  const visibleCount = isMosaic ? MOSAIC_TILES : 1;
  const hiddenImages = safeImages.slice(visibleCount);

  const tile = (src, index, className, withOverlay = false) => (
    <div className={`gallery-tile ${className}`} key={`${src}-${index}`}>
      <Image
        src={src}
        alt={index === 0 ? name : `${name} — image ${index + 1}`}
        // The design puts its own label on the main tile; antd's default
        // "Preview" mask would sit on top of it.
        preview={{
          mask: withOverlay ? <span className="gallery-mask">Click to Full View</span> : null,
        }}
      />
    </div>
  );

  return (
    <div className={`service-gallery ${isMosaic ? 'service-gallery--mosaic' : ''}`}>
      {/* antd v6 renamed `visible`/`onVisibleChange` to `open`/`onOpenChange`. */}
      <Image.PreviewGroup
        preview={{
          open: previewOpen,
          onOpenChange: setPreviewOpen,
          /**
           * Drops the flip / rotate / zoom row: a listing gallery is for looking
           * through photos, not editing them.
           *
           * `actionsRender`, not the `toolbarRender` of antd v5 — v6 deprecates
           * that name and warns on it. Returning `null` removes only the
           * `-actions` element; the "1 / n" counter, the close button and the
           * prev/next arrows are siblings of it and are unaffected.
           */
          actionsRender: () => null,
        }}
      >
        {isMosaic ? (
          <>
            <div className="gallery-side">
              {tile(safeImages[1], 1, 'gallery-tile--small', true)}
              {tile(safeImages[2], 2, 'gallery-tile--small', true)}
            </div>

            {tile(safeImages[0], 0, 'gallery-tile--main', true)}

            <div className="gallery-side">
              {tile(safeImages[3], 3, 'gallery-tile--small', true)}
              {tile(safeImages[4], 4, 'gallery-tile--small', true)}
            </div>
          </>
        ) : (
          tile(safeImages[0], 0, 'gallery-tile--full', true)
        )}

        {/* Kept in the group so the lightbox covers every photo, not just the
            tiles the layout had room for. */}
        <div className="gallery-hidden">
          {hiddenImages.map((src, offset) => (
            <Image
              key={`${src}-hidden-${offset}`}
              src={src}
              alt={`${name} — image ${visibleCount + offset + 1}`}
            />
          ))}
        </div>
      </Image.PreviewGroup>

      {safeImages.length > 1 ? (
        <button type="button" className="gallery-show-all" onClick={() => setPreviewOpen(true)}>
          <i className="icon icon-grid" aria-hidden="true" />
          Show all photos
        </button>
      ) : null}
    </div>
  );
}
