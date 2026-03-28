import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';
import { getProfileDetails, updatePassword, updateProfile, uploadAvatar } from '../../app/api';

interface ProfileFormState {
  fullName: string;
  email: string;
  degree: string;
  gender: string;
  dateOfBirth: string;
  startDate: string;
  nationalId: string;
  address: string;
  employeeStatus: string;
  jobCategory: string;
  jobTitle: string;
  departmentId: string;
  teamId: string;
}

interface EducationItem {
  id: string;
  level: string;
  school: string;
  major: string;
  fromYear: string;
  toYear: string;
}

interface EducationDraft {
  level: string;
  school: string;
  major: string;
  fromYear: string;
  toYear: string;
}

const EMPTY_FORM: ProfileFormState = {
  fullName: '',
  email: '',
  degree: '',
  gender: '',
  dateOfBirth: '',
  startDate: '',
  nationalId: '',
  address: '',
  employeeStatus: '',
  jobCategory: '',
  jobTitle: '',
  departmentId: '',
  teamId: '',
};

const EMPTY_EDUCATION_DRAFT: EducationDraft = {
  level: '',
  school: '',
  major: '',
  fromYear: '',
  toYear: '',
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  const dateOnly = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : '';
}

function toNullable(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function educationStorageKey(userId: string) {
  return `hrm_settings_education_${userId}`;
}

function loadEducationHistory(userId: string): EducationItem[] {
  try {
    const raw = localStorage.getItem(educationStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is EducationItem =>
        item &&
        typeof item.id === 'string' &&
        typeof item.level === 'string' &&
        typeof item.school === 'string' &&
        typeof item.major === 'string' &&
        typeof item.fromYear === 'string' &&
        typeof item.toYear === 'string',
    );
  } catch {
    return [];
  }
}

function saveEducationHistory(userId: string, items: EducationItem[]) {
  localStorage.setItem(educationStorageKey(userId), JSON.stringify(items));
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { actor, setActor } = useActor();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(actor?.avatarUrl);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [educationHistory, setEducationHistory] = useState<EducationItem[]>([]);
  const [educationDraft, setEducationDraft] = useState<EducationDraft>(EMPTY_EDUCATION_DRAFT);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!actor) {
      setForm(EMPTY_FORM);
      setEducationHistory([]);
      return;
    }
    const currentActor = actor;

    let isCancelled = false;

    async function loadProfile() {
      setIsLoadingProfile(true);
      try {
        const result = await getProfileDetails(currentActor);
        if (isCancelled) return;
        const details = result.data;
        setForm({
          fullName: details.fullName,
          email: details.email ?? '',
          degree: details.degree ?? '',
          gender: details.gender ?? '',
          dateOfBirth: toDateInput(details.dateOfBirth),
          startDate: toDateInput(details.startDate),
          nationalId: details.nationalId ?? '',
          address: details.address ?? '',
          employeeStatus: details.employeeStatus ?? '',
          jobCategory: details.jobCategory ?? '',
          jobTitle: details.jobTitle ?? '',
          departmentId: details.departmentId ?? '',
          teamId: details.teamId ?? '',
        });
        setAvatarUrl(details.avatarUrl ?? undefined);
      } catch {
        if (!isCancelled) {
          setForm({
            ...EMPTY_FORM,
            fullName: currentActor.fullName,
            email: currentActor.email ?? '',
          });
          setAvatarUrl(currentActor.avatarUrl);
          showToast(t('common.loadError'), 'error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();
  setEducationHistory(loadEducationHistory(currentActor.id));

    return () => {
      isCancelled = true;
    };
  }, [actor]);

  const avatarPreview = useMemo(() => {
    if (avatarUrl) return avatarUrl;
    const name = actor?.fullName ?? 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f3f4f6&color=ff7b25&rounded=true&size=256`;
  }, [actor?.fullName, avatarUrl]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!actor) return;

    try {
      setIsUploadingAvatar(true);
      const result = await uploadAvatar(actor, file);
      setAvatarUrl(result.url);
      setActor(result.user);
      showToast(t('settings.profileSaved'), 'success');
    } catch {
      showToast(t('common.loadError'), 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function setFormField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleEducationDraftChange<K extends keyof EducationDraft>(field: K, value: EducationDraft[K]) {
    setEducationDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddEducation(event: FormEvent) {
    event.preventDefault();
    if (!actor) return;

    const level = educationDraft.level.trim();
    const school = educationDraft.school.trim();
    const major = educationDraft.major.trim();
    if (!level || !school || !major) {
      showToast(t('settings.educationRequired'), 'error');
      return;
    }

    const nextItems: EducationItem[] = [
      ...educationHistory,
      {
        id: Math.random().toString(36).slice(2),
        level,
        school,
        major,
        fromYear: educationDraft.fromYear.trim(),
        toYear: educationDraft.toYear.trim(),
      },
    ];
    setEducationHistory(nextItems);
    saveEducationHistory(actor.id, nextItems);
    setEducationDraft(EMPTY_EDUCATION_DRAFT);
    showToast(t('settings.educationAdded'), 'success');
  }

  function handleRemoveEducation(itemId: string) {
    if (!actor) return;
    const nextItems = educationHistory.filter((item) => item.id !== itemId);
    setEducationHistory(nextItems);
    saveEducationHistory(actor.id, nextItems);
    showToast(t('settings.educationRemoved'), 'success');
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!actor) return;

    setIsSavingProfile(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: toNullable(form.email),
        avatarUrl: avatarUrl ?? null,
        degree: toNullable(form.degree),
        gender: toNullable(form.gender),
        dateOfBirth: toNullable(form.dateOfBirth),
        startDate: toNullable(form.startDate),
        nationalId: toNullable(form.nationalId),
        address: toNullable(form.address),
        employeeStatus: toNullable(form.employeeStatus),
        jobCategory: toNullable(form.jobCategory),
        jobTitle: toNullable(form.jobTitle),
        departmentId: toNullable(form.departmentId),
        teamId: toNullable(form.teamId),
      };
      const result = await updateProfile(actor, payload);
      setActor(result.user);
      showToast(result.message || t('settings.profileSaved'), 'success');
    } catch (error: any) {
      if (error?.status === 409) {
        showToast(t('settings.emailInUse'), 'error');
      } else {
        showToast(t('common.loadError'), 'error');
      }
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(t('settings.passwordMismatch'), 'error');
      return;
    }

    if (!actor) return;

    setIsSavingPassword(true);
    try {
      const result = await updatePassword(actor, {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(result.message || t('settings.passwordUpdated'), 'success');
    } catch (error: any) {
      if (error?.status === 400) {
        showToast(t('settings.passwordWrong'), 'error');
      } else if (error?.status === 401) {
        showToast(t('settings.passwordUnauthorized'), 'error');
      } else {
        showToast(t('common.loadError'), 'error');
      }
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (!actor) {
    return null;
  }

  return (
    <div className="main-card card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {isLoadingProfile && (
        <p className="actor-text" style={{ margin: 0 }}>
          {t('common.loading')}
        </p>
      )}

      <div className="settings-grid">
        <section className="card soft settings-card">
          <h3 style={{ marginTop: 0 }}>{t('settings.profileSection')}</h3>
          <p className="actor-text" style={{ margin: '0 0 1rem' }}>
            {t('settings.profileDescription')}
          </p>

          <div className="settings-avatar-block">
            <img src={avatarPreview} alt={t('settings.avatarLabel')} className="settings-avatar" />
            <div className="settings-avatar-actions">
              <label className="ghost-btn icon-btn" style={{ cursor: 'pointer', position: 'relative' }}>
                {isUploadingAvatar ? t('common.loading') : t('settings.changeAvatar')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  disabled={isUploadingAvatar}
                />
              </label>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setAvatarUrl(undefined)}
                disabled={isUploadingAvatar}
              >
                {t('settings.removeAvatar')}
              </button>
            </div>
            <p className="actor-text" style={{ margin: '0.25rem 0 0' }}>
              {t('settings.avatarHint')}
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="settings-form">
            <label className="actor-select-wrap" htmlFor="settings-fullname">
              <span>{t('settings.fullName')}</span>
              <input
                id="settings-fullname"
                className="input-control"
                type="text"
                value={form.fullName}
                onChange={(event) => setFormField('fullName', event.target.value)}
                required
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-email">
              <span>{t('settings.email')}</span>
              <input
                id="settings-email"
                className="input-control"
                type="email"
                value={form.email}
                onChange={(event) => setFormField('email', event.target.value)}
                placeholder="name@company.com"
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-gender">
              <span>{t('settings.gender')}</span>
              <input
                id="settings-gender"
                className="input-control"
                type="text"
                value={form.gender}
                onChange={(event) => setFormField('gender', event.target.value)}
                placeholder={t('settings.genderPlaceholder')}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-dob">
              <span>{t('settings.dateOfBirth')}</span>
              <input
                id="settings-dob"
                className="input-control"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setFormField('dateOfBirth', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-address">
              <span>{t('settings.address')}</span>
              <input
                id="settings-address"
                className="input-control"
                type="text"
                value={form.address}
                onChange={(event) => setFormField('address', event.target.value)}
                placeholder={t('settings.addressPlaceholder')}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-national-id">
              <span>{t('settings.nationalId')}</span>
              <input
                id="settings-national-id"
                className="input-control"
                type="text"
                value={form.nationalId}
                onChange={(event) => setFormField('nationalId', event.target.value)}
                placeholder={t('settings.nationalIdPlaceholder')}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-start-date">
              <span>{t('settings.startDate')}</span>
              <input
                id="settings-start-date"
                className="input-control"
                type="date"
                value={form.startDate}
                onChange={(event) => setFormField('startDate', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-job-title">
              <span>{t('settings.jobTitle')}</span>
              <input
                id="settings-job-title"
                className="input-control"
                type="text"
                value={form.jobTitle}
                onChange={(event) => setFormField('jobTitle', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-job-category">
              <span>{t('settings.jobCategory')}</span>
              <input
                id="settings-job-category"
                className="input-control"
                type="text"
                value={form.jobCategory}
                onChange={(event) => setFormField('jobCategory', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-status">
              <span>{t('settings.employeeStatus')}</span>
              <input
                id="settings-status"
                className="input-control"
                type="text"
                value={form.employeeStatus}
                onChange={(event) => setFormField('employeeStatus', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-degree">
              <span>{t('settings.degree')}</span>
              <input
                id="settings-degree"
                className="input-control"
                type="text"
                value={form.degree}
                onChange={(event) => setFormField('degree', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-department-id">
              <span>{t('settings.departmentId')}</span>
              <input
                id="settings-department-id"
                className="input-control"
                type="text"
                value={form.departmentId}
                onChange={(event) => setFormField('departmentId', event.target.value)}
                placeholder={t('settings.uuidPlaceholder')}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-team-id">
              <span>{t('settings.teamId')}</span>
              <input
                id="settings-team-id"
                className="input-control"
                type="text"
                value={form.teamId}
                onChange={(event) => setFormField('teamId', event.target.value)}
                placeholder={t('settings.uuidPlaceholder')}
              />
            </label>

            <div className="settings-actions">
              <button type="submit" className="action-btn" disabled={isSavingProfile}>
                {isSavingProfile ? t('common.loading') : t('settings.saveProfile')}
              </button>
            </div>
          </form>
        </section>

        <section className="card soft settings-card">
          <h3 style={{ marginTop: 0 }}>{t('settings.passwordSection')}</h3>
          <p className="actor-text" style={{ margin: '0 0 1rem' }}>
            {t('settings.passwordDescription')}
          </p>

          <form onSubmit={handlePasswordSubmit} className="settings-form">
            <label className="actor-select-wrap" htmlFor="settings-current-password">
              <span>{t('settings.currentPassword')}</span>
              <input
                id="settings-current-password"
                className="input-control"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-new-password">
              <span>{t('settings.newPassword')}</span>
              <input
                id="settings-new-password"
                className="input-control"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-confirm-password">
              <span>{t('settings.confirmPassword')}</span>
              <input
                id="settings-confirm-password"
                className="input-control"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </label>

            <div className="settings-actions">
              <button type="submit" className="action-btn" disabled={isSavingPassword}>
                {isSavingPassword ? t('common.loading') : t('settings.updatePassword')}
              </button>
            </div>
          </form>
        </section>

        <section className="card soft settings-card">
          <h3 style={{ marginTop: 0 }}>{t('settings.educationSection')}</h3>
          <p className="actor-text" style={{ margin: '0 0 1rem' }}>
            {t('settings.educationDescription')}
          </p>

          <form onSubmit={handleAddEducation} className="settings-form">
            <label className="actor-select-wrap" htmlFor="settings-edu-level">
              <span>{t('settings.educationLevel')}</span>
              <input
                id="settings-edu-level"
                className="input-control"
                type="text"
                value={educationDraft.level}
                onChange={(event) => handleEducationDraftChange('level', event.target.value)}
                placeholder={t('settings.educationLevelPlaceholder')}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-edu-school">
              <span>{t('settings.educationSchool')}</span>
              <input
                id="settings-edu-school"
                className="input-control"
                type="text"
                value={educationDraft.school}
                onChange={(event) => handleEducationDraftChange('school', event.target.value)}
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-edu-major">
              <span>{t('settings.educationMajor')}</span>
              <input
                id="settings-edu-major"
                className="input-control"
                type="text"
                value={educationDraft.major}
                onChange={(event) => handleEducationDraftChange('major', event.target.value)}
              />
            </label>

            <div className="settings-inline-grid">
              <label className="actor-select-wrap" htmlFor="settings-edu-from">
                <span>{t('settings.educationFromYear')}</span>
                <input
                  id="settings-edu-from"
                  className="input-control"
                  type="number"
                  min={1900}
                  max={2100}
                  value={educationDraft.fromYear}
                  onChange={(event) => handleEducationDraftChange('fromYear', event.target.value)}
                />
              </label>

              <label className="actor-select-wrap" htmlFor="settings-edu-to">
                <span>{t('settings.educationToYear')}</span>
                <input
                  id="settings-edu-to"
                  className="input-control"
                  type="number"
                  min={1900}
                  max={2100}
                  value={educationDraft.toYear}
                  onChange={(event) => handleEducationDraftChange('toYear', event.target.value)}
                />
              </label>
            </div>

            <div className="settings-actions">
              <button type="submit" className="ghost-btn">
                {t('settings.addEducation')}
              </button>
            </div>
          </form>

          <div className="settings-education-list">
            {educationHistory.length === 0 ? (
              <p className="actor-text" style={{ margin: 0 }}>
                {t('settings.educationEmpty')}
              </p>
            ) : (
              educationHistory.map((item) => (
                <article key={item.id} className="settings-education-item">
                  <div>
                    <strong>{item.level}</strong>
                    <p className="actor-text" style={{ margin: '0.2rem 0 0' }}>
                      {item.school} - {item.major}
                    </p>
                    {(item.fromYear || item.toYear) && (
                      <p className="actor-text" style={{ margin: '0.2rem 0 0' }}>
                        {item.fromYear || '...'} - {item.toYear || '...'}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-delete-btn"
                    onClick={() => handleRemoveEducation(item.id)}
                  >
                    {t('common.delete')}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
