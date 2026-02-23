import React, { useState, useEffect } from 'react';
import {
    Box, Button, IconButton, Typography, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Snackbar, Alert, Tooltip, InputAdornment, Chip, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import api from '../services/api';

const CompanyManager = () => {
    const [empresas, setEmpresas] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [currentEmpresa, setCurrentEmpresa] = useState({ nombre: '', prompt_reglas: '', paginas_procesamiento: "2" });
    const [isEditing, setIsEditing] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        try {
            const res = await api.get('/empresas');
            setEmpresas(res.data);
        } catch (error) {
            showToast('Error al cargar empresas', 'error');
        }
    };

    const handleSave = async () => {
        try {
            if (isEditing) {
                await api.put(`/empresas/${currentEmpresa.id}`, currentEmpresa);
                showToast('Empresa actualizada correctamente');
            } else {
                await api.post('/empresas', currentEmpresa);
                showToast('Empresa creada correctamente');
            }
            setOpenDialog(false);
            fetchEmpresas();
        } catch (error) {
            console.error("Error saving company:", error);
            const userMsg = error.response?.data?.error || 'Error al guardar empresa';
            showToast(userMsg, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta empresa?')) return;
        try {
            await api.delete(`/empresas/${id}`);
            showToast('Empresa eliminada correctamente');
            fetchEmpresas();
        } catch (error) {
            showToast('Error al eliminar empresa', 'error');
        }
    };

    const openEdit = (empresa) => {
        setCurrentEmpresa(empresa);
        setIsEditing(true);
        setOpenDialog(true);
    };

    const openNew = () => {
        setCurrentEmpresa({ nombre: '', prompt_reglas: '', paginas_procesamiento: "2" });
        setIsEditing(false);
        setOpenDialog(true);
    };

    const showToast = (msg, severity = 'success') => {
        setToast({ open: true, msg, severity });
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', p: { xs: 2, sm: 3 }, pb: { xs: 10, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', mb: 0.5 }}>Gestión de Empresas</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>Administra aseguradoras y configs de IA.</Typography>
                </Box>
                <IconButton sx={{ color: '#fff', background: 'rgba(255,255,255,0.05)' }}>
                    <NotificationsIcon />
                </IconButton>
            </Box>

            {/* Big Button */}
            <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNew}
                sx={{
                    mb: 4, py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: '1rem',
                    background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                    boxShadow: '0 8px 20px rgba(168, 85, 247, 0.4)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    '&:hover': {
                        background: 'linear-gradient(135deg, #9333ea 0%, #2563eb 100%)',
                        boxShadow: '0 8px 25px rgba(168, 85, 247, 0.6)'
                    }
                }}
            >
                NUEVA EMPRESA
            </Button>

            {/* Title & Badge */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} color="#fff">Empresas y Prompts</Typography>
                <Chip label={`${empresas.length} Registros`} size="small" sx={{ background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', fontWeight: 800, borderRadius: 2 }} />
            </Box>

            {/* List of Company Cards (Grid) */}
            <Grid container spacing={2}>
                {empresas.map((emp) => (
                    <Grid item xs={12} sm={6} key={emp.id}>
                        <Box sx={{
                            height: '100%',
                            display: 'flex', flexDirection: 'column',
                            p: 2.5, borderRadius: 3,
                            background: 'rgba(20, 20, 30, 0.6)',
                            border: '1px solid rgba(168,85,247,0.1)',
                            position: 'relative'
                        }}>
                            {/* ID & Name & Actions */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 800, letterSpacing: 1 }}>ID {emp.id}</Typography>
                                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, textTransform: 'uppercase' }}>{emp.nombre}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => openEdit(emp)} sx={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', borderRadius: 2 }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(emp.id)} sx={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', borderRadius: 2 }}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* PDF Pages */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <InsertDriveFileIcon sx={{ color: '#94a3b8', fontSize: 16 }} />
                                <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 600 }}>
                                    {emp.paginas_procesamiento ?? 2} Páginas PDF
                                </Typography>
                            </Box>

                            {/* Prompt Box */}
                            <Box sx={{ p: 2, mt: 'auto', borderRadius: 2, background: 'rgba(15,23,42,0.6)' }}>
                                <Typography variant="caption" sx={{ color: '#a855f7', fontWeight: 800, mb: 0.5, display: 'block', letterSpacing: 1 }}>PROMPT RESUMEN</Typography>
                                <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, lineHeight: 1.5 }}>
                                    "{emp.prompt_reglas || 'Sin reglas especificadas...'}"
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth
                PaperProps={{
                    sx: { background: '#1e293b', color: '#fff', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
                <DialogContent sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(0,0,0,0.2)', borderRadius: 2, color: '#fff' }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nombre de la Empresa"
                        fullWidth
                        variant="outlined"
                        value={currentEmpresa.nombre}
                        onChange={(e) => setCurrentEmpresa({ ...currentEmpresa, nombre: e.target.value })}
                        sx={{ mb: 2, mt: 1 }}
                    />
                    <TextField
                        margin="dense"
                        label="Prompt / Reglas de Extracción"
                        fullWidth
                        multiline
                        rows={6}
                        variant="outlined"
                        value={currentEmpresa.prompt_reglas}
                        onChange={(e) => setCurrentEmpresa({ ...currentEmpresa, prompt_reglas: e.target.value })}
                        helperText={<Typography variant="caption" color="#cbd5e1">Escribe las instrucciones específicas para la IA.</Typography>}
                    />
                    <Tooltip
                        title={
                            <Box sx={{ p: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Formatos soportados:</Typography>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
                                    <li><b>0</b>: Envía documento completo.</li>
                                    <li><b>Ej: 2</b>: Envía primeras 2 páginas.</li>
                                    <li><b>Ej: 1-3</b>: Rango pág 1 a la 3.</li>
                                </ul>
                            </Box>
                        }
                        placement="top"
                        arrow
                    >
                        <TextField
                            margin="dense"
                            label="Páginas a procesar"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={currentEmpresa.paginas_procesamiento ?? "2"}
                            onChange={(e) => setCurrentEmpresa({ ...currentEmpresa, paginas_procesamiento: e.target.value })}
                            sx={{ mt: 2 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <InfoIcon sx={{ color: '#94a3b8' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Tooltip>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setOpenDialog(false)} sx={{ color: '#94a3b8' }}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)', fontWeight: 800 }}>Guardar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity} sx={{ background: toast.severity === 'error' ? '#7f1d1d' : '#14532d', color: '#fff', borderRadius: 2 }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CompanyManager;
