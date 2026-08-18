/**
 * Nothing-to-show placeholder.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {string} [props.className] Wrapper class. Defaults to the inline
 *   `.empty-state` treatment used inside panels and cards; a full "no results"
 *   page passes `no-records` instead, which is styled as its own block.
 * @param {React.ReactNode} [props.children]
 */
export default function EmptyState({
  title,
  message = 'Nothing to show here yet.',
  className = 'empty-state text-center',
  children,
}) {
  return (
    <div className={className}>
      {title ? <h3 className="empty-state-title">{title}</h3> : null}
      <p className="empty-state-message">{message}</p>
      {children}
    </div>
  );
}
