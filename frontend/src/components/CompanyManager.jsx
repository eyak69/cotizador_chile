import React, { useState, useEffect } from 'react';
import {
    Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Typography, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Snackbar, Alert, Tooltip, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
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
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Paper sx={{ p: 4, mt: 4, width: '100%', maxWidth: 900, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h5">Gestión de Empresas y Prompts</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                        Nueva Empresa
                    </Button>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Páginas PDF</TableCell>
                                <TableCell>Prompt (Resumen)</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {empresas.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell>{emp.id}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{emp.nombre}</TableCell>
                                    <TableCell>{emp.paginas_procesamiento ?? 2}</TableCell>
                                    <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {emp.prompt_reglas}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton onClick={() => openEdit(emp)} color="primary"><EditIcon /></IconButton>
                                        <IconButton onClick={() => handleDelete(emp.id)} color="error"><DeleteIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle>{isEditing ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Nombre de la Empresa"
                            fullWidth
                            variant="outlined"
                            value={currentEmpresa.nombre}
                            onChange={(e) => setCurrentEmpresa({ ...currentEmpresa, nombre: e.target.value })}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            margin="dense"
                            label="Prompt / Reglas de Extracción"
                            fullWidth
                            multiline
                            rows={10}
                            variant="outlined"
                            value={currentEmpresa.prompt_reglas}
                            onChange={(e) => setCurrentEmpresa({ ...currentEmpresa, prompt_reglas: e.target.value })}
                            helperText="Escribe aquí las instrucciones específicas para la IA (Reglas de Oro, Conversión, etc.)"
                        />
                        <Tooltip
                            title={
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Formatos soportados:</Typography>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
                                        <li><b>0</b>: Envía el documento completo (sin recortes).</li>
                                        <li><b>Número simple (Ej: "2")</b>: Envía las primeras 2 páginas.</li>
                                        <li><b>Lista (Ej: "1,3,5")</b>: Envía solo las páginas 1, 3 y 5.</li>
                                        <li><b>Rango (Ej: "1-3")</b>: Envía de la página 1 a la 3 y descarta el resto.</li>
                                        <li><b>Combinado (Ej: "1, 3-5, 10")</b>: Envía pág. 1, rango 3 a 5, y la 10.</li>
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
                                helperText="Pasa el mouse para ver ejemplos avanzados de selección de hojas."
                                sx={{ mt: 2 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <InfoIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Tooltip>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSave} variant="contained">Guardar</Button>
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
        </Box>
    );
};

export default CompanyManager;
