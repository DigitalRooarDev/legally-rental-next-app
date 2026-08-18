'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, Spin } from 'antd';
import { useToast } from '@/context/toastContext';
import { getAddresses } from '@/actions/getAddresses';
import { saveAddress } from '@/actions/saveAddress';
import { deleteAddress } from '@/actions/deleteAddress';
import AddressForm from '@/components/my-account/AddressForm';
import EmptyState from '@/components/theme/EmptyState';

export default function ManageAddress() {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // `null` = closed, `{}` = adding, a row = editing that row.
  const [editing, setEditing] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Bumped after a save to re-run the effect below; calling a loader straight
  // from an effect body would trigger cascading renders.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getAddresses();
        if (cancelled) return;

        if (data?.status) {
          setAddresses(data.addresses);
          setError(null);
        } else {
          setAddresses([]);
          setError(data?.message === 'Not signed in.' ? data.message : null);
        }
      } catch (err) {
        console.error('ADDRESSES load failed', err);
        if (!cancelled) setError('Unable to load your addresses.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleSave = async (values) => {
    try {
      const res = await saveAddress({ ...values, id: editing?.id });

      if (!res?.status) {
        toast.error(res?.message || 'Could not save that address.');
        return;
      }

      toast.success(res.message || (editing?.id ? 'Address updated.' : 'Address saved.'));
      setEditing(null);
      reload();
    } catch (err) {
      console.error('ADDRESS save failed', err);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    setPendingDeleteId(id);
    try {
      const res = await deleteAddress({ id });

      if (!res?.status) {
        toast.error(res?.message || 'Could not delete that address.');
        return;
      }

      toast.success(res.message || 'Address removed.');
      // Drop it locally rather than refetching — one fewer round trip.
      setAddresses((current) => current.filter((address) => address.id !== id));
    } catch (err) {
      console.error('ADDRESS delete failed', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="my-account-panel">
      <div className="my-account-panel-head">
        <h2 className="my-account-panel-title">
          Manage Address
          {addresses.length > 0 ? <span className="panel-count">{addresses.length}</span> : null}
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
          Add new address
        </button>
      </div>

      {isLoading ? (
        <div className="section-loader" role="status" aria-live="polite">
          <Spin />
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState message={error || 'You have not saved any addresses yet.'} />
      ) : (
        <ul className="address-list">
          {addresses.map((address) => (
            <li className="address-card" key={address.id}>
              <div className="address-card-main">
                <div className="address-card-name">{address.name}</div>
                {address.phone ? <div className="address-card-phone">{address.phone}</div> : null}
                <p className="address-card-value">{address.summary}</p>
                {address.shopName ? (
                  <p className="address-card-shop">
                    <i className="icon icon-map" aria-hidden="true" /> {address.shopName}
                  </p>
                ) : null}
              </div>

              <div className="address-card-actions">
                <button
                  type="button"
                  className="btn btn-label"
                  onClick={() => setEditing(address)}
                  disabled={pendingDeleteId === address.id}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-label btn-label--danger"
                  onClick={() => handleDelete(address.id)}
                  disabled={pendingDeleteId === address.id}
                >
                  {pendingDeleteId === address.id ? 'Removing…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        title={editing?.id ? 'Edit Address' : 'Add New Address'}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        footer={null}
        width={720}
        centered
        maskClosable={false}
        // Unmounts on close so each open starts from clean defaults — without
        // this the form would keep the previously edited address's values.
        destroyOnHidden
        className="address-modal"
      >
        {editing ? (
          <AddressForm
            address={editing.id ? editing : null}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
