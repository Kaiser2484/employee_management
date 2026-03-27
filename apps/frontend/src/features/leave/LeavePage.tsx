import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { approveLeaveRequest, rejectLeaveRequest, getLeaveRequests, LeaveRequestItem } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';

export function LeavePage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [items, setItems] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const canApprove = actor?.role !== 'employee';

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function loadRequests() {
    if (!actor) {
      return;
    }

    const selectedActor = actor;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getLeaveRequests(selectedActor);
      setItems(result.data);
    } catch (err) {
      const message = t('common.loadError');
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, [actor]);

  async function handleApprove(id: string) {
    if (!actor) {
      return;
    }

    const selectedActor = actor;

    try {
      await approveLeaveRequest(selectedActor, id);
      await loadRequests();
      showToast(t('leave.approveSuccess'), 'success');
    } catch (err) {
      const message = t('leave.approveError');
      setError(message);
      showToast(message, 'error');
    }
  }
  
  async function handleReject(id: string) {
  if (!actor) return;

  try {
    await rejectLeaveRequest(actor, id);
    await loadRequests();
    showToast("Từ chối thành công", "success");
  } catch (err) {
    const message = "Từ chối thất bại";
    setError(message);
    showToast(message, "error");
  }
}
  return (
    <section className="module-grid">
      <article className="card main-card">
        {toast && (
          <NotificationToast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <h2>{t('leave.title')}</h2>
        <p>{t('leave.description')}</p>

        {actor?.role === 'employee' && (
          <button
            className="mini-btn"
            onClick={() => window.location.href = '/leave/create'}
          >
            Tạo đơn 
          </button>
        )}
        {isLoading && <p>{t('common.loading')}</p>}
        {!isLoading && !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('leave.columns.id')}</th>
                  <th>{t('leave.columns.employeeId')}</th>
                  <th>{t('leave.columns.fromDate')}</th>
                  <th>{t('leave.columns.toDate')}</th>
                  <th>{t('leave.columns.status')}</th>
                  <th>Lý do</th>   {/* ✅ thêm */}
                  <th>{t('leave.columns.action')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.employeeId}</td>
                    <td>{new Date(item.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(item.toDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>{item.reason || "-"}</td>  {/* ✅ thêm dòng này */}

                    <td>
                      {canApprove && item.status === 'pending' ? (
  <>
    <button
      className="mini-btn"
      onClick={() => void handleApprove(item.id)}
    >
      {t('leave.approve')}
    </button>

    <button
      className="mini-btn"
      style={{ marginLeft: '8px', background: 'red', color: 'white' }}
      onClick={() => void handleReject(item.id)}
    >
      Từ chối
    </button>
  </>
) : (
  '-'
)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
