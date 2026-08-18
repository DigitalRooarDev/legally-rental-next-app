'use client';

/**
 * Class sets per presentation. The behaviour below is identical either way; only
 * the chrome differs, so the two live here rather than in two components.
 *
 *   hero   the banner's pill segment — the caller wraps it in `.form-input-group`
 *   plain  a labelled `.form-control`, for stacking with other form rows
 */
const VARIANTS = Object.freeze({
  hero: { wrapper: 'form-input-inner search-where', label: '', input: 'form-input' },
  plain: { wrapper: 'place-field', label: 'place-field-label', input: 'form-control' },
});

/**
 * Destination input plus its suggestion list.
 *
 * Presentational only: the caller owns the text, the suggestions (via
 * `usePlaceSuggestions`) and what picking one does. Shared so the hero's Where
 * and the filter modal's Location cannot drift on what they display — the full
 * address on top, the town that actually filters beneath it.
 *
 * @param {object} props
 * @param {string} props.id                     Input id; the listbox derives its own from it.
 * @param {string} props.value                  Text on screen — the full address once picked.
 * @param {Array<object>} props.suggestions
 * @param {'hero'|'plain'} [props.variant='hero']
 * @param {boolean} [props.open=true]           Whether the list may show. The hero gates this
 *                                              on Where being the active field.
 * @param {(text: string) => void} props.onChange
 * @param {() => void} [props.onFocus]
 * @param {() => void} props.onClear
 * @param {(suggestion: object) => void} props.onSelect
 * @param {string} [props.label='Where']
 * @param {string} [props.placeholder='Search destinations']
 */
export default function PlaceSearchField({
  id,
  value,
  suggestions,
  variant = 'hero',
  open = true,
  onChange,
  onFocus,
  onClear,
  onSelect,
  label = 'Where',
  placeholder = 'Search destinations',
}) {
  const listId = `${id}-list`;
  const isListOpen = open && suggestions.length > 0;
  const classes = VARIANTS[variant] ?? VARIANTS.hero;

  return (
    <div className={classes.wrapper}>
      <label htmlFor={id} className={classes.label}>
        {label}
      </label>
      <input
        id={id}
        className={classes.input}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={isListOpen}
        aria-controls={listId}
      />

      {value ? (
        <button type="button" className="field-clear" onClick={onClear} aria-label="Clear location">
          ×
        </button>
      ) : null}

      {isListOpen ? (
        <ul className="search-places" id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.label}-${index}`} onClick={() => onSelect(suggestion)}>
              <span className="location-icon">
                <i className="icon icon-map" aria-hidden="true" />
              </span>
              {/* The full address identifies the spot; the town under it is what
                  actually gets filtered on. */}
              <span className="location-name">
                <strong>{suggestion.label || suggestion.place}</strong>
                {suggestion.place && suggestion.place !== suggestion.label ? (
                  <small>{suggestion.place}</small>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
