import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import WebApp from '@twa-dev/sdk';

// Creating TanStack React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Initialize Telegram WebApp SDK completely
try {
  WebApp.ready();
  WebApp.expand();
  WebApp.setHeaderColor('#030712');
} catch (e) {
  console.log('Running outside Telegram WebApp wrapper context');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
