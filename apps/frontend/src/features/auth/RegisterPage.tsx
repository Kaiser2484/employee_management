import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setActor } = useActor();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setToast(null);

    if (password !== confirmPassword) {
      showToast(t('auth.passwordNotMatch'), 'error');
      return;
    }

    if (!acceptedTerms) {
      showToast(t('auth.termsRequired'), 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register(fullName, email, password);
      setActor(result.user);
      navigate('/', { replace: true });
    } catch {
      showToast(t('auth.registerFailed'), 'error');
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
          <p>{t('auth.registerDescription')}</p>
          <div className="login-tag-row">
            <span>{t('auth.featureSecure')}</span>
            <span>{t('auth.featureRoleBased')}</span>
            <span>{t('auth.featureBilingual')}</span>
          </div>
        </div>

        <div className="login-form-pane">
          <h2>{t('auth.registerTitle')}</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="actor-select-wrap" htmlFor="fullName">
              <span>{t('auth.fullName')}</span>
              <input
                id="fullName"
                className="input-control"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

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

            <label className="actor-select-wrap" htmlFor="confirmPassword">
              <span>{t('auth.confirmPassword')}</span>
              <input
                id="confirmPassword"
                className="input-control"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>

            <label className="checkbox-row" htmlFor="terms">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
              />
              <span>{t('auth.acceptTerms')}</span>
            </label>
            <button className="auth-submit-btn" type="submit">
              {isSubmitting ? t('common.loading') : t('auth.registerButton')}
            </button>
          </form>

          <div className="auth-switch-row">
            <span>{t('auth.haveAccount')}</span>
            <Link to="/login" className="auth-switch-btn">
              {t('auth.loginButton')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
