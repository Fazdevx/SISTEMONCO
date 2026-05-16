import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => localStorage.getItem('theme-mode') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('theme-accent') || 'indigo');

  // Determinar si el modo oscuro está activo
  const isDark = mode === 'dark' || 
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Aplicar la clase 'dark' al <html> y persistir
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', mode);
  }, [mode, isDark]);

  // Persistir el color de acento
  useEffect(() => {
    localStorage.setItem('theme-accent', accent);
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  // Escuchar cambios en las preferencias del sistema
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.classList.toggle('dark', media.matches);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
