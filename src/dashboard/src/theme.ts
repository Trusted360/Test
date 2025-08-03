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
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', // Mobile-responsive scaling
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: 'clamp(1rem, 2vw, 1.25rem)',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: 'clamp(0.8125rem, 1.25vw, 0.875rem)',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', // Larger base font for mobile
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: 'clamp(0.8125rem, 1.25vw, 0.875rem)',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    button: {
      fontSize: 'clamp(0.875rem, 1.5vw, 1rem)', // Larger button text for readability
      fontWeight: 500,
      textTransform: 'none',
      lineHeight: 1.4,
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
          borderRadius: 12, // Larger border radius for mobile
          padding: '12px 20px', // Larger padding for touch targets
          minHeight: '44px', // iOS/Android recommended minimum touch target
          fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
          transition: 'all 0.2s ease-in-out',
        },
        sizeSmall: {
          padding: '8px 16px',
          minHeight: '36px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '16px 24px',
          minHeight: '48px',
          fontSize: 'clamp(1rem, 1.75vw, 1.125rem)',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0px)',
            boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.2)',
          },
        },
        outlined: {
          borderWidth: '2px', // Thicker borders for better visibility
          '&:hover': {
            borderWidth: '2px',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: '44px', // Minimum touch target
          minHeight: '44px',
          borderRadius: '12px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
        sizeSmall: {
          minWidth: '36px',
          minHeight: '36px',
        },
        sizeLarge: {
          minWidth: '48px',
          minHeight: '48px',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: '48px', // Larger touch targets for navigation
          paddingTop: '12px',
          paddingBottom: '12px',
          borderRadius: '8px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&:active': {
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: '44px', // Touch-friendly input fields
            borderRadius: '12px',
          },
          '& .MuiInputBase-input': {
            fontSize: 'clamp(1rem, 1.5vw, 1.125rem)', // Prevent zoom on iOS
            padding: '12px 16px',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: '12px', // Larger checkbox touch area
          '& .MuiSvgIcon-root': {
            fontSize: '1.5rem', // Larger checkbox icons
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '12px',
          '& .MuiSvgIcon-root': {
            fontSize: '1.5rem',
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
