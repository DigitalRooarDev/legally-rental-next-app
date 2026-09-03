import Image from 'next/image';

/**
 * A member's photo, or their initial when there is none.
 *
 * `buyerReviewProfile` sends no photo for the profile's subject and often none
 * for the hosts either, so the initial is the normal case rather than an error
 * path — hence a lettered circle instead of a placeholder graphic, which would put
 * the same stock face on every profile.
 *
 * Shared by the server-rendered page and the two dialogs, so it stays free of
 * hooks and server-only imports.
 *
 * @param {object} props
 * @param {string} [props.src]      Absolute URL from the API; falsy falls back to the initial.
 * @param {string} [props.initial]  Single character. Derived from `name` when omitted.
 * @param {string} [props.name]     Only used to derive the initial — the label is rendered
 *   beside the avatar, so the image itself is decorative (`alt=""`).
 * @param {number} [props.size]     Rendered edge in px; also what `next/image` fetches for.
 * @param {string} [props.className]
 */
export default function ProfileAvatar({ src, initial, name, size = 48, className = '' }) {
  const classes = ['profile-avatar', className].filter(Boolean).join(' ');
  // A CSS variable rather than width/height in the style attribute: the same
  // number also drives the initial's font size, and one source keeps them in step.
  const sizing = { '--avatar-size': `${size}px` };

  if (src) {
    return (
      <Image className={classes} src={src} alt="" width={size} height={size} style={sizing} />
    );
  }

  const letter = (initial || String(name ?? '').trim().charAt(0) || '?').toUpperCase();

  return (
    <span className={`${classes} profile-avatar-initial`} style={sizing} aria-hidden="true">
      {letter}
    </span>
  );
}
