'use client';

import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { useAuth } from '@/context/authContext';
import { CURRENCY_SYMBOL } from '@/lib/constants';
import { formatDateTime, formatPrice } from '@/utils/formats';
import { getTransactionHistory } from '@/actions/getTransactionHistory';
import Pagination from '@/components/theme/Pagination';
import EmptyState from '@/components/theme/EmptyState';

/** Deduct -> "-", Refund -> "+". Anything else carries no sign; see the mapper. */
const SIGNS = { debit: '-', credit: '+' };

/**
 * Balance plus the wallet ledger, from `transactionHistory`.
 *
 * The balance prefers the figure on this response over the one cached on the
 * profile: both come from the same column, but the profile copy is as old as the
 * session while this one is read per request.
 */
export default function Wallet() {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [walletAmount, setWalletAmount] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getTransactionHistory({ page });
        if (cancelled) return;

        if (data?.status) {
          setTransactions(data.transactions);
          setPagination(data.pagination);
          setWalletAmount(data.walletAmount);
          setError(null);
        } else {
          // An empty ledger is a legitimate answer, not a failure.
          setTransactions([]);
          setError(null);
        }
      } catch (err) {
        console.error('TRANSACTIONS load failed', err);
        // The balance below is still real, so only the list reports the problem.
        if (!cancelled) setError('Unable to load your transactions.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const balance = formatPrice(walletAmount || user?.wallet);

  return (
    <div className="my-account-panel">
      <div className="my-account-panel-head">
        <h2 className="my-account-panel-title">Wallet</h2>
      </div>

      <div className="wallet-card">
        <div className="wallet-card-icon">
          <i className="icon icon-wallet" aria-hidden="true" />
        </div>
        <div className="wallet-card-body">
          <span className="wallet-card-amount">
            {CURRENCY_SYMBOL} {balance.formatted}
          </span>
          <p>Available balance</p>
        </div>
      </div>

      <h3 className="my-account-subtitle">
        Transactions
        {pagination.total > 0 ? <span className="panel-count">{pagination.total}</span> : null}
      </h3>

      {isLoading ? (
        <div className="section-loader" role="status" aria-live="polite">
          <Spin />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title={error ? undefined : 'No transactions yet'}
          message={error || 'Your deposits, payments and refunds will appear here.'}
        />
      ) : (
        <>
          <ul className="wallet-txn-list">
            {transactions.map((txn) => (
              <li key={txn.id} className="wallet-txn">
                <div className="wallet-txn-main">
                  <span className={`wallet-txn-type wallet-txn-type--${txn.direction}`}>
                    {txn.type}
                  </span>
                  {txn.description ? <p className="wallet-txn-desc">{txn.description}</p> : null}
                  {txn.at ? (
                    <span className="wallet-txn-date">{formatDateTime(txn.at)}</span>
                  ) : null}
                </div>

                <span className={`wallet-txn-amount wallet-txn-amount--${txn.direction}`}>
                  {SIGNS[txn.direction] ?? ''}
                  {CURRENCY_SYMBOL} {formatPrice(txn.amount).formatted}
                </span>
              </li>
            ))}
          </ul>

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
