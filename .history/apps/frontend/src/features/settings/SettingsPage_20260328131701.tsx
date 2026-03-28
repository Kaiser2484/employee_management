import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';

export function SettingsPage() {
  const { t } = useTranslation();
  const { actor, setActor } = useActor();
  const [fullName, setFullName] = useState(actor?.fullName ?? '');
  const [email, setEmail] = useState(actor?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(actor?.avatarUrl);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!actor) return;
    setFullName(actor.fullName);
    setEmail(actor.email ?? '');
    setAvatarUrl(actor.avatarUrl);
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

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!actor) return;

    setIsSavingProfile(true);
    const nextActor = {
      ...actor,
      fullName: fullName.trim() || actor.fullName,
      email: email.trim() || null,
      avatarUrl,
    };
    setActor(nextActor);
    showToast(t('settings.profileSaved'), 'success');
    setIsSavingProfile(false);
  }

  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(t('settings.passwordMismatch'), 'error');
      return;
    }

    setIsSavingPassword(true);
    setTimeout(() => {
      setIsSavingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('settings.passwordUpdated'), 'success');
    }, 400);
  }

  if (!actor) {
    return null;
  }

  return (
    <div className="main-card card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 style={{ margin: '0 0 0.35rem' }}>{t('settings.title')}</h1>
        <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{t('settings.subtitle')}</p>
      </div>

      <div className="settings-grid">
        <section className="card soft settings-card">
          <h3 style={{ marginTop: 0 }}>{t('settings.profileSection')}</h3>
          <p className="actor-text" style={{ margin: '0 0 1rem' }}>
            {t('settings.profileDescription')}
          </p>

          <div className="settings-avatar-block">
            <img src={avatarPreview} alt="avatar" className="settings-avatar" />
            <div className="settings-avatar-actions">
              <label className="ghost-btn icon-btn" style={{ cursor: 'pointer', position: 'relative' }}>
                {t('settings.changeAvatar')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
              </label>
              <button type="button" className="ghost-btn" onClick={() => setAvatarUrl(undefined)}>
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
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

            <label className="actor-select-wrap" htmlFor="settings-email">
              <span>{t('settings.email')}</span>
              <input
                id="settings-email"
                className="input-control"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
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
      </div>
    </div>
  );
}
