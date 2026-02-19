import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Box, TextField, Button, Typography, Alert, CircularProgress, InputAdornment, IconButton, Divider, Paper
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

const AuthPage = () => {
    const { login, register } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(username, password);
            } else {
                if (password.length < 6) {
                    setError('La contraseña debe tener al menos 6 caracteres.');
                    setLoading(false);
                    return;
                }
                await register(username, password);
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Decoraciones de fondo */}
            <Box sx={{
                position: 'absolute', width: 400, height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                top: -100, left: -100,
            }} />
            <Box sx={{
                position: 'absolute', width: 300, height: 300,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
                bottom: -50, right: -50,
            }} />

            <Paper elevation={24} sx={{
                width: '100%',
                maxWidth: 420,
                mx: 2,
                p: 4,
                borderRadius: 3,
                background: 'rgba(30, 41, 59, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo / Icono */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Box sx={{
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        mb: 2,
                        boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
                    }}>
                        <AutoGraphIcon sx={{ fontSize: 36, color: 'white' }} />
                    </Box>
                    <Typography variant="h5" fontWeight={700} color="white" gutterBottom>
                        Cotizador Chile
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {mode === 'login' ? 'Ingresa tus credenciales para continuar' : 'Crea una cuenta nueva'}
                    </Typography>
                </Box>

                {/* Selector Login / Registro */}
                <Box sx={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 2,
                    p: 0.5,
                    mb: 3,
                }}>
                    {['login', 'register'].map(m => (
                        <Button
                            key={m}
                            fullWidth
                            onClick={() => { setMode(m); setError(''); }}
                            sx={{
                                borderRadius: 1.5,
                                py: 0.8,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                color: mode === m ? 'white' : 'text.secondary',
                                background: mode === m ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                                boxShadow: mode === m ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: mode === m ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                                }
                            }}
                        >
                            {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
                        </Button>
                    ))}
                </Box>

                {/* Formulario */}
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        id="auth-username"
                        label="Usuario"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <AccountCircleIcon sx={{ color: '#6366f1' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&.Mui-focused fieldset': { borderColor: '#6366f1' }
                            }
                        }}
                    />

                    <TextField
                        id="auth-password"
                        label="Contraseña"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon sx={{ color: '#6366f1' }} />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPass(!showPass)} edge="end" size="small">
                                        {showPass ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&.Mui-focused fieldset': { borderColor: '#6366f1' }
                            }
                        }}
                    />

                    <Button
                        id="auth-submit-btn"
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{
                            mt: 1,
                            py: 1.5,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            letterSpacing: 0.5,
                            boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: '0 12px 28px rgba(99,102,241,0.55)',
                                transform: 'translateY(-1px)',
                            },
                            '&:disabled': {
                                background: 'rgba(99,102,241,0.4)',
                            }
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : (mode === 'login' ? 'Entrar' : 'Crear Cuenta')}
                    </Button>
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                    Sistema de Cotización de Seguros — Chile 🇨🇱
                </Typography>
            </Paper>
        </Box>
    );
};

export default AuthPage;
