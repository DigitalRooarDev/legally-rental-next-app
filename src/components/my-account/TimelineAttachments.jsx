'use client';

import { Image } from 'antd';

/**
 * Images attached to a timeline entry, in a lightbox.
 *
 * antd's `<Image>` rather than `next/image`, matching the ecommerce site: these
 * are evidence for a dispute or a delivery, so they have to be openable at full
 * size, and `next/image` would also refuse any host missing from
 * `remotePatterns` — attachments can come from wherever the API stores them.
 *
 * The only client component on the booking page, and deliberately the smallest
 * one: it exists because a lightbox needs state, so the page around it stays on
 * the server.
 *
 * `<PreviewGroup>` so opening one attachment lets the viewer page through the
 * rest of the same entry rather than closing and reopening.
 *
 * @param {object} props
 * @param {Array<{id: string, url: string, name: string}>} props.attachments
 */
export default function TimelineAttachments({ attachments }) {
  if (!attachments?.length) return null;

  return (
    <div className="order-timeline-attachments">
      <Image.PreviewGroup
        // The toolbar's rotate/flip controls are for photo editing, not for
        // reading a receipt; the reference strips them the same way.
        preview={{ toolbarRender: () => null }}
      >
        {attachments.map((attachment) => (
          <div className="attachments-item" key={attachment.id}>
            <Image src={attachment.url} alt={attachment.name} />
          </div>
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
