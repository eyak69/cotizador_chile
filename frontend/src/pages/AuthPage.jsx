import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import {
    Box, TextField, Button, Typography, Alert, CircularProgress,
    InputAdornment, IconButton, Divider, Paper, Chip
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

// Icono SVG de Google
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const AuthPage = () => {
    const { login, register, googleLogin } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(email, password, displayName);
            }
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    // Hook de Google OAuth (flujo popup con @react-oauth/google)
    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setGoogleLoading(true);
        try {
            await googleLogin(credentialResponse.credential);
        } catch (err) {
            setError(err?.response?.data?.message || 'Error al autenticar con Google.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const triggerGoogleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => setError('Error al abrir el inicio de sesión con Google.'),
        flow: 'implicit',
        // Para flujo con credential (id_token), usamos oneTap o el botón estándar
        // Aquí usamos el flujo de token de acceso, lo convertimos en id_token en el popup
    });

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
                position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                top: -150, left: -150,
            }} />
            <Box sx={{
                position: 'absolute', width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
                bottom: -80, right: -80,
            }} />

            <Paper elevation={24} sx={{
                width: '100%', maxWidth: 440, mx: 2, p: 4, borderRadius: 3,
                background: 'rgba(30, 41, 59, 0.92)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
                position: 'relative', zIndex: 1,
            }}>
                {/* Logo */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Box sx={{
                        display: 'inline-flex', p: 2, borderRadius: 2, mb: 2,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
                    }}>
                        <AutoGraphIcon sx={{ fontSize: 38, color: 'white' }} />
                    </Box>
                    <Typography variant="h5" fontWeight={700} color="white" gutterBottom>
                        Cotizador Chile
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratuita'}
                    </Typography>
                </Box>

                {/* Selector Login / Registro */}
                <Box sx={{
                    display: 'flex', background: 'rgba(0,0,0,0.3)',
                    borderRadius: 2, p: 0.5, mb: 3,
                }}>
                    {[{ key: 'login', label: 'Iniciar Sesión' }, { key: 'register', label: 'Registrarse' }].map(({ key, label }) => (
                        <Button key={key} fullWidth
                            onClick={() => { setMode(key); setError(''); }}
                            sx={{
                                borderRadius: 1.5, py: 0.8, fontWeight: 600, fontSize: '0.85rem',
                                color: mode === key ? 'white' : 'text.secondary',
                                background: mode === key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                                boxShadow: mode === key ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    background: mode === key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                                }
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Box>

                {/* Botón Google */}
                <Button
                    id="google-login-btn"
                    fullWidth
                    variant="outlined"
                    onClick={triggerGoogleLogin}
                    disabled={googleLoading}
                    startIcon={googleLoading ? <CircularProgress size={18} /> : <GoogleIcon />}
                    sx={{
                        mb: 2, py: 1.3, borderRadius: 2,
                        borderColor: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.25s ease',
                        '&:hover': {
                            borderColor: 'rgba(255,255,255,0.35)',
                            background: 'rgba(255,255,255,0.1)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                        },
                    }}
                >
                    {googleLoading ? 'Autenticando...' : 'Continuar con Google'}
                </Button>

                {/* Separador */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <Typography variant="caption" color="text.secondary">o con email</Typography>
                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </Box>

                {/* Formulario */}
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
                            {error}
                        </Alert>
                    )}

                    {mode === 'register' && (
                        <TextField
                            id="auth-displayname"
                            label="Nombre (opcional)"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon sx={{ color: '#6366f1' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: '#6366f1' } } }}
                        />
                    )}

                    <TextField
                        id="auth-email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailIcon sx={{ color: '#6366f1' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: '#6366f1' } } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: '#6366f1' } } }}
                    />

                    <Button
                        id="auth-submit-btn"
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{
                            mt: 0.5, py: 1.4, borderRadius: 2,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5,
                            boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                boxShadow: '0 12px 28px rgba(99,102,241,0.55)',
                                transform: 'translateY(-1px)',
                            },
                            '&:disabled': { background: 'rgba(99,102,241,0.4)' }
                        }}
                    >
                        {loading ? <CircularProgress size={22} color="inherit" /> : (mode === 'login' ? 'Entrar' : 'Crear Cuenta')}
                    </Button>
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.07)' }} />
                <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                    Sistema de Cotización de Seguros — Chile 🇨🇱
                </Typography>
            </Paper>
        </Box>
    );
};

export default AuthPage;
