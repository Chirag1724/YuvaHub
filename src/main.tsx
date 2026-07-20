import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import CustomCursor from './components/CustomCursor.tsx';
import { AppProvider } from './context/AppContext.tsx';
import { SocketProvider } from './context/SocketContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <SocketProvider>
        <CustomCursor />
        <App />
      </SocketProvider>
    </AppProvider>
  </StrictMode>,
);
