import React, { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography, Tabs, Tab } from '@mui/material';
import FileUpload from './components/FileUpload';
import QuoteList from './components/QuoteList';
import QuoteMasterDetail from './components/QuoteMasterDetail';
import CompanyManager from './components/CompanyManager';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';

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

function App() {
  const [quoteData, setQuoteData] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  const handleQuoteProcessed = (data) => {
    console.log("Datos recibidos:", data);
    setQuoteData(data);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Cotizador <Box component="span" sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Inteligente</Box> IA
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" paragraph>
              Gestión Inteligente de Seguros y Prompts
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={handleTabChange} centered textColor="secondary" indicatorColor="secondary">
              <Tab label="Cotizador" />
              <Tab label="Configuración / Empresas" />
              <Tab label="Historial" />
              <Tab label="Config. Global" />
            </Tabs>
          </Box>

          {currentTab === 0 && (
            <Box>
              <FileUpload onQuoteProcessed={handleQuoteProcessed} />
              {quoteData && <QuoteMasterDetail quotes={[quoteData]} />}
            </Box>
          )}

          {currentTab === 1 && (
            <CompanyManager />
          )}

          {currentTab === 2 && (
            <HistoryPanel />
          )}

          {currentTab === 3 && (
            <SettingsPanel />
          )}

        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
