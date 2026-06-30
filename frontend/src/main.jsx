import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);