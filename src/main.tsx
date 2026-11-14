import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './state';
import { AccountProvider } from './account';
import { App } from './App';
import './styles/global.css';
import './styles/vis.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AccountProvider>
  </StrictMode>,
);
