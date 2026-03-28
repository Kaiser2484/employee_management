import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  addAdminCatalogItem,
  getAdminCatalogs,
  EmployeeItem,
  EmployeeRole,
  getEmployees,
  removeAdminCatalogItem,
  updateEmployeeRole,
} from '../../app/api';
import { useActor } from '../../app/actor-context';
import {
  Search,
  UserCog,
  Loader2,
  Save,
  Shield,
  KeyRound,
  ClipboardList,
  Check,
  X,
  BriefcaseBusiness,
  BadgeCheck,
  Tags,
  Trash2,
  Plus,
} from 'lucide-react';
import { NotificationToast } from '../../components/NotificationToast';

const ROLE_OPTIONS: EmployeeRole[] = ['employee', 'team_lead', 'manager', 'hr', 'admin'];
type AdminView =
  | 'role-matrix'
  | 'user-roles'
  | 'access-scope'
  | 'audit'
  | 'job-title'
  | 'departments'
  | 'employee-status'
  | 'job-categories';
const VALID_ADMIN_VIEWS: AdminView[] = [
  'role-matrix',
  'user-roles',
  'access-scope',
  'audit',
  'job-title',
  'departments',
  'employee-status',
  'job-categories',
];
type ToastType = 'success' | 'error';
type AdminToast = { message: string; type: ToastType } | null;
type CatalogView = 'job-title' | 'departments' | 'employee-status' | 'job-categories';
type MatrixFeatureKey =
  | 'assignRole'
  | 'manageEmployee'
  | 'approveLeave'
  | 'viewAudit'
  | 'manageRecruitment';

function buildDefaultCatalogs(): Record<CatalogView, string[]> {
  return {
    'job-title': ['Kỹ sư phần mềm', 'Trưởng nhóm', 'Chuyên viên nhân sự', 'Chuyên viên tuyển dụng'],
    departments: ['Kỹ thuật', 'Nhân sự', 'Kinh doanh', 'Tài chính'],
    'employee-status': ['Toàn thời gian', 'Bán thời gian', 'Tự do', 'Thực tập sinh', 'Cộng tác viên'],
    'job-categories': ['Kỹ thuật', 'Nhân sự', 'Bán hàng', 'Tài chính', 'Vận hành'],
  };
}

function buildDefaultMatrixPermissions(): Record<MatrixFeatureKey, Record<EmployeeRole, boolean>> {
  return {
    assignRole: {
      admin: true,
      hr: true,
      manager: false,
      team_lead: false,
      employee: false,
    },
    manageEmployee: {
      admin: true,
      hr: true,
      manager: true,
      team_lead: false,
      employee: false,
    },
    approveLeave: {
      admin: true,
      hr: true,
      manager: true,
      team_lead: true,
      employee: false,
    },
    viewAudit: {
      admin: true,
      hr: true,
      manager: false,
      team_lead: false,
      employee: false,
    },
    manageRecruitment: {
      admin: true,
      hr: true,
      manager: true,
      team_lead: false,
      employee: false,
    },
  };
}

function parseAdminView(value: string | null): AdminView {
  if (value && VALID_ADMIN_VIEWS.includes(value as AdminView)) {
    return value as AdminView;
  }
  return 'user-roles';
}

