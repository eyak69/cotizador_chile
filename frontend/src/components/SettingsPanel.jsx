import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, MenuItem,
    FormControl, InputLabel, Select, Snackbar, Alert, Divider, Grid,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

const SettingsPanel = () => {
    // Configuración AI Específica
    const [config, setConfig] = useState({
        GEMINI_API_KEY: '',
        OPENAI_API_KEY: '',
        IA_CONFIG: null
    });

    // Gestión de Parámetros Generales (ABM)
    const [parameters, setParameters] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingParam, setEditingParam] = useState({ parametro: '', valor: '' });
    const [isNew, setIsNew] = useState(false);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    useEffect(() => {
        fetchConfig();
        fetchParameters(); // Obtener lista completa para ABM
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get('/api/config');
            const data = res.data;
            let iaConfig = null;
            if (data.IA_CONFIG) {
                try {
                    iaConfig = JSON.parse(data.IA_CONFIG);
                } catch (e) { console.error("Error parsing IA_CONFIG", e); }
            }
            setConfig({
                GEMINI_API_KEY: data.GEMINI_API_KEY || '',
                OPENAI_API_KEY: data.OPENAI_API_KEY || '',
                IA_CONFIG: iaConfig
            });
        } catch (error) {
            console.error("Error cargando config", error);
        }
    };

    const fetchParameters = async () => {
        try {
            // Asumimos que /api/parameters devuelve array [{parametro, valor}, ...]
            // Si no existe, usamos el mismo GET /api/config y lo transformamos
            const res = await axios.get('/api/config');
            // Transformar objeto { clave: valor } a array [{parametro, valor}]
            const paramsArray = Object.keys(res.data).map(key => ({
                parametro: key,
                valor: res.data[key]
            }));
            setParameters(paramsArray);
        } catch (error) {
            console.error("Error cargando parámetros", error);
        }
    };

    const handleSaveAI = async () => {
        setLoading(true);
        try {
            await axios.put('/api/config', config);
            setToast({ open: true, msg: 'Configuración AI guardada', severity: 'success' });
            fetchParameters(); // Refrescar tabla ABM
        } catch (error) {
            setToast({ open: true, msg: 'Error al guardar AI', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleModelChange = (modelId) => {
        setConfig(prev => ({
            ...prev,
            IA_CONFIG: {
                ...prev.IA_CONFIG,
                configuracion_ia: {
                    ...prev.IA_CONFIG.configuracion_ia,
                    modelo_por_defecto: modelId
                }
            }
        }));
        setToast({ open: true, msg: 'Modelo seleccionado. Guarda para aplicar.', severity: 'info' });
    };

    // --- LÓGICA ABM PARÁMETROS ---
    const handleOpenDialog = (param = null) => {
        if (param) {
            setEditingParam(param);
            setIsNew(false);
        } else {
            setEditingParam({ parametro: '', valor: '' });
            setIsNew(true);
        }
        setOpenDialog(true);
    };

    const handleSaveParam = async () => {
        try {
            // Usamos un endpoint genérico o el mismo PUT /api/config con lógica dinámica
            // Como server.js actual usa PUT /api/config con cuerpo específico, necesitamos actualizar server.js
            // para soportar un endpoint genérico de ABM.
            // Por ahora, asumiremos que implementaremos POST /api/parameters para crear/editar

            await axios.post('/api/parameters', editingParam);

            setToast({ open: true, msg: 'Parámetro guardado', severity: 'success' });
            setOpenDialog(false);
            fetchParameters();
            fetchConfig(); // Refrescar config AI también
        } catch (error) {
            setToast({ open: true, msg: 'Error guardando parámetro', severity: 'error' });
        }
    };

    const handleDeleteParam = async (key) => {
        if (!window.confirm(`¿Eliminar parámetro ${key}?`)) return;
        try {
            await axios.delete(`/api/parameters/${key}`);
            setToast({ open: true, msg: 'Parámetro eliminado', severity: 'success' });
            fetchParameters();
        } catch (error) {
            setToast({ open: true, msg: 'Error eliminando parámetro', severity: 'error' });
        }
    };

    // Aplanar modelos
    const flattenModels = () => {
        if (!config.IA_CONFIG?.configuracion_ia?.proveedores) return [];
        const flattened = [];
        const provs = config.IA_CONFIG.configuracion_ia.proveedores;
        Object.keys(provs).forEach(key => {
            const provider = provs[key];
            if (provider.modelos && Array.isArray(provider.modelos)) {
                provider.modelos.forEach(m => {
                    flattened.push({
                        value: m.modelo,
                        label: `${provider.nombre_comercial} - ${m.nombre} (${m.modelo})`,
                        providerKey: key
                    });
                });
            }
        });
        return flattened;
    };

    const modelOptions = flattenModels();
    const currentModel = config.IA_CONFIG?.configuracion_ia?.modelo_por_defecto || '';

    return (
        <Paper sx={{ p: 4, mt: 4, width: '100%', maxWidth: 1000, mx: 'auto', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Configuración del Sistema
            </Typography>

            {/* SECCIÓN PLANTILLA WORD */}
            <Paper elevation={3} sx={{ padding: 3, marginBottom: 4, border: '1px solid #ddd' }}>
                <Typography variant="h6" gutterBottom color="primary">Plantilla de Presupuesto (Word)</Typography>
                <Typography variant="body2" gutterBottom>
                    Sube aquí tu archivo .docx base. Variables: <code>+++cliente+++</code>, <code>+++vehiculo+++</code> y bucle <code>+++detalles+++</code>.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                    <input
                        accept=".docx"
                        style={{ display: 'none' }}
                        id="raised-button-file-template"
                        type="file"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const formData = new FormData();
                                formData.append('template', file);
                                axios.post('/api/config/template', formData)
                                    .then(() => alert("Plantilla actualizada con éxito!"))
                                    .catch(err => alert("Error al subir plantilla: " + err.message));
                            }
                        }}
                    />
                    <label htmlFor="raised-button-file-template">
                        <Button variant="outlined" component="span" startIcon={<SaveIcon />}>
                            Subir Plantilla .DOCX
                        </Button>
                    </label>

                    <Button
                        variant="text"
                        color="primary"
                        href="/api/config/template/sample"
                        download="Plantilla_Ejemplo_Cotizador.docx"
                        sx={{ ml: 2 }}
                    >
                        Descargar Plantilla Base (Ejemplo)
                    </Button>
                </Box>
            </Paper>

            {/* SECCIÓN AI */}
            <Box sx={{ mb: 6, p: 3, border: '1px solid #444', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">Control de Inteligencia Artificial</Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        {config.IA_CONFIG ? (
                            <FormControl fullWidth>
                                <InputLabel>Modelo Activo (Default)</InputLabel>
                                <Select
                                    value={currentModel}
                                    label="Modelo Activo (Default)"
                                    onChange={(e) => handleModelChange(e.target.value)}
                                >
                                    {modelOptions.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : (
                            <Alert severity="warning">Cargando configuración IA...</Alert>
                        )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Gemini API Key"
                            type="password"
                            value={config.GEMINI_API_KEY}
                            onChange={(e) => handleChange('GEMINI_API_KEY', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="OpenAI API Key"
                            type="password"
                            value={config.OPENAI_API_KEY}
                            onChange={(e) => handleChange('OPENAI_API_KEY', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveAI}
                            disabled={loading}
                        >
                            Guardar Config AI
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* SECCIÓN ABM PARÁMETROS */}
            <Typography variant="h6" gutterBottom color="secondary">
                Gestión Avanzada de Parámetros
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mb: 2 }}>
                Nuevo Parámetro
            </Button>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Clave (Parametro)</TableCell>
                            <TableCell>Valor</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {parameters.map((row) => (
                            <TableRow key={row.parametro} hover>
                                <TableCell sx={{ fontWeight: 'bold' }}>{row.parametro}</TableCell>
                                <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {row.valor && row.valor.length > 50 ? row.valor.substring(0, 50) + '...' : row.valor}
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

            {/* DIALOGO ABM */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{isNew ? 'Nuevo Parámetro' : 'Editar Parámetro'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Nombre del Parámetro (Clave)"
                            value={editingParam.parametro}
                            onChange={(e) => setEditingParam({ ...editingParam, parametro: e.target.value })}
                            disabled={!isNew} // Clave no editable si ya existe
                            sx={{ mb: 3 }}
                        />
                        <TextField
                            fullWidth
                            label="Valor"
                            value={editingParam.valor}
                            onChange={(e) => setEditingParam({ ...editingParam, valor: e.target.value })}
                            multiline
                            rows={4}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveParam} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity}>{toast.msg}</Alert>
            </Snackbar>
        </Paper>
    );
};

export default SettingsPanel;
