'use client';

import { useState } from 'react';
import { Modal } from 'antd';

/**
 * "Show all house rules" plus the dialog it opens.
 *
 * Only this trigger is a client component — `<ServicePolicyCard>` stays on the
 * server and renders the first few rules itself, so the card is complete in the
 * first paint and JavaScript only buys the overflow.
 *
 * @param {object} props
 * @param {string[]} props.rules Every rule, already phrased by the mapper.
 * @param {string} [props.label]
 */
export default function HouseRulesModal({ rules, label = 'Show all house rules' }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!rules?.length) return null;

  return (
    <>
      <button type="button" className="policy-link" onClick={() => setIsOpen(true)}>
        {label}
      </button>

      <Modal
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        title="Property Guidelines"
        footer={null}
        centered
        width={420}
        className="house-rules-modal"
      >
        <ul className="house-rules-list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
