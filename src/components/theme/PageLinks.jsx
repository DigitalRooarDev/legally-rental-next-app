import Link from "next/link";

/** Page numbers to show around the current one before collapsing to an ellipsis. */
const WINDOW = 1;

const buildPages = (currentPage, lastPage) => {
  const pages = new Set([1, lastPage]);

  for (let page = currentPage - WINDOW; page <= currentPage + WINDOW; page += 1) {
    if (page >= 1 && page <= lastPage) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, index) =>
    index > 0 && page - sorted[index - 1] > 1 ? ["gap", page] : [page],
  );
};

/**
 * Link-based pager for server-rendered lists.
 *
 * `<Pagination />` is the client/callback version used inside the account tabs;
 * this one emits real `<a href>`s so search results stay crawlable and
 * middle-clickable.
 *
 * @param {object} props
 * @param {number} props.currentPage
 * @param {number} props.lastPage
 * @param {string} props.basePath
 * @param {Record<string, string>} [props.params] Filters to carry across pages.
 */
export default function PageLinks({ currentPage, lastPage, basePath, params = {} }) {
  if (!Number.isFinite(lastPage) || lastPage <= 1) return null;

  const hrefFor = (page) => {
    const query = new URLSearchParams(params);
    if (page > 1) query.set("page", String(page));
    else query.delete("page");
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const pages = buildPages(currentPage, lastPage);

  return (
    <nav className="product-pagination" aria-label="Search result pages">
      <ul className="pagination">
        <li className="page-item page-item--arrow">
          {currentPage > 1 ? (
            <Link className="page-link" href={hrefFor(currentPage - 1)} rel="prev">
              <i className="icon icon-chevron-left"></i>
            </Link>
          ) : (
            <span className="page-link is-disabled"><i className="icon icon-chevron-left"></i></span>
          )}
        </li>

        {pages.map((page, index) =>
          page === "gap" ? (
            <li className="page-item page-item--gap" key={`gap-${index}`} aria-hidden="true">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li className="page-item" key={page}>
              {page === currentPage ? (
                <span className="page-link active" aria-current="page">
                  {page}
                </span>
              ) : (
                <Link className="page-link" href={hrefFor(page)}>
                  {page}
                </Link>
              )}
            </li>
          ),
        )}

        <li className="page-item page-item--arrow">
          {currentPage < lastPage ? (
            <Link className="page-link" href={hrefFor(currentPage + 1)} rel="next">
              <i className="icon icon-chevron-right"></i>
            </Link>
          ) : (
            <span className="page-link is-disabled"><i className="icon icon-chevron-right"></i></span>
          )}
        </li>
      </ul>
    </nav>
  );
}
