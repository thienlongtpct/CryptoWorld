import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './state';
import { AccountProvider } from './account';
import { App } from './App';
import { Signatures } from './components/Signatures';
import './styles/global.css';
import './styles/vis.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountProvider>
      <AppProvider>
        <App />
        <Signatures />
      </AppProvider>
    </AccountProvider>
  </StrictMode>,
);
