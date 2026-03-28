import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  createTask,
  getTasks,
  searchTaskAssignees,
  TaskAssigneeOption,
  TaskItem,
  TaskPriority,
  TaskStatus,
  updateTaskStatus,
} from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';
import { Plus, Loader2, CalendarDays, User2, X } from 'lucide-react';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

type TaskView = 'board' | 'mine' | 'created';

function parseTaskView(value: string | null): TaskView {
  if (value === 'mine' || value === 'created' || value === 'board') return value;
  return 'board';
}

export function TasksPage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createState, setCreateState] = useState({
    title: '',
    description: '',
    assigneeQuery: '',
    assigneeOptions: [] as TaskAssigneeOption[],
    selectedAssignees: [] as TaskAssigneeOption[],
    isSearchingAssignees: false,
    dueDate: '',
    priority: 'medium' as TaskPriority,
    isSubmitting: false,
  });

  const currentView = useMemo(() => parseTaskView(searchParams.get('view')), [searchParams]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    if (!actor) return;

    async function load() {
      setIsLoading(true);
      try {
        const result = await getTasks(actor);
        setTasks(result.data);
      } catch {
        showToast(t('common.loadError'), 'error');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [actor, t]);

  useEffect(() => {
    if (!actor || !isCreateModalOpen) return;
    const query = createState.assigneeQuery.trim();

    const timer = setTimeout(async () => {
      setCreateState((current) => ({ ...current, isSearchingAssignees: true }));
      try {
        const result = await searchTaskAssignees(actor, query);
        setCreateState((current) => ({ ...current, assigneeOptions: result.data }));
      } catch {
        setCreateState((current) => ({ ...current, assigneeOptions: [] }));
      } finally {
        setCreateState((current) => ({ ...current, isSearchingAssignees: false }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [actor, createState.assigneeQuery, isCreateModalOpen]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchView =
        currentView === 'board'
          ? true
          : currentView === 'mine'
            ? task.assigneeIds.includes(actor?.id ?? '')
            : task.createdById === actor?.id;

      const matchStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        (task.description ?? '').toLowerCase().includes(normalizedSearch);

      return matchView && matchStatus && matchPriority && matchSearch;
    });
  }, [actor?.id, currentView, priorityFilter, search, statusFilter, tasks]);

  const groupedTasks = useMemo(() => {
    return STATUS_OPTIONS.reduce<Record<TaskStatus, TaskItem[]>>((acc, option) => {
      acc[option.value] = filteredTasks.filter((task) => task.status === option.value);
      return acc;
    }, {
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    });
  }, [filteredTasks]);

  const statusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return t('tasks.status.todo', 'Chưa làm');
      case 'in_progress':
        return t('tasks.status.inProgress', 'Đang làm');
      case 'blocked':
        return t('tasks.status.blocked', 'Tắc');
      case 'done':
        return t('tasks.status.done', 'Hoàn thành');
      default:
        return status;
    }
  };

  const priorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'low':
        return t('tasks.priority.low', 'Thấp');
      case 'medium':
        return t('tasks.priority.medium', 'Trung bình');
      case 'high':
        return t('tasks.priority.high', 'Cao');
      case 'urgent':
        return t('tasks.priority.urgent', 'Gấp');
      default:
        return priority;
    }
  };

  const priorityClass = (priority: TaskPriority) => {
    if (priority === 'urgent') return 'priority-pill urgent';
    if (priority === 'high') return 'priority-pill high';
    if (priority === 'medium') return 'priority-pill medium';
    return 'priority-pill low';
  };

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    if (!actor) return;
    try {
      const result = await updateTaskStatus(actor, taskId, status);
      setTasks((current) => current.map((task) => (task.id === taskId ? result.data : task)));
      showToast(t('tasks.statusUpdated', 'Đã cập nhật trạng thái'), 'success');
    } catch {
      showToast(t('common.loadError'), 'error');
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!actor) return;
    if (createState.title.trim().length < 3) {
      showToast(t('tasks.validation.title'), 'error');
      return;
    }

    setCreateState((s) => ({ ...s, isSubmitting: true }));
    try {
      const payload = {
        title: createState.title.trim(),
        description: createState.description.trim() || undefined,
        assigneeId: createState.assigneeId.trim() || actor.id,
        dueDate: createState.dueDate || undefined,
        priority: createState.priority,
      };
      const result = await createTask(actor, payload);
      setTasks((current) => [result.data, ...current]);
      showToast(t('tasks.createSuccess', 'Đã tạo giao việc'), 'success');
      setCreateState({ title: '', description: '', assigneeId: '', dueDate: '', priority: 'medium', isSubmitting: false });
      setIsCreateModalOpen(false);
    } catch {
      showToast(t('tasks.createError', 'Không tạo được giao việc'), 'error');
      setCreateState((s) => ({ ...s, isSubmitting: false }));
    }
  }

  const renderBoard = () => {
    return (
      <div className="task-board">
        {STATUS_OPTIONS.map((column) => (
          <div key={column.value} className="task-column">
            <div className="task-column-head">
              <span>{statusLabel(column.value)}</span>
              <span className="badge-soft">{groupedTasks[column.value].length}</span>
            </div>
            <div className="task-column-body">
              {groupedTasks[column.value].map((task) => (
                <article key={task.id} className="task-card">
                  <header className="task-card-head">
                    <div>
                      <p className="task-id">{task.id}</p>
                      <h4>{task.title}</h4>
                    </div>
                    <select
                      className="task-status-select"
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {statusLabel(opt.value)}
                        </option>
                      ))}
                    </select>
                  </header>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  <div className="task-meta-row">
                    <span className={priorityClass(task.priority)}>{priorityLabel(task.priority)}</span>
                    {task.dueDate && (
                      <span className="task-meta">
                        <CalendarDays size={14} /> {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="task-assignees">
                    <span className="task-meta">
                      <User2 size={14} /> {task.assignee?.fullName || t('tasks.unassigned', 'Chưa gán')}
                    </span>
                    <span className="task-meta muted">
                      {t('tasks.createdBy', { name: task.createdBy?.fullName || task.createdById })}
                    </span>
                  </div>
                </article>
              ))}
              {!groupedTasks[column.value].length && (
                <div className="task-empty">{t('tasks.emptyColumn', 'Chưa có việc')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderList = () => {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('tasks.columns.id')}</th>
              <th>{t('tasks.columns.title')}</th>
              <th>{t('tasks.columns.assignee')}</th>
              <th>{t('tasks.columns.priority')}</th>
              <th>{t('tasks.columns.status')}</th>
              <th>{t('tasks.columns.dueDate')}</th>
              <th>{t('tasks.columns.createdBy')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>{task.title}</td>
                <td>{task.assignee?.fullName || t('tasks.unassigned', 'Chưa gán')}</td>
                <td><span className={priorityClass(task.priority)}>{priorityLabel(task.priority)}</span></td>
                <td>
                  <select
                    className="task-status-select inline"
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{statusLabel(opt.value)}</option>
                    ))}
                  </select>
                </td>
                <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                <td>{task.createdBy?.fullName || task.createdById}</td>
              </tr>
            ))}
            {!filteredTasks.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
                  {t('common.empty', 'Chưa có dữ liệu.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="module-grid">
      <article className="card main-card">
        {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h2>{t('tasks.title', 'Giao việc & Theo dõi')}</h2>
            <p>{t('tasks.description', 'Theo dõi tiến độ, phân công và trạng thái các giao việc.')}</p>
          </div>
          <button type="button" className="action-btn" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} style={{ marginRight: 8 }} />
            {t('tasks.createButton', 'Tạo giao việc')}
          </button>
        </header>

        <div className="task-toolbar">
          <div className="task-filters">
            <input
              className="input-control"
              placeholder={t('tasks.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}>
              <option value="all">{t('tasks.filters.allStatus')}</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{statusLabel(opt.value)}</option>
              ))}
            </select>
            <select className="input-control" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}>
              <option value="all">{t('tasks.filters.allPriority')}</option>
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{priorityLabel(opt.value)}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 className="spin" size={18} />
            <span>{t('common.loading')}</span>
          </div>
        )}

        {!isLoading && (
          <div style={{ marginTop: '1rem' }}>
            {currentView === 'board' ? renderBoard() : renderList()}
          </div>
        )}

        {isCreateModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
            <section className="employee-modal" onClick={(e) => e.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('tasks.createTitle', 'Tạo giao việc mới')}</h3>
                <button type="button" className="ghost-btn" onClick={() => setIsCreateModalOpen(false)}>
                  {t('common.close')}
                </button>
              </div>
              <form className="employee-create-form" onSubmit={handleCreate}>
                <div className="form-group row-field">
                  <label>{t('tasks.form.title')}</label>
                  <input
                    className="input-control"
                    value={createState.title}
                    onChange={(e) => setCreateState((s) => ({ ...s, title: e.target.value }))}
                    placeholder={t('tasks.form.titlePlaceholder')}
                    required
                  />
                </div>
                <div className="form-group row-field">
                  <label>{t('tasks.form.description')}</label>
                  <textarea
                    className="input-control"
                    rows={3}
                    value={createState.description}
                    onChange={(e) => setCreateState((s) => ({ ...s, description: e.target.value }))}
                    placeholder={t('tasks.form.descriptionPlaceholder')}
                  />
                </div>
                <div className="form-group row-field">
                  <label>{t('tasks.form.assignee')}</label>
                  <input
                    className="input-control"
                    value={createState.assigneeId}
                    onChange={(e) => setCreateState((s) => ({ ...s, assigneeId: e.target.value }))}
                    placeholder={t('tasks.form.assigneePlaceholder', 'Để trống sẽ gán cho bạn')}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group row-field">
                    <label>{t('tasks.form.dueDate')}</label>
                    <input
                      type="date"
                      className="input-control"
                      value={createState.dueDate}
                      onChange={(e) => setCreateState((s) => ({ ...s, dueDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group row-field">
                    <label>{t('tasks.form.priority')}</label>
                    <select
                      className="input-control"
                      value={createState.priority}
                      onChange={(e) => setCreateState((s) => ({ ...s, priority: e.target.value as TaskPriority }))}
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{priorityLabel(opt.value)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="ghost-btn" onClick={() => setIsCreateModalOpen(false)}>
                    {t('common.close')}
                  </button>
                  <button type="submit" className="action-btn" disabled={createState.isSubmitting}>
                    {createState.isSubmitting ? t('common.loading') : t('tasks.createButton')}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </article>
    </section>
  );
}
