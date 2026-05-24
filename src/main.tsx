import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

function init() {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0f172a');
    tg.setBackgroundColor('#0f172a');
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
  );
}

// انتظر تحميل telegram-web-app.js كامل
if ((window as any).Telegram?.WebApp) {
  init();
} else {
  window.addEventListener('load', init);
}
