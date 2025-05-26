import { createTheme } from '@mui/material/styles';

// Define color palette
const colors = {
  primary: {
    main: '#FF6B35', // Orange
    light: '#FF8C5F',
    dark: '#E54E00',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#2EC4B6', // Teal
    light: '#43E8D8',
    dark: '#1A9E92',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#E63946',
    light: '#FF6B76',
    dark: '#C62E3A',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#FFBF69',
    light: '#FFD699',
    dark: '#FFA53B',
    contrastText: '#000000',
  },
  info: {
    main: '#457B9D',
    light: '#6A9FBF',
    dark: '#2A5A7C',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#4CAF50',
    light: '#80E27E',
    dark: '#087F23',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F8F9FA',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1D3557',
    secondary: '#457B9D',
    disabled: '#A8DADC',
  },
};

// Create theme
export const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    success: colors.success,
    background: colors.background,
    text: colors.text,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});
