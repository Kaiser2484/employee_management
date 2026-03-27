import { useTranslation } from 'react-i18next';

export function RecruitmentPage() {
  const { t } = useTranslation();

  return (
    <section className="module-grid">
      <article className="card main-card">
        <h2>{t('recruitment.title')}</h2>
        <p>{t('recruitment.description')}</p>
      </article>
    </section>
  );
}
