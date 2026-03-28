import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck2, CalendarClock, MapPin, Plus, Users } from 'lucide-react';
import { EmployeeItem, getEmployees } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';

type ScheduleView = 'today' | 'created';
type ScheduleType = 'meeting' | 'business_trip';
type VisibilityScope = 'all_company' | 'department' | 'selected_users';
type ScheduleRangeMode = 'day' | 'week' | 'month';

interface ScheduleEntry {
  id: string;
  title: string;
  description?: string;
  type: ScheduleType;
  startAt: string;
  endAt: string;
  location?: string;
  scope: VisibilityScope;
  visibleUserIds: string[];
  visibleDepartmentId?: string;
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  createdAt: string;
}

interface ScheduleFormState {
  title: string;
  description: string;
  type: ScheduleType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  scope: VisibilityScope;
  selectedUserIds: string[];
}

const SCHEDULE_STORAGE_KEY = 'hrm_schedule_v1';
const VALID_VIEWS: ScheduleView[] = ['today', 'created'];
const RANGE_MODES: ScheduleRangeMode[] = ['day', 'week', 'month'];

const DEFAULT_FORM: ScheduleFormState = {
  title: '',
  description: '',
  type: 'meeting',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  scope: 'all_company',
  selectedUserIds: [],
};

function parseScheduleView(value: string | null): ScheduleView {
  if (value && VALID_VIEWS.includes(value as ScheduleView)) {
    return value as ScheduleView;
  }
  return 'today';
}

