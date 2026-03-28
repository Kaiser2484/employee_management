import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { getEmployees, EmployeeItem, createEmployee, CreateEmployeePayload } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';
import { Plus } from 'lucide-react';

const ROLE_OPTIONS: CreateEmployeePayload['role'][] = ['employee', 'team_lead', 'manager', 'hr', 'admin'];
const ADMIN_CATALOGS_STORAGE_KEY = 'hrm_admin_catalogs';
type EmployeeView = 'profile' | 'departments' | 'teams' | 'organization' | 'contract' | 'performance' | 'education';
const VALID_EMPLOYEE_VIEWS: EmployeeView[] = ['profile', 'departments', 'teams', 'organization', 'contract', 'performance', 'education'];

type AdminCatalogs = {
  'job-title': string[];
  'employee-status': string[];
  'job-categories': string[];
};

function getDefaultAdminCatalogs(): AdminCatalogs {
  return {
    'job-title': ['Software Engineer', 'Team Lead', 'HR Executive', 'Recruitment Specialist'],
    'employee-status': ['Full-time', 'Part-time', 'Freelance', 'Intern', 'Contractor'],
    'job-categories': ['Engineering', 'Human Resource', 'Sales', 'Finance', 'Operations'],
  };
}

function loadAdminCatalogs(): AdminCatalogs {
  const defaults = getDefaultAdminCatalogs();
  try {
    const raw = localStorage.getItem(ADMIN_CATALOGS_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<AdminCatalogs>;
    return {
      'job-title': Array.isArray(parsed['job-title']) ? parsed['job-title'] : defaults['job-title'],
      'employee-status': Array.isArray(parsed['employee-status']) ? parsed['employee-status'] : defaults['employee-status'],
      'job-categories': Array.isArray(parsed['job-categories']) ? parsed['job-categories'] : defaults['job-categories'],
    };
  } catch {
    return defaults;
  }
}

function parseEmployeeView(value: string | null): EmployeeView {
  if (value && VALID_EMPLOYEE_VIEWS.includes(value as EmployeeView)) {
    return value as EmployeeView;
  }
  return 'profile';
}

type EmployeeFormState = {
  fullName: string;
  email: string;
  password: string;
  role: CreateEmployeePayload['role'];
  gender: string;
  dateOfBirth: string;
  address: string;
  startDate: string;
  nationalId: string;
  employeeStatus: string;
  jobCategory: string;
  jobTitle: string;
  degree: string;
  departmentId: string;
  teamId: string;
  photoDataUrl: string;
  otherDegreesFiles: File[];
  languageCertificatesFiles: File[];
};

const DEFAULT_FORM: EmployeeFormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'employee',
  gender: '',
  dateOfBirth: '',
  address: '',
  startDate: '',
  nationalId: '',
  employeeStatus: '',
  jobCategory: '',
  jobTitle: '',
  degree: '',
  departmentId: '',
  teamId: '',
  photoDataUrl: '',
  otherDegreesFiles: [],
  languageCertificatesFiles: [],
};