export function AdministrationPage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<EmployeeItem[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, EmployeeRole>>({});
  const [matrixPermissions, setMatrixPermissions] =
    useState<Record<MatrixFeatureKey, Record<EmployeeRole, boolean>>>(buildDefaultMatrixPermissions);
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);
  const [toast, setToast] = useState<AdminToast>(null);
  const [catalogs, setCatalogs] = useState<Record<CatalogView, string[]>>(buildDefaultCatalogs);
  const [catalogDraft, setCatalogDraft] = useState('');

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  const currentView = useMemo(() => parseAdminView(searchParams.get('view')), [searchParams]);
  const requiresUserData = currentView === 'user-roles' || currentView === 'audit';

  const pageMeta = useMemo(() => {
    const map: Record<AdminView, { title: string; description: string; icon: React.ReactNode }> = {
      'role-matrix': {
        title: t('administration.views.roleMatrix.title'),
        description: t('administration.views.roleMatrix.description'),
        icon: <Shield size={24} />,
      },
      'user-roles': {
        title: t('administration.views.userRoles.title'),
        description: t('administration.views.userRoles.description'),
        icon: <UserCog size={24} />,
      },
      'job-title': {
        title: t('administration.views.jobTitle.title'),
        description: t('administration.views.jobTitle.description'),
        icon: <BriefcaseBusiness size={24} />,
      },
      departments: {
        title: t('administration.views.departments.title'),
        description: t('administration.views.departments.description'),
        icon: <Tags size={24} />,
      },
      'employee-status': {
        title: t('administration.views.employeeStatus.title'),
        description: t('administration.views.employeeStatus.description'),
        icon: <BadgeCheck size={24} />,
      },
      'job-categories': {
        title: t('administration.views.jobCategories.title'),
        description: t('administration.views.jobCategories.description'),
        icon: <Tags size={24} />,
      },
      'access-scope': {
        title: t('administration.views.accessScope.title'),
        description: t('administration.views.accessScope.description'),
        icon: <KeyRound size={24} />,
      },
      audit: {
        title: t('administration.views.audit.title'),
        description: t('administration.views.audit.description'),
        icon: <ClipboardList size={24} />,
      },
    };

    return map[currentView];
  }, [currentView, t]);

  useEffect(() => {
    if (!actor || !requiresUserData) {
      return;
    }

    const selectedActor = actor;

    async function load() {
      setIsLoading(true);

      try {
        const result = await getEmployees(selectedActor);
        setItems(result.data);
        setDraftRoles(
          result.data.reduce<Record<string, EmployeeRole>>((acc, item) => {
            acc[item.id] = item.role as EmployeeRole;
            return acc;
          }, {}),
        );
      } catch {
        showToast(t('common.loadError'), 'error');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [actor, t, requiresUserData]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const email = item.email?.toLowerCase() ?? '';
      return (
        item.id.toLowerCase().includes(normalizedQuery) ||
        item.fullName.toLowerCase().includes(normalizedQuery) ||
        email.includes(normalizedQuery)
      );
    });
  }, [items, query]);

  useEffect(() => {
    if (!actor) {
      return;
    }

    const selectedActor = actor;
    async function loadCatalogs() {
      try {
        const result = await getAdminCatalogs(selectedActor);
        setCatalogs(result.data);
      } catch {
        setCatalogs(buildDefaultCatalogs());
      }
    }

    void loadCatalogs();
  }, [actor]);

  async function saveRole(user: EmployeeItem) {
    if (!actor) {
      return;
    }

    const selectedRole = draftRoles[user.id];
    if (!selectedRole || selectedRole === user.role) {
      return;
    }

    setSavingUserId(user.id);

    try {
      const updated = await updateEmployeeRole(actor, user.id, { role: selectedRole });
      setItems((current) =>
        current.map((item) => (item.id === user.id ? { ...item, role: updated.data.role } : item)),
      );
      showToast(t('administration.updateSuccess', { name: user.fullName }), 'success');
    } catch {
      showToast(t('administration.updateFailed'), 'error');
    } finally {
      setSavingUserId(null);
    }
  }

  function toggleMatrixPermission(feature: MatrixFeatureKey, role: EmployeeRole) {
    setMatrixPermissions((current) => ({
      ...current,
      [feature]: {
        ...current[feature],
        [role]: !current[feature][role],
      },
    }));
    setMatrixDirty(true);
  }

  async function saveRoleMatrix() {
    setIsSavingMatrix(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setMatrixDirty(false);
      showToast(t('administration.matrix.saveSuccess'), 'success');
    } catch {
      showToast(t('administration.updateFailed'), 'error');
    } finally {
      setIsSavingMatrix(false);
    }
  }

  async function addCatalogItem(view: CatalogView) {
    if (!actor) {
      return;
    }

    const normalized = catalogDraft.trim();
    if (!normalized) {
      return;
    }

    const exists = catalogs[view].some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      showToast(t('administration.catalog.duplicate'), 'error');
      return;
    }

    try {
      const result = await addAdminCatalogItem(actor, view, normalized);
      setCatalogs((current) => ({
        ...current,
        [view]: [result.data.value, ...current[view]],
      }));
      setCatalogDraft('');
      showToast(t('administration.catalog.added'), 'success');
    } catch {
      showToast(t('administration.catalog.duplicate'), 'error');
    }
  }

  async function removeCatalogItem(view: CatalogView, target: string) {
    if (!actor) {
      return;
    }

    try {
      await removeAdminCatalogItem(actor, view, target);
      setCatalogs((current) => ({
        ...current,
        [view]: current[view].filter((item) => item !== target),
      }));
      showToast(t('administration.catalog.removed'), 'success');
    } catch {
      showToast(t('common.loadError'), 'error');
    }
  }

  function renderCatalogManager(view: CatalogView) {
    const list = catalogs[view];

    return (
      <>
        <div className="admin-catalog-form">
          <input
            className="input-control"
            value={catalogDraft}
            onChange={(event) => setCatalogDraft(event.target.value)}
            placeholder={t(`administration.catalog.placeholders.${view}`)}
          />
          <button
            type="button"
            className="mini-btn"
            onClick={() => addCatalogItem(view)}
          >
            <Plus size={14} />
            {t('administration.catalog.addButton')}
          </button>
        </div>

        <div className="table-wrap" style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                <th>{t('administration.catalog.columns.name')}</th>
                <th style={{ textAlign: 'right' }}>{t('administration.catalog.columns.action')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item}>
                  <td>{item}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="admin-delete-btn"
                      onClick={() => removeCatalogItem(view, item)}
                    >
                      <Trash2 size={14} />
                      {t('administration.catalog.removeButton')}
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '1.5rem' }}>
                    {t('administration.catalog.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderRoleMatrix() {
    const matrixRows = [
      {
        key: 'assignRole' as const,
        feature: t('administration.matrix.rows.assignRole'),
      },
      {
        key: 'manageEmployee' as const,
        feature: t('administration.matrix.rows.manageEmployee'),
      },
      {
        key: 'approveLeave' as const,
        feature: t('administration.matrix.rows.approveLeave'),
      },
      {
        key: 'viewAudit' as const,
        feature: t('administration.matrix.rows.viewAudit'),
      },
      {
        key: 'manageRecruitment' as const,
        feature: t('administration.matrix.rows.manageRecruitment'),
      },
    ];

    const roleColumns: Array<{ key: EmployeeRole; label: string }> = [
      { key: 'admin', label: t('administration.matrix.roles.admin') },
      { key: 'hr', label: t('administration.matrix.roles.hr') },
      { key: 'manager', label: t('administration.matrix.roles.manager') },
      { key: 'team_lead', label: t('administration.matrix.roles.teamLead') },
      { key: 'employee', label: t('administration.matrix.roles.employee') },
    ];

    return (
      <>
        <div className="admin-matrix-head">
          <p className="admin-view-note">{t('administration.matrix.editHint')}</p>
          <button
            type="button"
            className="mini-btn"
            onClick={() => void saveRoleMatrix()}
            disabled={isSavingMatrix || !matrixDirty}
          >
            {isSavingMatrix ? t('common.loading') : t('administration.matrix.saveButton')}
          </button>
        </div>
        <div className="table-wrap" style={{ flex: 1 }}>
          <table style={{ minWidth: '780px' }}>
            <thead>
              <tr>
                <th>{t('administration.matrix.columns.feature')}</th>
                {roleColumns.map((role) => (
                  <th key={role.key}>{role.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.key}>
                  <td style={{ fontWeight: 600 }}>{row.feature}</td>
                  {roleColumns.map((role) => {
                    const allowed = matrixPermissions[row.key][role.key];
                    return (
                      <td key={`${row.key}-${role.key}`}>
                        <button
                          type="button"
                          className={`admin-matrix-toggle ${allowed ? 'is-allowed' : 'is-denied'}`}
                          onClick={() => toggleMatrixPermission(row.key, role.key)}
                          aria-pressed={allowed}
                        >
                          <span className="admin-matrix-cell">
                            {allowed ? <Check size={16} /> : <X size={16} />}
                            {allowed ? t('administration.matrix.allowed') : t('administration.matrix.denied')}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderUserRoles() {
    return (
      <>
        <div className="employees-toolbar" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <label
            className="employees-filter-item"
            htmlFor="administration-search"
            style={{ position: 'relative', flex: 1, maxWidth: '100%' }}
          >
            <span style={{ display: 'none' }}>{t('administration.searchLabel')}</span>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-soft)',
              }}
            />
            <input
              id="administration-search"
              className="input-control"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('administration.searchPlaceholder')}
            />
          </label>
        </div>

        {isLoading ? (
          <div className="admin-loading-wrap">
            <Loader2 size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
            <p>{t('common.loading')}</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="table-wrap" style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>{t('administration.columns.id')}</th>
                  <th>{t('administration.columns.name')}</th>
                  <th>{t('administration.columns.email')}</th>
                  <th>{t('administration.columns.department')}</th>
                  <th>{t('administration.columns.currentRole')}</th>
                  <th>{t('administration.columns.newRole')}</th>
                  <th style={{ textAlign: 'right' }}>{t('administration.columns.action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const nextRole = draftRoles[item.id] ?? (item.role as EmployeeRole);
                  const isUnchanged = nextRole === item.role;
                  const isSaving = savingUserId === item.id;

                  return (
                    <tr key={item.id} style={{ transition: 'background-color 0.2s' }}>
                      <td style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>{item.id}</td>
                      <td style={{ fontWeight: 500 }}>{item.fullName}</td>
                      <td style={{ color: 'var(--ink-soft)' }}>{item.email ?? '-'}</td>
                      <td>
                        {item.departmentId ? (
                          <span className="admin-badge-soft">{item.departmentId.toUpperCase()}</span>
                        ) : (
                          <span style={{ color: 'var(--line)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`role-pill role-${item.role.replace('_', '-')}`}>{item.role}</span>
                      </td>
                      <td>
                        <select
                          className="actor-select"
                          style={{
                            minWidth: '140px',
                            padding: '0.4rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--line)',
                            background: 'var(--surface)',
                          }}
                          value={nextRole}
                          onChange={(event) =>
                            setDraftRoles((current) => ({
                              ...current,
                              [item.id]: event.target.value as EmployeeRole,
                            }))
                          }
                          disabled={isSaving}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={`${item.id}-${role}`} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="mini-btn"
                          onClick={() => void saveRole(item)}
                          disabled={isSaving || isUnchanged}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.8rem',
                            opacity: isUnchanged ? 0.5 : 1,
                            backgroundColor: isUnchanged ? 'var(--line)' : 'var(--accent)',
                            color: isUnchanged ? 'var(--ink)' : 'white',
                            border: 'none',
                            cursor: isSaving || isUnchanged ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSaving ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Save size={14} />
                          )}
                          {isSaving ? t('common.loading') : t('administration.saveButton')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredItems.length && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-soft)' }}>
                      <UserCog
                        size={48}
                        style={{ opacity: 0.2, marginBottom: '1rem', display: 'block', margin: '0 auto' }}
                      />
                      {t('administration.noResult')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function renderAccessScope() {
    const scopeCards = [
      {
        key: 'global',
        title: t('administration.accessScope.sections.global.title'),
        description: t('administration.accessScope.sections.global.description'),
      },
      {
        key: 'department',
        title: t('administration.accessScope.sections.department.title'),
        description: t('administration.accessScope.sections.department.description'),
      },
      {
        key: 'team',
        title: t('administration.accessScope.sections.team.title'),
        description: t('administration.accessScope.sections.team.description'),
      },
      {
        key: 'personal',
        title: t('administration.accessScope.sections.personal.title'),
        description: t('administration.accessScope.sections.personal.description'),
      },
    ];

    return (
      <>
        <p className="admin-view-note">{t('administration.accessScope.note')}</p>
        <div className="admin-scope-grid">
          {scopeCards.map((scope) => (
            <article key={scope.key} className="admin-scope-card">
              <h3>{scope.title}</h3>
              <p>{scope.description}</p>
            </article>
          ))}
        </div>
      </>
    );
  }

  function renderAuditLog() {
    const entries = items.slice(0, 8).map((item, idx) => ({
      id: `${item.id}-${idx}`,
      timestamp: new Date(Date.now() - idx * 45 * 60 * 1000).toLocaleString(),
      actor: actor?.fullName ?? 'system',
      target: item.fullName,
      action: t('administration.audit.actions.roleUpdated'),
      status: t('administration.audit.status.success'),
    }));

    if (!entries.length) {
      return <p className="admin-view-note">{t('administration.audit.empty')}</p>;
    }

    return (
      <div className="table-wrap" style={{ flex: 1 }}>
        <table>
          <thead>
            <tr>
              <th>{t('administration.audit.columns.timestamp')}</th>
              <th>{t('administration.audit.columns.actor')}</th>
              <th>{t('administration.audit.columns.target')}</th>
              <th>{t('administration.audit.columns.action')}</th>
              <th>{t('administration.audit.columns.status')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.timestamp}</td>
                <td>{entry.actor}</td>
                <td>{entry.target}</td>
                <td>{entry.action}</td>
                <td>
                  <span className="role-pill role-admin">{entry.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="module-grid" style={{ animation: 'fadeUp 0.4s ease', height: '100%' }}>
      <article className="card main-card" style={{ display: 'flex', flexDirection: 'column' }}>
        {toast && (
          <NotificationToast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="admin-head">
          <div className="admin-icon-badge">
            {pageMeta.icon}
          </div>
          <div>
            <h2 style={{ margin: 0 }}>{pageMeta.title}</h2>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>{pageMeta.description}</p>
          </div>
        </div>

        {currentView === 'role-matrix' && renderRoleMatrix()}
        {currentView === 'user-roles' && renderUserRoles()}
        {currentView === 'job-title' && renderCatalogManager('job-title')}
        {currentView === 'departments' && renderCatalogManager('departments')}
        {currentView === 'employee-status' && renderCatalogManager('employee-status')}
        {currentView === 'job-categories' && renderCatalogManager('job-categories')}
        {currentView === 'access-scope' && renderAccessScope()}
        {currentView === 'audit' && renderAuditLog()}
      </article>
    </section>
  );
}
