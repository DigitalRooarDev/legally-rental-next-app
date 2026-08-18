'use client';

import { useEffect, useState } from 'react';
import { getOrders } from '@/actions/getOrders';
import { ORDER_STATUS_FILTERS, ORDER_WINDOW_FILTERS } from '@/lib/constants';
import OrderCard from '@/components/my-account/OrderCard';
import Pagination from '@/components/theme/Pagination';
import EmptyState from '@/components/theme/EmptyState';
import { Spin } from 'antd';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [windowFilter, setWindowFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getOrders({ page, status: statusFilter, typeFilter: windowFilter });
        if (cancelled) return;

        if (data?.status) {
          setOrders(data.orders);
          setPagination(data.pagination);
          setError(null);
        } else {
          // "Order not found." is the API's empty result, not a failure.
          setOrders([]);
          setError(null);
        }
      } catch (err) {
        console.error('ORDERS load failed', err);
        if (!cancelled) setError('Unable to load your bookings.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, windowFilter]);

  // Any filter change invalidates the page number.
  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleWindowChange = (value) => {
    setWindowFilter(value);
    setPage(1);
  };

  return (
    <div className="my-account-panel">
      <div className="my-account-panel-head">
        <h2 className="my-account-panel-title">
          My Bookings
          {pagination.total > 0 ? <span className="panel-count">{pagination.total}</span> : null}
        </h2>
      </div>

      {/* Booking window as chips on the left, status as a dropdown on the right. */}
      <div className="order-filter-row">
        <div className="order-filters" role="group" aria-label="Filter bookings by date">
          {ORDER_WINDOW_FILTERS.map((filter) => (
            <button
              key={filter.value || 'any'}
              type="button"
              className={`order-filter ${windowFilter === filter.value ? 'active' : ''}`}
              onClick={() => handleWindowChange(filter.value)}
              aria-pressed={windowFilter === filter.value}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="order-status-select">
          <select
            id="order-status-filter"
            className="form-control form-select"
            aria-label="Filter bookings by status"
            value={statusFilter}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            {ORDER_STATUS_FILTERS.map((filter) => (
              <option key={filter.value || 'all'} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="section-loader" role="status" aria-live="polite">
           <Spin />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          message={
            error ||
            (statusFilter || windowFilter
              ? 'No bookings match these filters.'
              : 'You have not booked anything yet.')
          }
        />
      ) : (
        <>
          <div className="order-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

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
