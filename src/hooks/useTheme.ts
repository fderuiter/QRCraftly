import { useQRStore, useQRStoreSelector } from '@/context/QRContext';

export function useTheme() {
  const store = useQRStore();
  const isDarkMode = useQRStoreSelector(s => s.preferences.darkMode);
  
  const toggleDarkMode = () => store.updatePreferences({ darkMode: !isDarkMode });

  return { isDarkMode, toggleDarkMode };
}
