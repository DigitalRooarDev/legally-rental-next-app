/**
 * The one place a cancellation policy is put into words.
 *
 * The API sends only a tier name — `cancellation_policies: "Firm"` — so the
 * sentence explaining it has to be written on this side. It was written twice:
 * the detail page mapped the name to a sentence, the checkout printed the bare
 * name, and neither knew about the other. Two renderings of the same field, each
 * telling the visitor something the other did not, on the two screens they see
 * back to back.
 *
 * A refund promise is the wrong thing to state two ways, so both now read from
 * here.
 */

/** Keyed lower-case: the API's casing is not guaranteed. */
const POLICY_SUMMARIES = Object.freeze({
  flexible:
    'Cancel before check-in for a full refund. After that, this booking becomes non-refundable.',
  firm: 'Cancel before check-in for a partial refund. After that, this booking becomes non-refundable.',
  strict: 'This booking is non-refundable once confirmed.',
});

/**
 * @param {string} [name] The API's tier name — "Flexible" | "Firm" | "Strict".
 * @returns {{name: string, label: string, summary: string}}
 *   `label` is the tier as it should be shown, `summary` the sentence explaining
 *   it. An unrecognised tier gets a `label` and an empty `summary`: naming a
 *   policy the visitor can then go and read beats inventing terms on the host's
 *   behalf. Both are `''` when the listing carries no policy at all, which is
 *   what lets a caller drop the row entirely.
 */
export const describeCancellationPolicy = (name) => {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { name: '', label: '', summary: '' };

  return {
    name: trimmed,
    label: trimmed,
    summary: POLICY_SUMMARIES[trimmed.toLowerCase()] ?? '',
  };
};
