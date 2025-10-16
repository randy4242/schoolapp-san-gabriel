export const theme = {
  colors: {
    primary: '#003366', // Mapped from --main-blue
    secondary: '#6c757d', // Kept as neutral gray
    accent: '#FFC72C', // Mapped from --yellow
    header: '#003366', // Mapped from --main-blue
    
    background: '#f3f4f6', // Kept as light gray
    surface: '#ffffff', // Kept as white
    
    text: {
      primary: '#1f2937', // Kept as dark gray for text
      secondary: '#6b7280', // Kept
      tertiary: '#9ca3af', // Kept
      onPrimary: '#ffffff', // Correct for dark blue primary
      onAccent: '#003366', // Text on yellow is dark blue
    },

    border: '#d1d5db', // Kept
    borderDark: '#4b5563', // Kept

    danger: {
      DEFAULT: '#D61616', // Mapped from --logout-red
      light: '#fee2e2',
      text: '#991b1b',
    },
    success: { // Kept green theme for success
      DEFAULT: '#16a34a',
      light: '#dcfce7',
      text: '#14532d',
    },
    warning: { // Mapped to yellow
      DEFAULT: '#FFC72C',
      dark: '#f5b50b',
    },
    info: { // Mapped to light blue
      DEFAULT: '#0066CC',
      dark: '#004c99',
      light: '#e6f0ff',
      text: '#002a55',
    },
    
    sidebar: {
      background: '#003366', // Mapped from --main-blue
      text: '#e5e7eb', // Kept light gray for text
      textHover: '#FFC72C', // Use accent for hover
      border: '#002244', // Darker shade of main-blue
      bgHover: '#004488' // Lighter blue for hover
    },
    login: {
      inputBg: '#002244',
      inputBorder: '#004488'
    }
  },
};