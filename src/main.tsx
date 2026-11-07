import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/index.css';
import App from './App';
import { ToastProvider } from './components/ui';
import { watchForAppUpdates } from './lib/appUpdate';
import { AuthProvider } from './lib/auth';

if ((navigator.hardwareConcurrency ?? 8) < 4) document.documentElement.classList.add('low-end');
document.body.classList.add('surface-obsidian');
watchForAppUpdates();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
