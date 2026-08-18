'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/context/toastContext';
import { getWishlist } from '@/actions/getWishlist';
import { toggleWishlist } from '@/actions/toggleWishlist';
import ProductGrid from '@/components/theme/ProductGrid';
import Pagination from '@/components/theme/Pagination';
import { Spin } from 'antd';

export default function MyWishlist() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getWishlist({ page });
        if (cancelled) return;

        if (data?.status) {
          setProducts(data.products);
          setPagination(data.pagination);
          setError(null);
        } else {
          setError(data?.message || 'Unable to load your wishlist.');
        }
      } catch (err) {
        console.error('WISHLIST load failed', err);
        if (!cancelled) setError('Unable to load your wishlist.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Guards against a state update after the tab unmounts or `page` changes again.
    return () => {
      cancelled = true;
    };
  }, [page]);

  /**
   * Overrides the card's default handler: on this screen an un-favourite means the
   * row leaves the list, and dropping the last row on a page has to step back.
   */
  const handleToggle = useCallback(
    async (product) => {
      const res = await toggleWishlist({ service_id: product.id });

      if (!res?.status) {
        toast.error(res?.message || 'Could not update your wishlist.');
        throw new Error(res?.message || 'Wishlist update failed.');
      }

      toast.success(res.message || 'Removed from your wishlist.');

      setProducts((current) => {
        const remaining = current.filter((item) => item.id !== product.id);
        if (remaining.length === 0 && page > 1) setPage((value) => value - 1);
        return remaining;
      });
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
    },
    // `toast` is antd's memoised message api — stable, so it never re-creates this.
    [page, toast],
  );

  return (
    <div className="my-account-panel">
      <div className="my-account-panel-head">
        <h2 className="my-account-panel-title">
          My Wishlist
          {pagination.total > 0 ? <span className="panel-count">{pagination.total}</span> : null}
        </h2>
      </div>

      {isLoading ? (
        <div className="section-loader" role="status" aria-live="polite">
          <Spin />
        </div>
      ) : (
        <>
          <ProductGrid
            products={products}
            columns={3}
            emptyMessage={error || 'You have not saved any listings yet.'}
            onWishlistToggle={handleToggle}
          />
          <Pagination
            currentPage={pagination.currentPage}
            lastPage={pagination.lastPage}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
