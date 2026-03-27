import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { login } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';

export function LoginPage() {
  const { t } = useTranslation();
  const { setActor } = useActor();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setToast(null);

    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      setActor(result.user);
      window.location.href = '/';
    } catch {
      showToast(t('auth.loginFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      {toast && (
        <NotificationToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <section className="login-card login-grid">
        <div className="login-brand-pane">
          <p className="badge">HR Portal</p>
          <h1>{t('app.title')}</h1>
          <p>{t('auth.loginDescription')}</p>
          <div className="login-tag-row">
            <span>{t('nav.employees')}</span>
            <span>{t('nav.leave')}</span>
            <span>{t('nav.recruitment')}</span>
          </div>
        </div>

        <div className="login-form-pane">
          <h2>{t('auth.loginTitle')}</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="actor-select-wrap" htmlFor="email">
              <span>{t('auth.email')}</span>
              <input
                id="email"
                className="input-control"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="actor-select-wrap" htmlFor="password">
              <span>{t('auth.password')}</span>
              <input
                id="password"
                className="input-control"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <button className="auth-submit-btn" type="submit">
              {isSubmitting ? t('common.loading') : t('auth.loginButton')}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
