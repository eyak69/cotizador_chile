import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography } from '@mui/material';
import FileUpload from './components/FileUpload';
import QuoteList from './components/QuoteList';
import QuoteMasterDetail from './components/QuoteMasterDetail';
import CompanyManager from './components/CompanyManager';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#ec4899',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
  },
});

function AppContent() {
  const { user, loading } = useAuth();
  const [quoteData, setQuoteData] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 2,
          width: { sm: `calc(100% - 240px)` },
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
            mb: 4,
            width: '100%',
            textAlign: 'center'
          }}
        >
          {currentTab === 0 && 'Panel de Cotización'}
          {currentTab === 1 && 'Gestión de Empresas'}
          {currentTab === 2 && 'Historial de Operaciones'}
          {currentTab === 3 && 'Configuración Global'}
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
        </Box>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
