import { useQRContext } from '@/context/QRContext';

export function useTheme() {
  const { preferences, updatePreferences } = useQRContext();
  const isDarkMode = preferences.darkMode;
  
  const toggleDarkMode = () => updatePreferences({ darkMode: !isDarkMode });

  return { isDarkMode, toggleDarkMode };
}
