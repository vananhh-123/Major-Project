import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import './app/app'; // Gọi đến src/app/app.ts

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// Debug helper: navigate to mode selection using cached quiz metadata
try {
  (window as any).__playAgainGlobal = () => {
    try {
      const id = sessionStorage.getItem('currentQuizId') || '';
      const title = sessionStorage.getItem('currentQuizTitle') || '';
      const desc = sessionStorage.getItem('currentQuizDescription') || '';
      const level = sessionStorage.getItem('currentQuizLevel') || '';
      const length = sessionStorage.getItem('currentQuizLength') || '';
      const params = new URLSearchParams({ id, title, desc, level, length });
      window.location.href = '/play/mode?' + params.toString();
    } catch (e) { console.error('playAgainGlobal error', e); }
  };
} catch (e) { /* noop */ }
