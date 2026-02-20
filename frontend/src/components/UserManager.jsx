import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Alert, Chip, Avatar, CircularProgress,
    InputAdornment, Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../services/api';

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', displayName: '', role: 'user' });
    const [creating, setCreating] = useState(false);

    // Edición inline de nombre
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch { showToast('Error al cargar usuarios', 'error'); }
        finally { setLoading(false); }
    };

    const handleCreateUser = async () => {
        if (!newUser.email) { showToast('El email es requerido', 'error'); return; }
        setCreating(true);
        try {
            await api.post('/users', newUser);
            const msg = newUser.password
                ? `✅ Usuario ${newUser.email} creado`
                : `✅ ${newUser.email} creado — deberá crear su contraseña al primer acceso`;
            showToast(msg);
            setOpenDialog(false);
            setNewUser({ email: '', password: '', displayName: '', role: 'user' });
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Error al crear usuario', 'error');
        } finally { setCreating(false); }
    };

    const handleDeleteUser = async (id, email) => {
        if (!window.confirm(`¿Eliminar el usuario "${email}"?`)) return;
        try {
            await api.delete(`/users/${id}`);
            showToast('Usuario eliminado');
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Error al eliminar usuario', 'error');
        }
    };

    const handleToggleRole = async (user) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        try {
            await api.put(`/users/${user.id}`, { role: newRole });
            showToast(`Rol actualizado a "${newRole}"`);
            fetchUsers();
        } catch { showToast('Error al cambiar rol', 'error'); }
    };

    const startEditName = (user) => {
        setEditingId(user.id);
        setEditingName(user.displayName || '');
    };

    const cancelEdit = () => { setEditingId(null); setEditingName(''); };

    const saveName = async (userId) => {
        try {
            await api.put(`/users/${userId}`, { displayName: editingName });
            showToast('Nombre actualizado');
            setEditingId(null);
            fetchUsers();
        } catch { showToast('Error al guardar nombre', 'error'); }
    };

    const showToast = (msg, severity = 'success') => setToast({ open: true, msg, severity });

    const getInitials = (name, email) => (name || email || '?').substring(0, 2).toUpperCase();

    return (
        <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
            <Paper sx={{
                p: 3, borderRadius: 3,
                border: '1px solid rgba(236,72,153,0.2)',
                background: 'linear-gradient(135deg, rgba(236,72,153,0.04) 0%, rgba(30,41,59,0.95) 100%)'
            }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1, borderRadius: 1.5,
                            background: 'linear-gradient(135deg, #ec4899, #be185d)',
                            display: 'flex'
                        }}>
                            <AdminPanelSettingsIcon sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Usuarios con Acceso</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Solo visible para administradores
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        id="create-user-btn"
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{
                            background: 'linear-gradient(135deg, #ec4899, #be185d)',
                            borderRadius: 2, fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(236,72,153,0.35)',
                            '&:hover': { boxShadow: '0 6px 16px rgba(236,72,153,0.5)' }
                        }}
                    >
                        Invitar Usuario
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Método</TableCell>
                                    <TableCell>Rol</TableCell>
                                    <TableCell align="right">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id} hover>
                                        {/* Nombre editable */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{
                                                    width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                                                    background: u.role === 'admin'
                                                        ? 'linear-gradient(135deg, #ec4899, #be185d)'
                                                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                }}>
                                                    {getInitials(u.displayName, u.email)}
                                                </Avatar>

                                                {editingId === u.id ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <TextField
                                                            value={editingName}
                                                            onChange={e => setEditingName(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveName(u.id); if (e.key === 'Escape') cancelEdit(); }}
                                                            size="small"
                                                            autoFocus
                                                            placeholder="Nombre..."
                                                            sx={{ width: 140 }}
                                                        />
                                                        <Tooltip title="Guardar">
                                                            <IconButton size="small" color="success" onClick={() => saveName(u.id)}>
                                                                <SaveIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Cancelar">
                                                            <IconButton size="small" onClick={cancelEdit}>
                                                                <CloseIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {u.displayName || <em style={{ color: '#6b7280' }}>Sin nombre</em>}
                                                        </Typography>
                                                        <Tooltip title="Editar nombre">
                                                            <IconButton size="small" onClick={() => startEditName(u)} sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                                                                <EditIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                {u.email}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={u.authProvider === 'google' ? '🔵 Google' : u.password ? '📧 Email' : '⏳ Sin contraseña'}
                                                size="small"
                                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Tooltip title={`Cambiar a ${u.role === 'admin' ? 'usuario' : 'admin'}`}>
                                                <Chip
                                                    icon={u.role === 'admin' ? <AdminPanelSettingsIcon sx={{ fontSize: 14 }} /> : <PersonIcon sx={{ fontSize: 14 }} />}
                                                    label={u.role === 'admin' ? 'Admin' : 'Usuario'}
                                                    size="small"
                                                    color={u.role === 'admin' ? 'secondary' : 'default'}
                                                    onClick={() => handleToggleRole(u)}
                                                    sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                                                />
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell align="right">
                                            <Tooltip title="Eliminar usuario">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id, u.email)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog Crear/Invitar Usuario */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Invitar Nuevo Usuario</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Nombre (opcional)"
                            value={newUser.displayName}
                            onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                            fullWidth size="small"
                        />
                        <TextField
                            label="Email *"
                            type="email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            fullWidth size="small" required
                        />
                        <TextField
                            label="Contraseña (opcional)"
                            type={showPass ? 'text' : 'password'}
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            fullWidth size="small"
                            helperText={newUser.password ? '' : 'Si no pones contraseña, el usuario la creará en su primer acceso'}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowPass(!showPass)}>
                                            {showPass ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {['user', 'admin'].map(r => (
                                <Button key={r} variant={newUser.role === r ? 'contained' : 'outlined'}
                                    size="small"
                                    onClick={() => setNewUser({ ...newUser, role: r })}
                                    sx={{ borderRadius: 2, flex: 1, textTransform: 'none', fontWeight: 700 }}
                                    color={r === 'admin' ? 'secondary' : 'primary'}
                                >
                                    {r === 'admin' ? '👑 Admin' : '👤 Usuario'}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateUser}
                        disabled={creating}
                        startIcon={creating ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}
                        sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #ec4899, #be185d)' }}
                    >
                        {creating ? 'Creando...' : 'Crear y Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open} autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity} sx={{ borderRadius: 2 }}>{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
};

export default UserManager;