export function EmployeesPage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<EmployeeItem[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [adminCatalogs, setAdminCatalogs] = useState<AdminCatalogs>(loadAdminCatalogs);
  const [newDepartment, setNewDepartment] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [manualDepartments, setManualDepartments] = useState<string[]>([]);
  const [manualTeams, setManualTeams] = useState<string[]>([]);
  const [selectedDeptDetails, setSelectedDeptDetails] = useState<string | null>(null);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState<string | null>(null);
  const [selectedEducation, setSelectedEducation] = useState<EmployeeItem | null>(null);
  const [extraDegreesByEmployee, setExtraDegreesByEmployee] = useState<Record<string, Array<{ name: string; url: string }>>>({});

  const currentView = useMemo(() => parseEmployeeView(searchParams.get('view')), [searchParams]);

  const canCreate = actor?.role === 'admin' || actor?.role === 'hr';

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    if (!actor) {
      return;
    }

    const selectedActor = actor;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getEmployees(selectedActor);
        setItems(result.data);
      } catch (err) {
        const message = t('common.loadError');
        setError(message);
        showToast(message, 'error');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [actor, t]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter]);

  useEffect(() => {
    if (isCreateModalOpen) {
      setAdminCatalogs(loadAdminCatalogs());
    }
  }, [isCreateModalOpen]);

  const normalizedQuery = query.trim().toLowerCase();
  const roleOptions = ['all', ...new Set(items.map((item) => item.role))];
  const filteredItems = items.filter((item) => {
    const matchRole = roleFilter === 'all' || item.role === roleFilter;
    const emailText = item.email?.toLowerCase() ?? '';
    const matchQuery =
      normalizedQuery.length === 0 ||
      item.id.toLowerCase().includes(normalizedQuery) ||
      item.fullName.toLowerCase().includes(normalizedQuery) ||
      emailText.includes(normalizedQuery);

    return matchRole && matchQuery;
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedItems = filteredItems.slice(pageStart, pageEnd);

  const departments = useMemo(() => {
    const derived = items.map((item) => item.departmentId).filter(Boolean) as string[];
    return [...new Set([...manualDepartments, ...derived])];
  }, [items, manualDepartments]);

  const teams = useMemo(() => {
    const derived = items.map((item) => item.teamId).filter(Boolean) as string[];
    return [...new Set([...manualTeams, ...derived])];
  }, [items, manualTeams]);

  const departmentCards = useMemo(() => {
    const hasUnassigned = items.some((item) => !item.departmentId);
    const list = [...departments];
    if (hasUnassigned) {
      list.push('Unassigned');
    }
    return [...new Set(list)];
  }, [departments, items]);

  const teamCards = useMemo(() => {
    const hasUnassigned = items.some((item) => !item.teamId);
    const list = [...teams];
    if (hasUnassigned) {
      list.push('Unassigned');
    }
    return [...new Set(list)];
  }, [teams, items]);

  const contractRows = useMemo(() => {
    const contractTypes = ['Full-time', 'Part-time', 'Freelance', 'Contractor'];
    return items.slice(0, 16).map((item, index) => ({
      id: `ct-${item.id}`,
      employee: item.fullName,
      type: contractTypes[index % contractTypes.length],
      validUntil: new Date(Date.now() + (index + 2) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: index % 4 === 0 ? 'expired' : 'active',
    }));
  }, [items]);

  const performanceRows = useMemo(() => {
    return items.slice(0, 12).map((item, index) => ({
      id: `pf-${item.id}`,
      employee: item.fullName,
      kpi: 68 + (index * 5) % 28,
      rating: ['C', 'B', 'B+', 'A', 'A+'][index % 5],
    }));
  }, [items]);

  async function handleCreateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!actor || !canCreate) {
      return;
    }

    setToast(null);

    if (form.fullName.trim().length < 3) {
      showToast(t('employees.create.validationFullName'), 'error');
      return;
    }

    if (form.password.length < 8) {
      showToast(t('employees.create.validationPassword'), 'error');
      return;
    }

    if (!form.gender) {
      showToast(t('employees.create.validationGender'), 'error');
      return;
    }

    if (!form.dateOfBirth) {
      showToast(t('employees.create.validationDateOfBirth'), 'error');
      return;
    }

    if (!form.startDate) {
      showToast(t('employees.create.validationStartDate'), 'error');
      return;
    }

    if (!form.nationalId.trim()) {
      showToast(t('employees.create.validationNationalId'), 'error');
      return;
    }

    if (!form.employeeStatus) {
      showToast(t('employees.create.validationEmployeeStatus'), 'error');
      return;
    }

    if (!form.jobCategory) {
      showToast(t('employees.create.validationJobCategory'), 'error');
      return;
    }

    if (!form.jobTitle) {
      showToast(t('employees.create.validationJobTitle'), 'error');
      return;
    }

    if (!form.degree.trim()) {
      showToast(t('employees.create.validationDegree'), 'error');
      return;
    }

    if (!form.photoDataUrl) {
      showToast(t('employees.create.validationPhoto'), 'error');
      return;
    }

    if (!form.departmentId.trim()) {
      showToast(t('employees.create.validationDepartment'), 'error');
      return;
    }

    if (!form.teamId.trim()) {
      showToast(t('employees.create.validationTeam'), 'error');
      return;
    }

    const payload: CreateEmployeePayload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      degree: form.degree.trim(),
      departmentId: form.departmentId.trim() || undefined,
      teamId: form.teamId.trim() || undefined,
    };

    setIsSubmitting(true);

    try {
      const created = await createEmployee(actor, payload);
      setItems((current) => [created.data, ...current]);
      showToast(t('employees.create.success'), 'success');
      setForm(DEFAULT_FORM);
      setIsCreateModalOpen(false);
    } catch {
      showToast(t('employees.create.failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePhotoUpload(file: File | null) {
    if (!file) {
      setForm((current) => ({ ...current, photoDataUrl: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setForm((current) => ({ ...current, photoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function addDepartment() {
    const value = newDepartment.trim();
    if (!value) return;
    if (departments.some((item) => item.toLowerCase() === value.toLowerCase())) {
      showToast(t('employees.organization.duplicateDepartment'), 'error');
      return;
    }
    setManualDepartments((current) => [value, ...current]);
    setNewDepartment('');
    showToast(t('employees.organization.addedDepartment'), 'success');
  }

  function addTeam() {
    const value = newTeam.trim();
    if (!value) return;
    if (teams.some((item) => item.toLowerCase() === value.toLowerCase())) {
      showToast(t('employees.organization.duplicateTeam'), 'error');
      return;
    }
    setManualTeams((current) => [value, ...current]);
    setNewTeam('');
    showToast(t('employees.organization.addedTeam'), 'success');
  }

  function handleUploadExtraDegrees(employeeId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const uploaded = Array.from(fileList).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    setExtraDegreesByEmployee((current) => ({
      ...current,
      [employeeId]: [...(current[employeeId] ?? []), ...uploaded],
    }));
  }

  function renderProfileView() {
    return (
      <>
        {canCreate && (
          <div className="employee-create-launch">
            <button
              type="button"
              className="employee-add-icon-btn"
              title={t('employees.create.openModal')}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {canCreate && isCreateModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
            <section className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('employees.create.title')}</h3>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  {t('employees.create.cancel')}
                </button>
              </div>

              <form className="employee-create-form" onSubmit={handleCreateEmployee}>
                <div className="employee-create-sections">
                  {/* Personal Information */}
                  <fieldset className="employee-fieldset">
                    <legend className="employee-fieldset-legend">{t('employees.create.sections.personal')}</legend>
                    <div className="employee-create-grid">
                      <label className="employees-filter-item" htmlFor="employee-photo">
                        <span>{t('employees.create.photo')}</span>
                        <input
                          id="employee-photo"
                          className="input-control"
                          type="file"
                          accept="image/*"
                          onChange={(event) => handlePhotoUpload(event.target.files?.[0] ?? null)}
                          required={!form.photoDataUrl}
                        />
                        {form.photoDataUrl && (
                          <img className="employee-photo-preview" src={form.photoDataUrl} alt={t('employees.create.photoPreviewAlt')} />
                        )}
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-full-name">
                        <span>{t('employees.create.fullName')}</span>
                        <input
                          id="employee-full-name"
                          className="input-control"
                          value={form.fullName}
                          onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                          placeholder={t('employees.create.fullNamePlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-gender">
                        <span>{t('employees.create.gender')}</span>
                        <select
                          id="employee-gender"
                          className="input-control"
                          value={form.gender}
                          onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          <option value="male">{t('employees.create.genderOptions.male')}</option>
                          <option value="female">{t('employees.create.genderOptions.female')}</option>
                          <option value="other">{t('employees.create.genderOptions.other')}</option>
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-date-of-birth">
                        <span>{t('employees.create.dateOfBirth')}</span>
                        <input
                          id="employee-date-of-birth"
                          className="input-control"
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-national-id">
                        <span>{t('employees.create.nationalId')}</span>
                        <input
                          id="employee-national-id"
                          className="input-control"
                          value={form.nationalId}
                          onChange={(event) => setForm((current) => ({ ...current, nationalId: event.target.value }))}
                          placeholder={t('employees.create.nationalIdPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item full-width" htmlFor="employee-address">
                        <span>{t('employees.create.address')}</span>
                        <input
                          id="employee-address"
                          className="input-control"
                          value={form.address}
                          onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                          placeholder={t('employees.create.addressPlaceholder')}
                        />
                      </label>
                    </div>
                  </fieldset>

                  {/* Employment & Account */}
                  <fieldset className="employee-fieldset">
                    <legend className="employee-fieldset-legend">{t('employees.create.sections.employment')}</legend>
                    <div className="employee-create-grid">
                      <label className="employees-filter-item" htmlFor="employee-email">
                        <span>{t('employees.create.email')}</span>
                        <input
                          id="employee-email"
                          className="input-control"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder={t('employees.create.emailPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-password">
                        <span>{t('employees.create.password')}</span>
                        <input
                          id="employee-password"
                          className="input-control"
                          type="password"
                          value={form.password}
                          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                          placeholder={t('employees.create.passwordPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-role">
                        <span>{t('employees.create.role')}</span>
                        <select
                          id="employee-role"
                          className="input-control"
                          value={form.role}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              role: event.target.value as CreateEmployeePayload['role'],
                            }))
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-start-date">
                        <span>{t('employees.create.startDate')}</span>
                        <input
                          id="employee-start-date"
                          className="input-control"
                          type="date"
                          value={form.startDate}
                          onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-status">
                        <span>{t('employees.create.employeeStatus')}</span>
                        <select
                          id="employee-status"
                          className="input-control"
                          value={form.employeeStatus}
                          onChange={(event) => setForm((current) => ({ ...current, employeeStatus: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs['employee-status'].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-job-category">
                        <span>{t('employees.create.jobCategory')}</span>
                        <select
                          id="employee-job-category"
                          className="input-control"
                          value={form.jobCategory}
                          onChange={(event) => setForm((current) => ({ ...current, jobCategory: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs['job-categories'].map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-job-title">
                        <span>{t('employees.create.jobTitle')}</span>
                        <select
                          id="employee-job-title"
                          className="input-control"
                          value={form.jobTitle}
                          onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs['job-title'].map((job) => (
                            <option key={job} value={job}>
                              {job}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-department-id">
                        <span>{t('employees.create.departmentId')}</span>
                        <input
                          id="employee-department-id"
                          className="input-control"
                          value={form.departmentId}
                          onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
                          placeholder={t('employees.create.departmentPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-team-id">
                        <span>{t('employees.create.teamId')}</span>
                        <input
                          id="employee-team-id"
                          className="input-control"
                          value={form.teamId}
                          onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))}
                          placeholder={t('employees.create.teamPlaceholder')}
                          required
                        />
                      </label>
                    </div>
                  </fieldset>

                  {/* Qualifications */}
                  <fieldset className="employee-fieldset">
                    <legend className="employee-fieldset-legend">{t('employees.create.sections.qualifications')}</legend>
                    <div className="employee-create-grid">
                      <label className="employees-filter-item full-width" htmlFor="employee-degree">
                        <span>{t('employees.create.degree')}</span>
                        <input
                          id="employee-degree"
                          className="input-control"
                          value={form.degree}
                          onChange={(event) => setForm((current) => ({ ...current, degree: event.target.value }))}
                          placeholder={t('employees.create.degreePlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-other-degrees">
                        <span>{t('employees.create.otherDegrees')}</span>
                        <input
                          id="employee-other-degrees"
                          className="input-control"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => setForm(current => ({ ...current, otherDegreesFiles: event.target.files ? Array.from(event.target.files) : [] }))}
                        />
                        {form.otherDegreesFiles.length > 0 && (
                          <div className="file-list-preview">
                            {form.otherDegreesFiles.map((f, i) => (
                              <span key={i} className="file-preview-item">{f.name}</span>
                            ))}
                          </div>
                        )}
                      </label>

                      <label className="employees-filter-item" htmlFor="employee-language-certs">
                        <span>{t('employees.create.languageCertificates')}</span>
                        <input
                          id="employee-language-certs"
                          className="input-control"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => setForm(current => ({ ...current, languageCertificatesFiles: event.target.files ? Array.from(event.target.files) : [] }))}
                        />
                        {form.languageCertificatesFiles.length > 0 && (
                          <div className="file-list-preview">
                            {form.languageCertificatesFiles.map((f, i) => (
                              <span key={i} className="file-preview-item">{f.name}</span>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>
                  </fieldset>
                </div>

                <div className="employee-create-actions">
                  <button className="mini-btn" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('common.loading') : t('employees.create.submit')}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <div className="employees-toolbar">
          <label className="employees-filter-item" htmlFor="employee-search">
            <span>{t('employees.searchLabel')}</span>
            <input
              id="employee-search"
              className="input-control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('employees.searchPlaceholder')}
            />
          </label>

          <label className="employees-filter-item" htmlFor="employee-role-filter">
            <span>{t('employees.roleFilterLabel')}</span>
            <select
              id="employee-role-filter"
              className="input-control"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role === 'all' ? t('employees.allRoles') : role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="employees-meta">
          {t('employees.showingSummary', {
            from: filteredItems.length === 0 ? 0 : pageStart + 1,
            to: Math.min(pageEnd, filteredItems.length),
            total: filteredItems.length,
          })}
        </p>

        {isLoading && <p>{t('common.loading')}</p>}
        {!isLoading && !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('employees.columns.id')}</th>
                  <th>{t('employees.columns.name')}</th>
                  <th>{t('employees.columns.email')}</th>
                  <th>{t('employees.columns.role')}</th>
                  <th>{t('employees.columns.department')}</th>
                  <th>{t('employees.columns.team')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.fullName}</td>
                    <td>{item.email ?? '-'}</td>
                    <td>
                      <span className={`role-pill role-${item.role.replace('_', '-')}`}>{item.role}</span>
                    </td>
                    <td>{item.departmentId ?? '-'}</td>
                    <td>{item.teamId ?? '-'}</td>
                  </tr>
                ))}
                {!pagedItems.length && (
                  <tr>
                    <td colSpan={6}>{t('employees.noResult')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="pagination-row sticky-pagination">
            <div className="pagination-page-size">
              <span>{t('employees.pageSizeLabel')}</span>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value);
                  setPageSize(nextSize);
                  setPage(1);
                }}
              >
                {[50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="pagination-controls">
            <button
              className="mini-btn"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
            >
              {t('employees.prevPage')}
            </button>
            <span>
              {t('employees.pageLabel', {
                current: safePage,
                total: totalPages,
              })}
            </span>
            <button
              className="mini-btn"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
            >
              {t('employees.nextPage')}
            </button>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderDepartmentsView() {
    return (
      <>
        <p className="employees-meta">{t('employees.organization.description')}</p>
        <div className="org-add-panels">
          <div className="org-add-panel">
            <input
              className="input-control"
              value={newDepartment}
              onChange={(event) => setNewDepartment(event.target.value)}
              placeholder={t('employees.organization.departmentPlaceholder')}
            />
            <button className="mini-btn" type="button" onClick={addDepartment}>
              {t('employees.organization.addDepartment')}
            </button>
          </div>
        </div>
        <div className="org-teams-list">
          {departmentCards.map((dept) => {
            const members = items.filter((member) => (member.departmentId ?? 'Unassigned') === dept);
            return (
              <div
                key={dept}
                className="org-team-card clickable-card"
                onClick={() => setSelectedDeptDetails(dept)}
              >
                <div className="org-team-content">
                  <div className="org-team-info">
                    <h4 className="org-team-name">
                      {dept === 'Unassigned' ? t('employees.organization.unassigned') ?? 'Unassigned' : dept}
                    </h4>
                    <span className="org-team-count">{t('employees.organization.members', { count: members.length }) ?? 'members'}</span>
                  </div>
                  <span className="org-team-icon">🏢</span>
                </div>
              </div>
            );
          })}
          {!departmentCards.length && <p>{t('employees.noResult')}</p>}
        </div>
      </>
    );
  }

  function renderTeamsView() {
    return (
      <>
        <p className="employees-meta">{t('employees.organization.description')}</p>
        <div className="org-add-panels">
          <div className="org-add-panel">
            <input
              className="input-control"
              value={newTeam}
              onChange={(event) => setNewTeam(event.target.value)}
              placeholder={t('employees.organization.teamPlaceholder')}
            />
            <button className="mini-btn" type="button" onClick={addTeam}>
              {t('employees.organization.addTeam')}
            </button>
          </div>
        </div>
        <div className="org-teams-list">
          {teamCards.map((team) => {
            const members = items.filter((member) => (member.teamId ?? 'Unassigned') === team);
            return (
              <div
                key={team}
                className="org-team-card clickable-card"
                onClick={() => setSelectedTeamDetails(team)}
              >
                <div className="org-team-content">
                  <div className="org-team-info">
                    <h4 className="org-team-name">{team === 'Unassigned' ? t('employees.organization.unassigned') ?? 'Unassigned' : team}</h4>
                    <span className="org-team-count">{t('employees.organization.members', { count: members.length }) ?? 'members'}</span>
                  </div>
                  <span className="org-team-icon">👥</span>
                </div>
              </div>
            );
          })}
          {!teamCards.length && <p>{t('employees.noResult')}</p>}
        </div>
      </>
    );
  }

  function renderEducationView() {
    return (
      <>
        <p className="employees-meta">{t('employees.education.description')}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('employees.education.columns.id')}</th>
                <th>{t('employees.education.columns.name')}</th>
                <th>{t('employees.education.columns.email')}</th>
                <th>{t('employees.education.columns.role')}</th>
                <th>{t('employees.education.columns.degree')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => (
                <tr key={item.id} className="clickable-card" onClick={() => setSelectedEducation(item)}>
                  <td>{item.id}</td>
                  <td>{item.fullName}</td>
                  <td>{item.email ?? '-'}</td>
                  <td>
                    <span className={`role-pill role-${item.role.replace('_', '-')}`}>{item.role}</span>
                  </td>
                  <td>{item.degree || t('employees.education.noDegree')}</td>
                </tr>
              ))}
              {!pagedItems.length && (
                <tr>
                  <td colSpan={5}>{t('employees.noResult')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="pagination-row sticky-pagination">
            <div className="pagination-page-size">
              <span>{t('employees.pageSizeLabel')}</span>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value);
                  setPageSize(nextSize);
                  setPage(1);
                }}
              >
                {[50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="pagination-controls">
              <button
                className="mini-btn"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                {t('employees.prevPage')}
              </button>
              <span>
                {t('employees.pageLabel', {
                  current: safePage,
                  total: totalPages,
                })}
              </span>
              <button
                className="mini-btn"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
              >
                {t('employees.nextPage')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderOrganizationView() {
    return (
      <>
        <p className="employees-meta">{t('employees.organization.description')}</p>
        <div className="employee-catalog-grid">
          <section className="employee-catalog-card">
            <h3>{t('employees.organization.departments')}</h3>
            <div className="employee-catalog-form">
              <input
                className="input-control"
                value={newDepartment}
                onChange={(event) => setNewDepartment(event.target.value)}
                placeholder={t('employees.organization.departmentPlaceholder')}
              />
              <button className="mini-btn" type="button" onClick={addDepartment}>
                {t('employees.organization.addDepartment')}
              </button>
            </div>
            <div className="employee-chip-wrap">
              {departments.map((item) => (
                <span key={item} className="submodule-pill">{item}</span>
              ))}
            </div>
          </section>

          <section className="employee-catalog-card">
            <h3>{t('employees.organization.teams')}</h3>
            <div className="employee-catalog-form">
              <input
                className="input-control"
                value={newTeam}
                onChange={(event) => setNewTeam(event.target.value)}
                placeholder={t('employees.organization.teamPlaceholder')}
              />
              <button className="mini-btn" type="button" onClick={addTeam}>
                {t('employees.organization.addTeam')}
              </button>
            </div>
            <div className="employee-chip-wrap">
              {teams.map((item) => (
                <span key={item} className="submodule-pill">{item}</span>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderContractView() {
    return (
      <>
        <p className="employees-meta">{t('employees.contract.description')}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('employees.contract.columns.id')}</th>
                <th>{t('employees.contract.columns.employee')}</th>
                <th>{t('employees.contract.columns.type')}</th>
                <th>{t('employees.contract.columns.validUntil')}</th>
                <th>{t('employees.contract.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {contractRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.employee}</td>
                  <td>{row.type}</td>
                  <td>{row.validUntil}</td>
                  <td>
                    <span className={`status-pill ${row.status === 'active' ? 'status-approved' : 'status-pending'}`}>
                      {row.status === 'active' ? t('employees.contract.active') : t('employees.contract.expired')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderPerformanceView() {
    return (
      <>
        <p className="employees-meta">{t('employees.performance.description')}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('employees.performance.columns.employee')}</th>
                <th>{t('employees.performance.columns.kpi')}</th>
                <th>{t('employees.performance.columns.rating')}</th>
              </tr>
            </thead>
            <tbody>
              {performanceRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employee}</td>
                  <td>
                    <div className="employee-kpi-bar-wrap">
                      <div className="employee-kpi-bar" style={{ width: `${row.kpi}%` }} />
                    </div>
                    <span>{row.kpi}%</span>
                  </td>
                  <td>
                    <span className="role-pill role-admin">{row.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
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
        <h2>{t('employees.title')}</h2>
        <p>{t('employees.description')}</p>
        {currentView === 'profile' && renderProfileView()}
        {currentView === 'departments' && renderDepartmentsView()}
        {currentView === 'teams' && renderTeamsView()}
        {currentView === 'organization' && renderOrganizationView()}
        {currentView === 'contract' && renderContractView()}
        {currentView === 'performance' && renderPerformanceView()}
        {currentView === 'education' && renderEducationView()}

        {selectedDeptDetails && (
          <div className="employee-modal-backdrop" onClick={() => setSelectedDeptDetails(null)}>
            <div className="delete-confirm-modal members-modal" onClick={(e) => e.stopPropagation()}>
              <h3>
                {t('employees.organization.department')}:&nbsp;
                {selectedDeptDetails === 'Unassigned'
                  ? t('employees.organization.unassigned') ?? 'Unassigned'
                  : selectedDeptDetails}
              </h3>
              <div className="members-list">
                {items
                  .filter((i) => (i.departmentId ?? 'Unassigned') === selectedDeptDetails)
                  .map((member) => (
                    <div key={member.id} className="member-item">
                      <span className="member-name">{member.fullName}</span>
                      <span className={`role-pill role-${member.role.replace('_', '-')}`}>{member.role}</span>
                    </div>
                  ))}
                {!items.some((i) => (i.departmentId ?? 'Unassigned') === selectedDeptDetails) && (
                  <span className="member-name">{t('employees.noResult')}</span>
                )}
              </div>
              <button className="mini-btn" onClick={() => setSelectedDeptDetails(null)}>
                {t('common.close') ?? 'Close'}
              </button>
            </div>
          </div>
        )}

        {selectedTeamDetails && (
          <div className="employee-modal-backdrop" onClick={() => setSelectedTeamDetails(null)}>
            <div className="delete-confirm-modal members-modal" onClick={(e) => e.stopPropagation()}>
              <h3>
                {t('employees.organization.team')}:&nbsp;
                {selectedTeamDetails === 'Unassigned'
                  ? t('employees.organization.unassigned') ?? 'Unassigned'
                  : selectedTeamDetails}
              </h3>
              <div className="members-list">
                {items
                  .filter((i) => (i.teamId ?? 'Unassigned') === selectedTeamDetails)
                  .map((member) => (
                    <div key={member.id} className="member-item">
                      <span className="member-name">{member.fullName}</span>
                      <span className={`role-pill role-${member.role.replace('_', '-')}`}>{member.role}</span>
                    </div>
                  ))}
                {!items.some((i) => (i.teamId ?? 'Unassigned') === selectedTeamDetails) && (
                  <span className="member-name">{t('employees.noResult')}</span>
                )}
              </div>
              <button className="mini-btn" onClick={() => setSelectedTeamDetails(null)}>
                {t('common.close') ?? 'Close'}
              </button>
            </div>
          </div>
        )}

        {selectedEducation && (
          <div className="employee-modal-backdrop" onClick={() => setSelectedEducation(null)}>
            <div className="delete-confirm-modal members-modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('employees.education.detailTitle')}</h3>
              <div className="members-list">
                <div className="member-item">
                  <span className="member-name">{selectedEducation.fullName}</span>
                  <span className={`role-pill role-${selectedEducation.role.replace('_', '-')}`}>{selectedEducation.role}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">{t('employees.columns.email')}</span>
                  <span className="member-role">{selectedEducation.email ?? '-'}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">{t('employees.columns.department')}</span>
                  <span className="member-role">{selectedEducation.departmentId ?? '-'}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">{t('employees.columns.team')}</span>
                  <span className="member-role">{selectedEducation.teamId ?? '-'}</span>
                </div>
                <div className="member-item">
                  <span className="member-name">{t('employees.education.columns.degree')}</span>
                  <span className="member-role">{selectedEducation.degree || t('employees.education.noDegree')}</span>
                </div>
              </div>
              <button className="mini-btn" onClick={() => setSelectedEducation(null)}>
                {t('common.close') ?? 'Close'}
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
