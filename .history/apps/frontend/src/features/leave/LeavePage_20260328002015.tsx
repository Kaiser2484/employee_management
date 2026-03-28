import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { approveLeaveRequest, createLeaveRequest, getLeaveRequests, LeaveRequestItem, rejectLeaveRequest } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';
import { Plus, X } from 'lucide-react';

type LeaveView = 'request' | 'approval' | 'balance' | 'policy';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Phép năm' },
  { value: 'sick', label: 'Nghỉ ốm' },
  { value: 'unpaid', label: 'Nghỉ không lương' },
];

export function LeavePage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);

  // Form states
  const [leaveType, setLeaveType] = useState('annual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canApprove = actor?.role !== 'employee';
  const currentView = (searchParams.get('view') as LeaveView) || 'request';

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  const loadRequests = async () => {
    if (!actor) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLeaveRequests(actor);
      setItems(result.data);
    } catch {
      showToast(t('common.loadError', 'Không thể tải dữ liệu'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [actor]);

  const handleApprove = async (id: string) => {
    if (!actor) return;
    try {
      await approveLeaveRequest(actor, id);
      await loadRequests();
      showToast(t('leave.approveSuccess', 'Đã duyệt yêu cầu nghỉ phép.'), 'success');
      setSelectedRequest(null);
    } catch {
      showToast(t('leave.approveError', 'Lỗi khi duyệt yêu cầu.'), 'error');
    }
  };

  const handleReject = async (id: string) => {
    if (!actor) return;
    try {
      await rejectLeaveRequest(actor, id);
      await loadRequests();
      showToast(t('leave.rejectSuccess', 'Đã từ chối yêu cầu nghỉ phép.'), 'success');
      setSelectedRequest(null);
    } catch {
      showToast(t('leave.rejectError', 'Lỗi khi từ chối yêu cầu.'), 'error');
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!actor) return;
    if (!fromDate || !toDate) {
      showToast('Vui lòng chọn ngày', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await createLeaveRequest(actor, { leaveType, fromDate, toDate, reason });
      await loadRequests();
      showToast(t('leave.createSuccess', 'Đã gửi yêu cầu nghỉ phép thành công.'), 'success');
      setIsCreateModalOpen(false);
      setFromDate('');
      setToDate('');
      setReason('');
    } catch {
      showToast(t('leave.createError', 'Lỗi khi gửi yêu cầu nghỉ phép.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatus = (status: string) => {
    const statusClass = status === 'approved' ? 'status-approved' : status === 'rejected' ? 'status-denied' : 'status-pending';
    const statusLabel = status === 'approved' ? 'Đã duyệt' : status === 'rejected' ? 'Từ chối' : 'Chờ duyệt';
    return <span className={`status-pill ${statusClass}`}>{statusLabel}</span>;
  };

  // Views rendering
  const renderMyRequestsView = () => {
    const myRequests = items.filter(i => i.employeeId === actor?.id);
    return (
      <>
        <div className="employee-create-launch" style={{ marginBottom: '1rem' }}>
          <button type="button" className="action-btn" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} style={{ marginRight: '8px' }} />
            {t('leave.request', 'Tạo đơn mới')}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('leave.columns.id', 'Mã đơn')}</th>
                <th>{t('leave.columns.type', 'Loại phép')}</th>
                <th>{t('leave.columns.fromDate', 'Từ ngày')}</th>
                <th>{t('leave.columns.toDate', 'Đến ngày')}</th>
                <th>{t('leave.columns.status', 'Trạng thái')}</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((item) => (
                <tr key={item.id} className="clickable-card" onClick={() => setSelectedRequest(item)}>
                  <td>{item.id}</td>
                  <td>{LEAVE_TYPES.find(t => t.value === item.leaveType)?.label?.split('/')[0] || item.leaveType}</td>
                  <td>{new Date(item.fromDate).toLocaleDateString()}</td>
                  <td>{new Date(item.toDate).toLocaleDateString()}</td>
                  <td>{renderStatus(item.status)}</td>
                </tr>
              ))}
              {!myRequests.length && (
                <tr><td colSpan={5}>{t('common.empty', 'Chưa có đơn nào.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderApprovalView = () => {
    if (!canApprove) {
      return <p>{t('leave.noAccess', 'Bạn không có quyền truy cập trang này.')}</p>;
    }
    
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('leave.columns.id', 'Mã đơn')}</th>
              <th>{t('leave.columns.employeeId', 'Nhân viên')}</th>
              <th>{t('leave.columns.type', 'Loại phép')}</th>
              <th>{t('leave.columns.fromDate', 'Từ ngày')}</th>
              <th>{t('leave.columns.toDate', 'Đến ngày')}</th>
              <th>{t('leave.columns.status', 'Trạng thái')}</th>
              <th>{t('leave.columns.action', 'Hành động')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="clickable-card" onClick={() => setSelectedRequest(item)}>
                <td>{item.id}</td>
                <td>{item.employeeName || item.employeeId}</td>
                <td>{LEAVE_TYPES.find(t => t.value === item.leaveType)?.label?.split('/')[0] || item.leaveType}</td>
                <td>{new Date(item.fromDate).toLocaleDateString()}</td>
                <td>{new Date(item.toDate).toLocaleDateString()}</td>
                <td>{renderStatus(item.status)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {item.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="mini-btn btn-success" onClick={() => handleApprove(item.id)}>Duyệt</button>
                      <button className="mini-btn btn-danger" onClick={() => handleReject(item.id)}>Từ chối</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7}>{t('common.empty', 'Không có dữ liệu.')}</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBalanceView = () => {
    return (
      <div className="employee-catalog-grid">
        <section className="employee-catalog-card">
          <h3>Phép năm</h3>
          <h1 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '1rem 0' }}>12</h1>
          <p>Số ngày còn lại trong năm</p>
        </section>
        <section className="employee-catalog-card">
          <h3>Nghỉ ốm</h3>
          <h1 style={{ fontSize: '3rem', color: 'var(--ink)', margin: '1rem 0' }}>5</h1>
          <p>Số ngày còn lại trong năm</p>
        </section>
        <section className="employee-catalog-card">
          <h3>Nghỉ không lương</h3>
          <h1 style={{ fontSize: '3rem', color: 'var(--text-muted)', margin: '1rem 0' }}>&infin;</h1>
          <p>Không giới hạn (Cần được duyệt)</p>
        </section>
      </div>
    );
  };

  return (
    <section className="module-grid">
      <article className="card main-card">
        {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <h2>{t('leave.title', 'Quản lý Nghỉ phép')}</h2>
        <p>{t('leave.description', 'Quản lý và theo dõi các đơn đăng ký nghỉ phép.')}</p>

        {isLoading && <p>{t('common.loading', 'Đang tải dữ liệu...')}</p>}

        {!isLoading && !error && (
          <div style={{ marginTop: '2rem' }}>
            {currentView === 'request' && renderMyRequestsView()}
            {currentView === 'approval' && renderApprovalView()}
            {currentView === 'balance' && renderBalanceView()}
            {currentView === 'policy' && (
              <div className="members-list" style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px' }}>
                <h3>Chính sách nghỉ phép</h3>
                <p>1. Nhân viên được hưởng 12 ngày phép năm cho mỗi năm làm việc.</p>
                <p>2. Nghỉ ốm trên 3 ngày cần có giấy khám bệnh hoặc giấy xác nhận của bác sĩ.</p>
                <p>3. Các kỳ nghỉ phép dài hạn cần phải thông báo trước ít nhất 2 tuần.</p>
              </div>
            )}
          </div>
        )}

        {/* Create Request Modal */}
        {isCreateModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
            <section className="employee-modal" onClick={e => e.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('leave.createRequest', 'Tạo đơn xin nghỉ thường')}</h3>
                <button type="button" className="ghost-btn" onClick={() => setIsCreateModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <form className="employee-create-form" onSubmit={handleCreateSubmit}>
                <div className="form-group row-field">
                  <label>Loại nghỉ phép</label>
                  <select className="input-control" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
                    {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group row-field">
                  <label>Từ ngày</label>
                  <input type="date" className="input-control" value={fromDate} onChange={e => setFromDate(e.target.value)} required />
                </div>
                <div className="form-group row-field">
                  <label>Đến ngày</label>
                  <input type="date" className="input-control" value={toDate} onChange={e => setToDate(e.target.value)} required />
                </div>
                <div className="form-group row-field" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <label style={{ marginBottom: '8px' }}>Lý do (Không bắt buộc)</label>
                  <textarea className="input-control" value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Lý do..." style={{ width: '100%', resize: 'vertical' }} />
                </div>
                <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="ghost-btn" onClick={() => setIsCreateModalOpen(false)}>Hủy</button>
                  <button type="submit" className="action-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="employee-modal-backdrop" onClick={() => setSelectedRequest(null)}>
            <div className="delete-confirm-modal members-modal personal-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Chi tiết Nghỉ phép</h3>
              <div className="members-list">
                <div className="member-item">
                  <span className="member-name">Mã đơn</span>
                  <span className="member-role">{selectedRequest.id}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">Nhân viên</span>
                  <span className="member-role">{selectedRequest.employeeName || selectedRequest.employeeId}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">Loại phép</span>
                  <span className="member-role">{LEAVE_TYPES.find(t => t.value === selectedRequest.leaveType)?.label || selectedRequest.leaveType}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">Thời gian</span>
                  <span className="member-role">
                    {new Date(selectedRequest.fromDate).toLocaleDateString()} &rarr; {new Date(selectedRequest.toDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="member-item">
                  <span className="member-name">Lý do</span>
                  <span className="member-role">{selectedRequest.reason || '-'}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">Trạng thái</span>
                  <span className="member-role">{renderStatus(selectedRequest.status)}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">Ngày tạo</span>
                  <span className="member-role">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                {canApprove && selectedRequest.status === 'pending' && (
                  <>
                    <button className="action-btn btn-success" onClick={() => handleApprove(selectedRequest.id)}>Duyệt</button>
                    <button className="action-btn btn-danger" onClick={() => handleReject(selectedRequest.id)}>Từ chối</button>
                  </>
                )}
                <button className="mini-btn" onClick={() => setSelectedRequest(null)}>Đóng</button>
              </div>
            </div>
          </div>
        )}

      </article>
    </section>
  );
}
