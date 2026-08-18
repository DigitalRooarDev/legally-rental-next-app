import { Spin } from 'antd';

export default function Loading() {
  return (
    <main className="container">
      <div className="empty-state text-center" role="status" aria-live="polite">
        <Spin />
      </div>
    </main>
  );
}
