import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge all legacy localStorage and sessionStorage data completely
if (typeof window !== 'undefined') {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn('Storage clear notice:', e);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