function loadSchedules(): ScheduleEntry[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ScheduleEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDateInput(value: string): string {
  if (value) {
    return value;
  }
  return new Date().toISOString().slice(0, 10);
}

function getRangeBounds(dateValue: string, mode: ScheduleRangeMode) {
  const safeDate = normalizeDateInput(dateValue);
  const base = new Date(`${safeDate}T00:00:00`);

  if (mode === 'day') {
    const start = new Date(base);
    const end = new Date(base);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (mode === 'week') {
    const day = base.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(base);
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

export function SchedulePage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [searchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(() => loadSchedules());
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ScheduleFormState>(DEFAULT_FORM);
  const [focusDate, setFocusDate] = useState(new Date().toISOString().slice(0, 10));
  const [rangeMode, setRangeMode] = useState<ScheduleRangeMode>('day');
  const [targetSearch, setTargetSearch] = useState('');

  const currentView = useMemo(() => parseScheduleView(searchParams.get('view')), [searchParams]);
  const canCreateSchedule = actor?.role === 'admin' || actor?.role === 'hr' || actor?.role === 'manager';

  useEffect(() => {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const selectedActor = actor;
    async function loadUsers() {
      try {
        const response = await getEmployees(selectedActor);
        setEmployees(response.data);
      } catch {
        setEmployees([]);
      }
    }

    void loadUsers();
  }, [actor]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  const currentEmployee = useMemo(() => {
    if (!actor) {
      return null;
    }
    return employees.find((item) => item.id === actor.id) ?? null;
  }, [actor, employees]);

  const managerDepartmentId = actor?.role === 'manager' ? currentEmployee?.departmentId ?? null : null;

  const selectableUsers = useMemo(() => {
    if (!actor) {
      return [];
    }

    if (actor.role === 'manager' && managerDepartmentId) {
      return employees.filter((item) => item.departmentId === managerDepartmentId);
    }

    return employees;
  }, [actor, employees, managerDepartmentId]);

  const visibleSchedules = useMemo(() => {
    if (!actor) {
      return [];
    }

    const viewerDepartmentId = currentEmployee?.departmentId ?? null;
    return schedules.filter((item) => {
      if (item.creatorId === actor.id) {
        return true;
      }
      if (item.scope === 'all_company') {
        return true;
      }
      if (item.scope === 'department') {
        return Boolean(item.visibleDepartmentId) && item.visibleDepartmentId === viewerDepartmentId;
      }
      return item.visibleUserIds.includes(actor.id);
    });
  }, [actor, currentEmployee?.departmentId, schedules]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySchedules = useMemo(() => {
    return visibleSchedules
      .filter((item) => item.startAt.slice(0, 10) === todayKey)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [todayKey, visibleSchedules]);

  const createdByMeSchedules = useMemo(() => {
    if (!actor) {
      return [];
    }
    return schedules
      .filter((item) => item.creatorId === actor.id)
      .sort((a, b) => b.startAt.localeCompare(a.startAt));
  }, [actor, schedules]);

  const rangeBounds = useMemo(() => getRangeBounds(focusDate, rangeMode), [focusDate, rangeMode]);

  const rangeSchedules = useMemo(() => {
    const source = currentView === 'created' ? createdByMeSchedules : visibleSchedules;
    return source
      .filter((item) => {
        const start = new Date(item.startAt).getTime();
        return start >= rangeBounds.start.getTime() && start < rangeBounds.end.getTime();
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [createdByMeSchedules, currentView, rangeBounds.end, rangeBounds.start, visibleSchedules]);

  const rangeSummary = useMemo(() => {
    const formatter: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const startText = rangeBounds.start.toLocaleDateString(undefined, formatter);
    const endDate = new Date(rangeBounds.end);
    endDate.setDate(endDate.getDate() - 1);
    const endText = endDate.toLocaleDateString(undefined, formatter);
    return `${startText} - ${endText}`;
  }, [rangeBounds.end, rangeBounds.start]);

  const selectedScope = actor?.role === 'manager' ? (form.scope === 'all_company' ? 'department' : form.scope) : form.scope;

  const selectedTargetUsers = useMemo(() => {
    if (!form.selectedUserIds.length) {
      return [];
    }
    return selectableUsers.filter((item) => form.selectedUserIds.includes(item.id));
  }, [form.selectedUserIds, selectableUsers]);

  const filteredTargetUsers = useMemo(() => {
    const normalized = targetSearch.trim().toLowerCase();
    const selectedIds = new Set(form.selectedUserIds);
    return selectableUsers.filter((item) => {
      if (selectedIds.has(item.id)) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const email = item.email?.toLowerCase() ?? '';
      const department = item.departmentId?.toLowerCase() ?? '';
      return (
        item.fullName.toLowerCase().includes(normalized) ||
        email.includes(normalized) ||
        item.id.toLowerCase().includes(normalized) ||
        department.includes(normalized)
      );
    });
  }, [form.selectedUserIds, selectableUsers, targetSearch]);

  function openCreateModal() {
    setForm((current) => ({
      ...DEFAULT_FORM,
      date: current.date || new Date().toISOString().slice(0, 10),
      scope: actor?.role === 'manager' ? 'department' : 'all_company',
      selectedUserIds: [],
    }));
    setTargetSearch('');
    setIsModalOpen(true);
  }

  function addTargetUser(userId: string) {
    setForm((current) => {
      if (current.selectedUserIds.includes(userId)) {
        return current;
      }
      return {
        ...current,
        selectedUserIds: [...current.selectedUserIds, userId],
      };
    });
    setTargetSearch('');
  }

  function removeTargetUser(userId: string) {
    setForm((current) => ({
      ...current,
      selectedUserIds: current.selectedUserIds.filter((id) => id !== userId),
    }));
  }

  function createSchedule(event: FormEvent) {
    event.preventDefault();
    if (!actor) {
      return;
    }

    if (form.title.trim().length < 3) {
      showToast(t('schedule.validation.title'), 'error');
      return;
    }

    const startAt = `${form.date}T${form.startTime}:00`;
    const endAt = `${form.date}T${form.endTime}:00`;
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      showToast(t('schedule.validation.timeRange'), 'error');
      return;
    }

    const normalizedScope = actor.role === 'manager' ? (selectedScope === 'all_company' ? 'department' : selectedScope) : selectedScope;
    if (normalizedScope === 'selected_users' && form.selectedUserIds.length === 0) {
      showToast(t('schedule.validation.targets'), 'error');
      return;
    }

    if (actor.role === 'manager' && !managerDepartmentId) {
      showToast(t('schedule.validation.managerDepartment'), 'error');
      return;
    }

    setSchedules((current) => [
      {
        id: `SCH-${Math.floor(Math.random() * 9000 + 1000)}`,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        startAt,
        endAt,
        location: form.location.trim() || undefined,
        scope: normalizedScope,
        visibleUserIds: normalizedScope === 'selected_users' ? form.selectedUserIds : [],
        visibleDepartmentId: normalizedScope === 'department' ? managerDepartmentId ?? currentEmployee?.departmentId ?? undefined : undefined,
        creatorId: actor.id,
        creatorName: actor.fullName,
        creatorRole: actor.role,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setIsModalOpen(false);
    setForm(DEFAULT_FORM);
    showToast(t('schedule.toast.created'), 'success');
  }

  function scopeLabel(scope: VisibilityScope) {
    return t(`schedule.scope.${scope}` as const);
  }

  function typeLabel(type: ScheduleType) {
    return t(`schedule.types.${type}` as const);
  }

  const metricToday = todaySchedules.length;
  const metricCreated = createdByMeSchedules.length;
  const metricInRange = rangeSchedules.length;

  return (
    <section className="module-grid">
      <article className="card main-card">
        {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <section className="schedule-hero">
          <div>
            <h2>{t('schedule.title')}</h2>
            <p>{t('schedule.description')}</p>
          </div>
          {canCreateSchedule && (
            <button type="button" className="action-btn" onClick={openCreateModal}>
              <Plus size={16} /> {t('schedule.create')}
            </button>
          )}
        </section>

        <section className="recruitment-metrics-grid">
          <article className="recruitment-metric-card">
            <CalendarClock size={18} />
            <div>
              <h4>{metricToday}</h4>
              <p>{t('schedule.metrics.today')}</p>
            </div>
          </article>
          <article className="recruitment-metric-card">
            <Users size={18} />
            <div>
              <h4>{metricCreated}</h4>
              <p>{t('schedule.metrics.createdByMe')}</p>
            </div>
          </article>
          <article className="recruitment-metric-card">
            <CalendarCheck2 size={18} />
            <div>
              <h4>{visibleSchedules.length}</h4>
              <p>{t('schedule.metrics.visible')}</p>
            </div>
          </article>
          <article className="recruitment-metric-card">
            <Users size={18} />
            <div>
              <h4>{metricInRange}</h4>
              <p>{t('schedule.metrics.inRange')}</p>
            </div>
          </article>
        </section>

        <div className="schedule-filter-bar">
          <div className="schedule-filter-group">
            <label htmlFor="schedule-focus-date">{t('schedule.filters.focusDate')}</label>
            <input
              id="schedule-focus-date"
              type="date"
              className="input-control"
              value={focusDate}
              onChange={(event) => setFocusDate(event.target.value)}
            />
          </div>
          <div className="schedule-range-tabs" role="tablist" aria-label={t('schedule.filters.range')}>
            {RANGE_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`schedule-range-tab ${rangeMode === mode ? 'active' : ''}`}
                onClick={() => setRangeMode(mode)}
              >
                {t(`schedule.filters.${mode}` as const)}
              </button>
            ))}
          </div>
          <div className="schedule-context-meta">
            <span>{t('schedule.currentView')}: <strong>{t(`schedule.views.${currentView}` as const)}</strong></span>
            <span>{t('schedule.filters.rangeLabel')}: <strong>{rangeSummary}</strong></span>
            <span>{t('schedule.currentRole')}: <strong>{actor?.role || '-'}</strong></span>
          </div>
        </div>

        <section className="schedule-agenda-grid">
          {rangeSchedules.map((item) => (
            <article key={item.id} className="schedule-agenda-card">
              <header>
                <span className="status-pill status-pending">{typeLabel(item.type)}</span>
                <small>{new Date(item.startAt).toLocaleDateString()}</small>
              </header>
              <h4>{item.title}</h4>
              <p>
                {new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(item.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p>{scopeLabel(item.scope)}</p>
              <p className="schedule-agenda-location"><MapPin size={14} /> {item.location || '-'}</p>
              <small>{t('schedule.columns.creator')}: {item.creatorName}</small>
            </article>
          ))}
          {!rangeSchedules.length && (
            <article className="schedule-agenda-empty">
              <p>{t('schedule.emptyInRange')}</p>
            </article>
          )}
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('schedule.columns.title')}</th>
                <th>{t('schedule.columns.type')}</th>
                <th>{t('schedule.columns.date')}</th>
                <th>{t('schedule.columns.time')}</th>
                <th>{t('schedule.columns.location')}</th>
                <th>{t('schedule.columns.scope')}</th>
                <th>{t('schedule.columns.creator')}</th>
                <th>{t('schedule.columns.note')}</th>
              </tr>
            </thead>
            <tbody>
              {rangeSchedules.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{typeLabel(item.type)}</td>
                  <td>{new Date(item.startAt).toLocaleDateString()}</td>
                  <td>{new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{item.location || '-'}</td>
                  <td>{scopeLabel(item.scope)}</td>
                  <td>{item.creatorName}</td>
                  <td><span className="schedule-note-cell">{item.description || '-'}</span></td>
                </tr>
              ))}
              {!rangeSchedules.length && (
                <tr><td colSpan={8}>{t('common.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <section className="employee-modal schedule-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('schedule.createTitle')}</h3>
                <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>{t('common.close')}</button>
              </div>

              <form className="employee-create-form" onSubmit={createSchedule}>
                <div className="schedule-modal-layout">
                  <div className="form-grid-2 schedule-form-grid">
                    <label className="recruitment-field full-width">
                      <span>{t('schedule.form.title')}</span>
                      <input
                        className="input-control"
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder={t('schedule.form.titlePlaceholder')}
                      />
                    </label>

                    <label className="recruitment-field">
                      <span>{t('schedule.form.type')}</span>
                      <select
                        className="input-control"
                        value={form.type}
                        onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ScheduleType }))}
                      >
                        <option value="meeting">{t('schedule.types.meeting')}</option>
                        <option value="business_trip">{t('schedule.types.business_trip')}</option>
                      </select>
                    </label>

                    <label className="recruitment-field">
                      <span>{t('schedule.form.scope')}</span>
                      <select
                        className="input-control"
                        value={selectedScope}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, scope: event.target.value as VisibilityScope, selectedUserIds: [] }));
                          setTargetSearch('');
                        }}
                      >
                        {actor?.role !== 'manager' && <option value="all_company">{t('schedule.scope.all_company')}</option>}
                        <option value="department">{t('schedule.scope.department')}</option>
                        <option value="selected_users">{t('schedule.scope.selected_users')}</option>
                      </select>
                    </label>

                    <label className="recruitment-field">
                      <span>{t('schedule.form.date')}</span>
                      <input
                        type="date"
                        className="input-control"
                        value={form.date}
                        onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      />
                    </label>

                    <label className="recruitment-field">
                      <span>{t('schedule.form.startTime')}</span>
                      <input
                        type="time"
                        className="input-control"
                        value={form.startTime}
                        onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                      />
                    </label>

                    <label className="recruitment-field">
                      <span>{t('schedule.form.endTime')}</span>
                      <input
                        type="time"
                        className="input-control"
                        value={form.endTime}
                        onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                      />
                    </label>

                    <label className="recruitment-field full-width">
                      <span>{t('schedule.form.location')}</span>
                      <input
                        className="input-control"
                        value={form.location}
                        onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                        placeholder={t('schedule.form.locationPlaceholder')}
                      />
                    </label>

                    {selectedScope === 'selected_users' && (
                      <label className="recruitment-field full-width">
                        <span>{t('schedule.form.targets')}</span>
                        <div className="schedule-target-picker">
                          <div className="schedule-target-search-row">
                            <input
                              className="input-control"
                              value={targetSearch}
                              onChange={(event) => setTargetSearch(event.target.value)}
                              placeholder={t('schedule.form.targetSearchPlaceholder')}
                            />
                          </div>
                          <div className="schedule-target-results">
                            {filteredTargetUsers.slice(0, 8).map((item) => (
                              <div key={item.id} className="schedule-target-result-item">
                                <div>
                                  <strong>{item.fullName}</strong>
                                  <small>{item.departmentId || '-'} {item.email ? `| ${item.email}` : ''}</small>
                                </div>
                                <button type="button" className="mini-btn" onClick={() => addTargetUser(item.id)}>
                                  {t('schedule.form.addTarget')}
                                </button>
                              </div>
                            ))}
                            {!filteredTargetUsers.length && (
                              <p className="schedule-helper-text">{t('schedule.form.noTargetSearchResults')}</p>
                            )}
                          </div>

                          <div className="schedule-selected-targets">
                            <span>{t('schedule.form.selectedTargets')}</span>
                            <div className="schedule-selected-target-list">
                              {selectedTargetUsers.map((item) => (
                                <span key={item.id} className="schedule-target-chip">
                                  {item.fullName}
                                  <button type="button" aria-label={t('schedule.form.removeTarget')} onClick={() => removeTargetUser(item.id)}>x</button>
                                </span>
                              ))}
                              {!selectedTargetUsers.length && (
                                <p className="schedule-helper-text">{t('schedule.form.selectedTargetsEmpty')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <small className="schedule-helper-text">{t('schedule.form.targetsHint')}</small>
                      </label>
                    )}

                    <label className="recruitment-field full-width">
                      <span>{t('schedule.form.description')}</span>
                      <textarea
                        className="input-control recruitment-evaluation-input"
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder={t('schedule.form.descriptionPlaceholder')}
                      />
                    </label>
                  </div>

                  <aside className="schedule-modal-preview">
                    <h4>{t('schedule.preview.title')}</h4>
                    <p><strong>{form.title || '-'}</strong></p>
                    <p>{typeLabel(form.type)}</p>
                    <p>{form.date || '-'} | {form.startTime} - {form.endTime}</p>
                    <p>{scopeLabel(selectedScope)}</p>
                    <p>{form.location || '-'}</p>
                    <p>{t('schedule.preview.targetCount', { count: form.selectedUserIds.length })}</p>
                    <p className="schedule-helper-text">{form.description || t('schedule.preview.descriptionFallback')}</p>
                  </aside>
                </div>

                {actor?.role === 'manager' && (
                  <p className="schedule-helper-text">{t('schedule.managerRule')}</p>
                )}

                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="ghost-btn" onClick={() => setIsModalOpen(false)}>{t('common.close')}</button>
                  <button type="submit" className="action-btn">{t('schedule.save')}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </article>
    </section>
  );
}
