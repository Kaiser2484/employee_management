import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface AccessDeniedPageProps {
  fallbackPath: string;
}

export function AccessDeniedPage({ fallbackPath }: AccessDeniedPageProps) {
  const { t } = useTranslation();

  return (
    <section className="card denied-card">
      <h2>{t('auth.noAccessTitle')}</h2>
      <p>{t('auth.noAccessDescription')}</p>
      <Link className="ghost-btn denied-link" to={fallbackPath}>
        {t('auth.goBackAllowed')}
      </Link>
    </section>
  );
}
