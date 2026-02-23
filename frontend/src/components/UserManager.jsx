import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TextField, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Snackbar, Alert, Chip, Avatar, CircularProgress,
    InputAdornment, Tooltip, Grid
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GoogleIcon from '@mui/icons-material/Google';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

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

    const handleDeleteClick = (id, email) => {
        setUserToDelete({ id, email });
        setDeleteDialogOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/users/${userToDelete.id}`);
            showToast('Usuario eliminado');
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Error al eliminar usuario', 'error');
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
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

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(u =>
        (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', p: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', mb: 0.5 }}>Usuarios con Acceso</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon sx={{ fontSize: 14 }} /> Solo visible para administradores
                </Typography>
            </Box>

            {/* Invite Button */}
            <Button
                id="create-user-btn"
                fullWidth
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{
                    mb: 3, py: 1.5,
                    background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', // Pink gradient from mockup
                    borderRadius: 8, fontWeight: 700, fontSize: '0.95rem',
                    boxShadow: '0 8px 20px rgba(244, 63, 94, 0.3)',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    '&:hover': {
                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                        boxShadow: '0 8px 25px rgba(244, 63, 94, 0.5)'
                    }
                }}
            >
                INVITAR USUARIO
            </Button>

            {/* Search Bar */}
            <TextField
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                fullWidth
                sx={{
                    mb: 4,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        color: '#cbd5e1',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&.Mui-focused fieldset': { borderColor: '#f43f5e' }
                    },
                    '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1 }
                }}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>
                }}
            />

            {/* User List Cards */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} sx={{ color: '#f43f5e' }} />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {filteredUsers.map((u) => (
                        <Grid item xs={12} sm={6} key={u.id}>
                            <Box sx={{
                                height: '100%', display: 'flex', flexDirection: 'column',
                                p: 2.5, borderRadius: 4,
                                background: 'rgba(20, 20, 30, 0.6)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                position: 'relative'
                            }}>
                                {/* Card Header (Avatar + Info + Edit) */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{
                                        width: 48, height: 48, fontSize: '1.2rem', fontWeight: 700, mr: 2,
                                        background: u.role === 'admin' ? 'transparent' : '#2e1065',
                                        border: u.role === 'admin' ? '2px solid #ec4899' : 'none',
                                        color: u.role === 'admin' ? '#fff' : '#c4b5fd'
                                    }}>
                                        {getInitials(u.displayName, u.email)}
                                    </Avatar>

                                    <Box sx={{ flexGrow: 1 }}>
                                        {editingId === u.id ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TextField
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveName(u.id); if (e.key === 'Escape') cancelEdit(); }}
                                                    size="small" autoFocus placeholder="Nombre..."
                                                    sx={{ '& .MuiInputBase-input': { color: '#fff', py: 0.5 } }}
                                                />
                                                <IconButton size="small" color="success" onClick={() => saveName(u.id)}><SaveIcon fontSize="small" /></IconButton>
                                                <IconButton size="small" onClick={cancelEdit}><CloseIcon fontSize="small" sx={{ color: '#94a3b8' }} /></IconButton>
                                            </Box>
                                        ) : (
                                            <>
                                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff', lineHeight: 1.2 }}>
                                                    {u.displayName || 'Sin nombre'}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                                    {u.email}
                                                </Typography>
                                            </>
                                        )}
                                    </Box>

                                    {/* Edit Button */}
                                    {!editingId && (
                                        <IconButton size="small" onClick={() => startEditName(u)} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
                                            <EditIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                        </IconButton>
                                    )}
                                </Box>

                                {/* Card Actions (Badges + Delete) */}
                                <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {/* Role Badge */}
                                        <Chip
                                            icon={u.role === 'admin' ? <AdminPanelSettingsIcon sx={{ fontSize: 14 }} /> : null}
                                            label={u.role === 'admin' ? 'ADMIN' : 'USUARIO'}
                                            size="small"
                                            onClick={() => handleToggleRole(u)}
                                            sx={{
                                                fontWeight: 800, fontSize: '0.65rem', letterSpacing: 0.5,
                                                background: u.role === 'admin' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.05)',
                                                color: u.role === 'admin' ? '#ec4899' : '#cbd5e1',
                                                border: 'none', borderRadius: 4,
                                                '& .MuiChip-icon': { color: u.role === 'admin' ? '#ec4899' : '#cbd5e1' }
                                            }}
                                        />
                                        {/* Provider Badge */}
                                        <Chip
                                            icon={u.authProvider === 'google' ? <GoogleIcon sx={{ fontSize: 14 }} /> : <EmailOutlinedIcon sx={{ fontSize: 14 }} />}
                                            label={u.authProvider === 'google' ? 'Google' : 'Email'}
                                            size="small"
                                            sx={{
                                                fontWeight: 700, fontSize: '0.7rem',
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                color: '#38bdf8',
                                                border: 'none', borderRadius: 4,
                                                '& .MuiChip-icon': { color: '#38bdf8' }
                                            }}
                                        />
                                    </Box>

                                    {/* Delete Button */}
                                    <IconButton size="small" onClick={() => handleDeleteClick(u.id, u.email)} sx={{ color: '#64748b', '&:hover': { color: '#ef4444' } }}>
                                        <DeleteIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}

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

            {/* Dialogo Confirmación Borrado Usuario */}
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
                        ¿Estás seguro de que deseas eliminar permanentemente al usuario <b>{userToDelete?.email}</b>?
                        Esta acción cortará su acceso al sistema inmediatamente.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={cancelDelete} sx={{ color: '#94a3b8' }}>Cancelar</Button>
                    <Button onClick={confirmDeleteUser} variant="contained" color="error" sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Sí, Eliminar
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
