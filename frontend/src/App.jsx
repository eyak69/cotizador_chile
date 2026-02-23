import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography, AppBar, Toolbar, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FileUpload from './components/FileUpload';
import QuoteList from './components/QuoteList';
import QuoteMasterDetail from './components/QuoteMasterDetail';
import CompanyManager from './components/CompanyManager';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import UserManager from './components/UserManager';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6', // Violet/purple typical for dark premium
    },
    secondary: {
      main: '#ec4899', // Pinkish
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Inter", "Outfit", "Roboto", sans-serif',
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.5px'
    }
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(circle at 15% 50%, rgba(139, 92, 246, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.15), transparent 25%), #0f172a',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          margin: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    }
  }
});

function AppContent() {
  const { user, loading } = useAuth();
  const [quoteData, setQuoteData] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleQuoteProcessed = (data) => {
    console.log("Datos recibidos:", data);
    setQuoteData(data);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <Typography color="text.secondary">Cargando...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>

      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - 240px)` },
          ml: { sm: `240px` },
          display: { sm: 'none' }, // Solo mostrar en móviles
          background: '#0f172a',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
          }}>
            COTIZADOR IA
          </Typography>
        </Toolbar>
      </AppBar>

      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          pt: { xs: 10, sm: 3 }, // Espacio superior para el AppBar en modo móvil
          width: { xs: '100%', sm: `calc(100% - 240px)` },
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 'bold',
            mb: { xs: 2, sm: 4 },
            width: '100%',
            textAlign: 'center',
            fontSize: { xs: '1.8rem', sm: '2.125rem' }
          }}
        >
          {currentTab === 0 && 'Panel de Cotización'}
          {currentTab === 1 && 'Gestión de Empresas'}
          {currentTab === 2 && 'Historial de Operaciones'}
          {currentTab === 3 && 'Configuración'}
          {currentTab === 4 && user?.role === 'admin' && 'Usuarios del Sistema'}
        </Typography>

        <Box sx={{
          width: '100%',
          maxWidth: '1000px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {currentTab === 0 && (
            <Box sx={{ width: '100%' }}>
              <FileUpload onQuoteProcessed={handleQuoteProcessed} />
              {quoteData && (
                <Box sx={{ mt: 4 }}>
                  <QuoteMasterDetail quotes={[quoteData]} />
                </Box>
              )}
            </Box>
          )}

          {currentTab === 1 && <CompanyManager />}
          {currentTab === 2 && <HistoryPanel />}
          {currentTab === 3 && <SettingsPanel />}
          {currentTab === 4 && user?.role === 'admin' && <UserManager />}
        </Box>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
