import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Snackbar, Alert, Divider,
    Grid, CircularProgress, Chip, InputAdornment, IconButton, Accordion,
    AccordionSummary, AccordionDetails, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
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
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paramToDelete, setParamToDelete] = useState(null);

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

    const handleDeleteClick = (key) => {
        setParamToDelete(key);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteParam = async () => {
        if (!paramToDelete) return;
        try {
            await api.delete(`/config/parameters/${paramToDelete}`);
            showToast('Parámetro eliminado');
            fetchConfig();
        } catch (error) {
            showToast('Error eliminando parámetro', 'error');
        } finally {
            setDeleteDialogOpen(false);
            setParamToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setParamToDelete(null);
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
        <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', p: { xs: 2, sm: 3 }, pb: { xs: 10, sm: 3 } }}>

            {/* Título de la sección (Tuerca) */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                <SettingsIcon sx={{ color: '#a855f7', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={800} sx={{ color: '#fff' }}>
                    Configuración General
                </Typography>
            </Box>

            {/* TARJETA 1: Configuración de IA */}
            <Box sx={{
                mb: 3, p: 3, borderRadius: 3,
                background: 'rgba(20, 20, 30, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff' }}>Configuración de IA</Typography>
                    <Chip
                        label={geminiSaved ? "CONFIGURADA" : "PENDIENTE"}
                        size="small"
                        sx={{
                            background: geminiSaved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: geminiSaved ? '#10b981' : '#ef4444',
                            fontWeight: 800, fontSize: '0.65rem', borderRadius: 1
                        }}
                    />
                </Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Gestiona tus credenciales de modelos
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600 }}>Gemini API Key</Typography>
                    <Typography
                        variant="caption"
                        component="a"
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        sx={{ color: '#a855f7', textDecoration: 'none', cursor: 'pointer' }}
                    >
                        Obtén tu clave aquí
                    </Typography>
                </Box>
                <TextField
                    type={showGemini ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    fullWidth size="small"
                    placeholder="********************"
                    sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2, background: 'rgba(0,0,0,0.3)', color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&.Mui-focused fieldset': { borderColor: '#a855f7' }
                        }
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowGemini(!showGemini)} size="small" sx={{ color: '#64748b' }}>
                                    {showGemini ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 600, mb: 1, display: 'block' }}>Modelo IA</Typography>
                <TextField
                    select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    fullWidth size="small"
                    SelectProps={{ native: true }}
                    sx={{
                        mb: 4,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2, background: 'rgba(0,0,0,0.3)', color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&.Mui-focused fieldset': { borderColor: '#a855f7' }
                        },
                        '& select': { paddingRight: '32px' },
                        '& .MuiNativeSelect-icon': { color: '#94a3b8' }
                    }}
                >
                    <option style={{ background: '#1e293b' }} value="gemini-2.0-flash">Gemini 2.0 Flash (Recomendado)</option>
                    <option style={{ background: '#1e293b' }} value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option style={{ background: '#1e293b' }} value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </TextField>

                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSaveConfig}
                    disabled={saving}
                    sx={{
                        py: 1.5, borderRadius: 2,
                        background: '#a855f7',
                        color: '#fff', fontWeight: 800,
                        '&:hover': { background: '#9333ea' },
                        '&.Mui-disabled': { background: 'rgba(168,85,247,0.5)', color: 'rgba(255,255,255,0.5)' }
                    }}
                >
                    {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </Button>
            </Box>

            {/* TARJETA 2: Plantilla de Presupuesto */}
            <Box sx={{
                mb: 3, p: 3, borderRadius: 3,
                background: 'rgba(20, 20, 30, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff', mb: 0.5 }}>Plantilla de Presupuesto</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Personaliza el formato de salida .docx
                </Typography>

                <Box sx={{
                    border: '2px dashed rgba(168,85,247,0.4)',
                    borderRadius: 3, p: 3,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(168,85,247,0.02)', cursor: 'pointer', mb: 2,
                    '&:hover': { background: 'rgba(168,85,247,0.05)', borderColor: '#a855f7' }
                }}>
                    <input
                        accept=".docx"
                        style={{ display: 'none' }}
                        id="template-upload-input"
                        type="file"
                        onChange={handleUploadTemplate}
                    />
                    <label htmlFor="template-upload-input" style={{ width: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <DescriptionIcon sx={{ color: '#a855f7', mb: 1 }} />
                        <Typography variant="button" sx={{ color: '#fff', fontWeight: 700 }}>
                            SUBIR PLANTILLA .DOCX
                        </Typography>
                    </label>
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                    <Button
                        variant="text"
                        startIcon={<FileDownloadIcon sx={{ fontSize: '1rem' }} />}
                        onClick={async () => {
                            try {
                                const response = await api.get('/config/template/sample', { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', 'Plantilla_Ejemplo.docx');
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode.removeChild(link);
                                showToast('Descarga iniciada');
                            } catch (error) {
                                showToast('Error al descargar plantilla', 'error');
                            }
                        }}
                        sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, '&:hover': { color: '#e2e8f0' } }}
                    >
                        DESCARGAR EJEMPLO DE ESTRUCTURA
                    </Button>
                </Box>
            </Box>

            {/* TARJETA 3: Parámetros Avanzados */}
            {user?.role === 'admin' && (
                <Accordion
                    defaultExpanded={false}
                    sx={{
                        mb: 3, p: 1, borderRadius: '12px !important',
                        background: 'rgba(20, 20, 30, 0.6)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        '&:before': { display: 'none' },
                        color: '#fff'
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#94a3b8' }} />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                                <TuneIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff' }}>Parámetros Avanzados</Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                    {parameters.length} PARÁMETRO{parameters.length !== 1 ? 'S' : ''} CONFIGURADO{parameters.length !== 1 ? 'S' : ''}
                                </Typography>
                            </Box>
                        </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ pt: 0 }}>
                        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Button
                            id="new-param-btn"
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            sx={{ mb: 2, borderRadius: 2, color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.2)' }}
                        >
                            Nuevo Parámetro
                        </Button>

                        {parameters.length === 0 ? (
                            <Typography variant="body2" sx={{ color: '#94a3b8', py: 2, textAlign: 'center' }}>
                                No tienes parámetros adicionales configurados.
                            </Typography>
                        ) : (
                            <TableContainer sx={{ background: 'transparent' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' } }}>
                                            <TableCell>Clave</TableCell>
                                            <TableCell>Valor</TableCell>
                                            <TableCell align="right">Acciones</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {parameters.map((row) => (
                                            <TableRow key={row.parametro} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' } }}>
                                                <TableCell sx={{ fontWeight: 600, color: '#a855f7' }}>
                                                    {row.parametro}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.valor}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" onClick={() => handleOpenDialog(row)} sx={{ color: '#94a3b8' }}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleDeleteClick(row.parametro)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
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
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm" fullWidth
                PaperProps={{
                    sx: {
                        background: '#1e293b', color: '#fff', borderRadius: 3,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {isNew ? 'Nuevo Parámetro' : 'Editar Parámetro'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth label="Clave del Parámetro"
                        value={editingParam.parametro}
                        onChange={e => setEditingParam({ ...editingParam, parametro: e.target.value })}
                        disabled={!isNew}
                        sx={{
                            mb: 2, mt: 1,
                            '& .MuiInputLabel-root': { color: '#94a3b8' },
                            '& .MuiOutlinedInput-root': {
                                color: '#fff', borderRadius: 2, background: 'rgba(0,0,0,0.2)',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                            }
                        }}
                    />
                    <TextField
                        fullWidth label="Valor"
                        value={editingParam.valor}
                        onChange={e => setEditingParam({ ...editingParam, valor: e.target.value })}
                        multiline rows={4}
                        sx={{
                            '& .MuiInputLabel-root': { color: '#94a3b8' },
                            '& .MuiOutlinedInput-root': {
                                color: '#fff', borderRadius: 2, background: 'rgba(0,0,0,0.2)',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenDialog(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
                    <Button onClick={handleSaveParam} variant="contained" sx={{ background: '#a855f7', color: '#fff', borderRadius: 2 }}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialogo Confirmación Borrado Parámetro */}
            <Dialog
                open={deleteDialogOpen}
                onClose={cancelDelete}
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(135deg, #1e1e2f 0%, #151520 100%)',
                        border: '1px solid rgba(244,63,94,0.3)',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#fff', fontWeight: 800 }}>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: '#cbd5e1' }}>
                        ¿Estás seguro de que deseas eliminar permanentemente el parámetro avanzado <b>{paramToDelete}</b>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={cancelDelete} sx={{ color: '#94a3b8' }}>Cancelar</Button>
                    <Button onClick={confirmDeleteParam} variant="contained" color="error" sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Sí, Eliminar
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
                <Alert severity={toast.severity} sx={{ borderRadius: 2, background: '#1e293b', color: '#fff' }}>{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
};

export default SettingsPanel;
