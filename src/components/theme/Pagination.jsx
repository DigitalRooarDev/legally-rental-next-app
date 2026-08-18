"use client";

/** Page numbers to show around the current one before collapsing to an ellipsis. */
const WINDOW = 1;

/**
 * Builds a windowed page list: 1 … 4 [5] 6 … 12
 * Keeps the control a fixed width no matter how many pages there are.
 */
const buildPages = (currentPage, lastPage) => {
  const pages = new Set([1, lastPage]);

  for (let page = currentPage - WINDOW; page <= currentPage + WINDOW; page += 1) {
    if (page >= 1 && page <= lastPage) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);

  // Insert a gap marker wherever the sequence skips.
  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1] > 1 ? ["gap", page] : [page],
  );
};

/**
 * @param {object} props
 * @param {number} props.currentPage
 * @param {number} props.lastPage
 * @param {(page: number) => void} props.onChange
 */
export default function Pagination({ currentPage, lastPage, onChange }) {
  if (!Number.isFinite(lastPage) || lastPage <= 1) return null;

  const pages = buildPages(currentPage, lastPage);

  return (
    <nav className="product-pagination" aria-label="Wishlist pages">
      <ul className="pagination">
        <li className="page-item page-item--arrow">
          <button
            type="button"
            className="page-link"
            onClick={() => onChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <i className="icon icon-chevron-left"></i>
          </button>
        </li>

        {pages.map((page, index) =>
          page === "gap" ? (
            <li className="page-item page-item--gap" key={`gap-${index}`} aria-hidden="true">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li className="page-item" key={page}>
              <button
                type="button"
                className={`page-link ${page === currentPage ? "active" : ""}`}
                onClick={() => onChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            </li>
          ),
        )}

        <li className="page-item page-item--arrow">
          <button
            type="button"
            className="page-link"
            onClick={() => onChange(currentPage + 1)}
            disabled={currentPage >= lastPage}
          >
            <i className="icon icon-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
  );
}
