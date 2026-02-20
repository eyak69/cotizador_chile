import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Snackbar, Alert, Divider,
    Grid, CircularProgress, Chip, InputAdornment, IconButton, Accordion,
    AccordionSummary, AccordionDetails, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import KeyIcon from '@mui/icons-material/Key';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SettingsPanel = () => {
    const { user } = useAuth();

    // API Keys del usuario
    const [geminiKey, setGeminiKey] = useState('');
    const [showGemini, setShowGemini] = useState(false);
    const [geminiSaved, setGeminiSaved] = useState(false);

    // IA Configuration State
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [iaConfig, setIaConfig] = useState({});

    // Gestión de parámetros avanzados (ABM)
    const [parameters, setParameters] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingParam, setEditingParam] = useState({ parametro: '', valor: '' });
    const [isNew, setIsNew] = useState(false);

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config');
            const data = res.data;
            setGeminiKey(data.GEMINI_API_KEY || '');
            setGeminiSaved(!!data.GEMINI_API_KEY);

            // Parse and set IA Config
            if (data.IA_CONFIG) {
                try {
                    const parsedConfig = typeof data.IA_CONFIG === 'string' ? JSON.parse(data.IA_CONFIG) : data.IA_CONFIG;
                    setIaConfig(parsedConfig);
                    // Extract existing model if available
                    if (parsedConfig?.configuracion_ia?.modelo_por_defecto) {
                        setSelectedModel(parsedConfig.configuracion_ia.modelo_por_defecto);
                    }
                } catch (e) {
                    console.error("Error parsing IA_CONFIG", e);
                }
            }

            // Construir array de parámetros para la tabla ABM
            // Excluimos los que ya tienen sección propia
            const excludedKeys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'system_version'];
            const paramsArray = Object.entries(data)
                .filter(([key]) => !excludedKeys.includes(key))
                .map(([parametro, valor]) => ({ parametro, valor }));
            setParameters(paramsArray);
        } catch (error) {
            console.error("Error cargando config", error);
            showToast('Error al cargar configuración', 'error');
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            // Update IA Config object with new model
            const updatedIaConfig = {
                ...iaConfig,
                configuracion_ia: {
                    ...(iaConfig.configuracion_ia || {}),
                    modelo_por_defecto: selectedModel
                }
            };

            await api.put('/config', {
                GEMINI_API_KEY: geminiKey,
                IA_CONFIG: updatedIaConfig
            });

            setGeminiSaved(true);
            setIaConfig(updatedIaConfig);
            showToast('✅ Configuración de IA guardada correctamente');
            fetchConfig(); // Refresh parameters list if needed
        } catch (error) {
            showToast('Error al guardar configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    // --- ABM Parámetros ---
    const handleOpenDialog = (param = null) => {
        if (param) {
            setEditingParam({ parametro: param.parametro, valor: param.valor || '' });
            setIsNew(false);
        } else {
            setEditingParam({ parametro: '', valor: '' });
            setIsNew(true);
        }
        setOpenDialog(true);
    };

    const handleSaveParam = async () => {
        try {
            await api.post('/config/parameters', editingParam);
            showToast('Parámetro guardado');
            setOpenDialog(false);
            fetchConfig();
        } catch (error) {
            showToast('Error guardando parámetro', 'error');
        }
    };

    const handleDeleteParam = async (key) => {
        if (!window.confirm(`¿Eliminar parámetro "${key}"?`)) return;
        try {
            await api.delete(`/config/parameters/${key}`);
            showToast('Parámetro eliminado');
            fetchConfig();
        } catch (error) {
            showToast('Error eliminando parámetro', 'error');
        }
    };

    const handleUploadTemplate = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('template', file);
        try {
            await api.post('/config/template', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('✅ Plantilla actualizada con éxito');
        } catch (err) {
            showToast('Error al subir plantilla', 'error');
        }
    };

    const showToast = (msg, severity = 'success') => {
        setToast({ open: true, msg, severity });
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>

            {/* ── SECCIÓN: CONFIGURACIÓN IA (API KEY + MODELO) ───────────────────────── */}
            <Paper sx={{
                p: 3, mb: 3, borderRadius: 3,
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(30,41,59,0.95) 100%)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{
                        p: 1, borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center'
                    }}>
                        <KeyIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Configuración de IA</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Define tu API Key y el modelo de inteligencia artificial a utilizar
                        </Typography>
                    </Box>
                    {geminiSaved && (
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="Configurada"
                            size="small"
                            color="success"
                            sx={{ ml: 'auto' }}
                        />
                    )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Obtén tu clave gratuita en{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                        style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                        Google AI Studio →
                    </a>
                </Typography>

                <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} md={7}>
                        <TextField
                            id="gemini-api-key"
                            label="Gemini API Key"
                            type={showGemini ? 'text' : 'password'}
                            value={geminiKey}
                            onChange={e => setGeminiKey(e.target.value)}
                            fullWidth
                            placeholder="AIza..."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <KeyIcon sx={{ color: '#6366f1', fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowGemini(!showGemini)} size="small">
                                            {showGemini ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            label="Modelo IA"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            fullWidth
                            SelectProps={{ native: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recomendado)</option>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            id="save-gemini-key-btn"
                            variant="contained"
                            fullWidth
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            onClick={handleSaveConfig}
                            disabled={saving} // Permitir guardar aunque no haya key si solo cambia modelo
                            sx={{
                                py: 1.7, borderRadius: 2,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                fontWeight: 700, whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                                '&:hover': { boxShadow: '0 6px 16px rgba(99,102,241,0.55)' },
                                height: '56px' // Match textfield height
                            }}
                        >
                            {saving ? '...' : 'Guardar'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* ── SECCIÓN: PLANTILLA WORD ─────────────────────────────── */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{
                        p: 1, borderRadius: 1.5,
                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                        display: 'flex', alignItems: 'center'
                    }}>
                        <DescriptionIcon sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Plantilla de Presupuesto</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Archivo .docx base para generar cotizaciones
                        </Typography>
                    </Box>
                </Box>



                <Box sx={{ display: 'flex', gap: 2 }}>
                    <input
                        accept=".docx"
                        style={{ display: 'none' }}
                        id="template-upload-input"
                        type="file"
                        onChange={handleUploadTemplate}
                    />
                    <label htmlFor="template-upload-input">
                        <Button
                            variant="outlined"
                            component="span"
                            startIcon={<DescriptionIcon />}
                            sx={{
                                borderRadius: 2, borderColor: 'rgba(14,165,233,0.5)', color: '#0ea5e9',
                                '&:hover': { borderColor: '#0ea5e9', background: 'rgba(14,165,233,0.08)' }
                            }}
                        >
                            Subir Plantilla .DOCX
                        </Button>
                    </label>
                    <Button
                        variant="text"
                        onClick={async () => {
                            try {
                                const response = await api.get('/config/template/sample', {
                                    responseType: 'blob'
                                });
                                // Crear url del blob y forzar descarga
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', 'Plantilla_Ejemplo_Cotizador.docx');
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode.removeChild(link);
                                showToast('Descarga iniciada');
                            } catch (error) {
                                console.error("Error descarga plantilla:", error);
                                showToast('Error al descargar plantilla', 'error');
                            }
                        }}
                        sx={{ color: 'text.secondary', borderRadius: 2 }}
                    >
                        Descargar Ejemplo
                    </Button>
                </Box>
            </Paper>

            {/* ── SECCIÓN: PARÁMETROS AVANZADOS ───────────────────────── */}
            {user?.role === 'admin' && (
                <Accordion
                    defaultExpanded={false}
                    sx={{
                        borderRadius: '12px !important', border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(30,41,59,0.7)', '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <TuneIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700}>Parámetros Avanzados</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {parameters.length} parámetro{parameters.length !== 1 ? 's' : ''} configurado{parameters.length !== 1 ? 's' : ''}
                                </Typography>
                            </Box>
                        </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ pt: 0 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Button
                            id="new-param-btn"
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ mb: 2, borderRadius: 2 }}
                        >
                            Nuevo Parámetro
                        </Button>

                        {parameters.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                No tienes parámetros adicionales configurados.
                            </Typography>
                        ) : (
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Clave</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Valor</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Acciones</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {parameters.map((row) => (
                                            <TableRow key={row.parametro} hover>
                                                <TableCell sx={{ fontWeight: 600, color: '#6366f1', fontFamily: 'monospace' }}>
                                                    {row.parametro}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {row.valor && row.valor.length > 60 ? row.valor.substring(0, 60) + '…' : row.valor}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" onClick={() => handleOpenDialog(row)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteParam(row.parametro)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </AccordionDetails>
                </Accordion>
            )}

            {/* ── DIALOG ABM ──────────────────────────────────────────── */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {isNew ? 'Nuevo Parámetro' : 'Editar Parámetro'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth label="Clave del Parámetro"
                        value={editingParam.parametro}
                        onChange={e => setEditingParam({ ...editingParam, parametro: e.target.value })}
                        disabled={!isNew}
                        sx={{ mb: 2, mt: 1 }}
                        InputProps={{ style: { fontFamily: 'monospace' } }}
                    />
                    <TextField
                        fullWidth label="Valor"
                        value={editingParam.valor}
                        onChange={e => setEditingParam({ ...editingParam, valor: e.target.value })}
                        multiline rows={4}
                        InputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveParam} variant="contained" sx={{ borderRadius: 2 }}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── SNACKBAR ────────────────────────────────────────────── */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity} sx={{ borderRadius: 2 }}>{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
};

export default SettingsPanel;
