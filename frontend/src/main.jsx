import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const theme = createTheme({
  palette: {
    primary: {
      light: '#818cf8',
      main: '#4f46e5',
      dark: '#3730a3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5cf6',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#d1fae5',
      dark: '#065f46',
    },
    warning: {
      main: '#f59e0b',
      light: '#fef3c7',
      dark: '#92400e',
    },
    error: {
      main: '#ef4444',
      light: '#fee2e2',
    },
    info: {
      main: '#6366f1',
      light: '#e0e7ff',
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.005em' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' },
    caption: { letterSpacing: '0.01em' },
    overline: { fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.7rem' },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
    '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
    '0 4px 10px -2px rgb(0 0 0 / 0.10)',
    '0 8px 16px -4px rgb(0 0 0 / 0.10)',
    '0 10px 20px -4px rgb(0 0 0 / 0.10)',
    '0 12px 24px -6px rgb(0 0 0 / 0.12)',
    '0 16px 32px -8px rgb(0 0 0 / 0.12)',
    '0 20px 40px -10px rgb(0 0 0 / 0.14)',
    '0 24px 48px -12px rgb(0 0 0 / 0.16)',
    '0 28px 56px -14px rgb(0 0 0 / 0.16)',
    '0 32px 60px -16px rgb(0 0 0 / 0.18)',
    '0 36px 64px -18px rgb(0 0 0 / 0.18)',
    '0 40px 68px -20px rgb(0 0 0 / 0.20)',
    '0 44px 72px -22px rgb(0 0 0 / 0.20)',
    '0 48px 76px -24px rgb(0 0 0 / 0.22)',
    '0 52px 80px -26px rgb(0 0 0 / 0.22)',
    '0 24px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.28)',
    '0 25px 50px -12px rgb(0 0 0 / 0.30)',
    '0 25px 50px -12px rgb(0 0 0 / 0.32)',
    '0 25px 50px -12px rgb(0 0 0 / 0.35)',
    '0 25px 50px -12px rgb(0 0 0 / 0.38)',
    '0 25px 60px -15px rgb(0 0 0 / 0.42)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '0.01em',
          transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
          },
        },
        sizeLarge: {
          padding: '11px 24px',
          fontSize: '0.9375rem',
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          transition: 'box-shadow 150ms ease',
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.18)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4f46e5',
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: 6,
          letterSpacing: '0.01em',
        },
        colorSuccess: {
          backgroundColor: '#d1fae5',
          color: '#065f46',
        },
        colorError: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
        },
        colorWarning: {
          backgroundColor: '#fef3c7',
          color: '#92400e',
        },
        colorInfo: {
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'background 150ms ease',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        standardSuccess: {
          backgroundColor: '#d1fae5',
          color: '#065f46',
        },
        standardError: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
        },
        standardWarning: {
          backgroundColor: '#fef3c7',
          color: '#92400e',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.875rem',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiSnackbarContent-root': {
            borderRadius: 10,
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
            fontWeight: 500,
            backgroundColor: '#1e293b',
          },
        },
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
