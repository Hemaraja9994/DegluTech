import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './referenceTheme.css';
import './clinicalUi.css';
import { App } from './App';
import { initInstall } from './install';

initInstall();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
