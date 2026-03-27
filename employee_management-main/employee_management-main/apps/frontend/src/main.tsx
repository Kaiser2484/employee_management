import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n from './i18n';
import { ActorProvider } from './app/actor-context';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ActorProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ActorProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
