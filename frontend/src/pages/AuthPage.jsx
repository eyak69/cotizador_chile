import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress, Divider, InputAdornment, IconButton } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';
import axios from 'axios';

// SVG de Google
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
        <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
);

const AuthPage = () => {
    const { login, googleLogin } = useAuth();

    // Flujo: 'login' | 'setup'
    const [mode, setMode] = useState('login');

    // Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);

    // Setup contraseña (primer acceso)
    const [setupToken, setSetupToken] = useState('');
    const [setupEmail, setSetupEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [setupDone, setSetupDone] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ─── LOGIN ──────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password);

            // El backend puede devolver needsSetup si el usuario no tiene contraseña
            if (res?.needsSetup) {
                setSetupToken(res.setupToken);
                setSetupEmail(email);
                setMode('setup');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    // ─── GOOGLE ─────────────────────────────────────────────
    const handleGoogleSuccess = async (tokenResponse) => {
        setError('');
        setLoading(true);
        try {
            // tokenResponse.access_token → convertir a credential usando userinfo
            const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            await googleLogin({ credential: tokenResponse.access_token, userInfo: userInfo.data });
        } catch (err) {
            setError(err.response?.data?.message || 'Error con Google');
        } finally {
            setLoading(false);
        }
    };

    const triggerGoogle = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => setError('Error al conectar con Google')
    });

    // ─── SETUP CONTRASEÑA ────────────────────────────────────
    const handleSetupPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            const res = await auth.setupPassword(setupToken, newPassword);
            // Login automático con el token que devuelve el backend
            if (res.token) {
                localStorage.setItem('token', res.token);
                localStorage.setItem('user', JSON.stringify(res.user));
                setSetupDone(true);
                setTimeout(() => window.location.reload(), 1200);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear contraseña');
        } finally {
            setLoading(false);
        }
    };

    // ─── RENDER ──────────────────────────────────────────────
    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: 2,
            position: 'relative',
            '&::before': {
                content: '""', position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%)',
                pointerEvents: 'none'
            }
        }}>
            <Box sx={{
                width: '100%', maxWidth: 420,
                background: 'rgba(30,41,59,0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: 4,
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                p: { xs: 3, sm: 4 },
                position: 'relative', zIndex: 1
            }}>
                {/* Logo */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h5" fontWeight={800} sx={{
                        background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: 1
                    }}>
                        COTIZADOR IA
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {mode === 'login' ? 'Inicia sesión para continuar' : `Bienvenido, crea tu contraseña`}
                    </Typography>
                </Box>

                {/* ── PANTALLA: CREAR CONTRASEÑA (primer acceso) ── */}
                {mode === 'setup' && !setupDone && (
                    <Box component="form" onSubmit={handleSetupPassword}>
                        <Box sx={{
                            p: 2, mb: 3, borderRadius: 2,
                            background: 'rgba(99,102,241,0.1)',
                            border: '1px solid rgba(99,102,241,0.25)'
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                👋 Tu cuenta fue creada por el administrador para <strong style={{ color: '#a5b4fc' }}>{setupEmail}</strong>.
                                Elige una contraseña para acceder.
                            </Typography>
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                        <TextField
                            id="new-password"
                            label="Nueva contraseña"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            fullWidth required
                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#6366f1', fontSize: 18 }} /></InputAdornment>,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowNew(!showNew)}>
                                            {showNew ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <TextField
                            id="confirm-password"
                            label="Confirmar contraseña"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            fullWidth required
                            sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#6366f1', fontSize: 18 }} /></InputAdornment>
                            }}
                        />
                        <Button
                            id="setup-password-btn"
                            type="submit" fullWidth variant="contained"
                            disabled={loading}
                            sx={{
                                py: 1.5, borderRadius: 2, fontWeight: 700,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                            }}
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : 'Crear contraseña y entrar'}
                        </Button>
                    </Box>
                )}

                {/* ── PANTALLA: SETUP COMPLETADO ── */}
                {setupDone && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <CheckCircleIcon sx={{ fontSize: 56, color: '#22c55e', mb: 2 }} />
                        <Typography variant="h6" fontWeight={700}>¡Contraseña creada!</Typography>
                        <Typography variant="body2" color="text.secondary">Entrando a la aplicación...</Typography>
                    </Box>
                )}

                {/* ── PANTALLA: LOGIN ── */}
                {mode === 'login' && (
                    <>
                        {/* Google */}
                        <Button
                            id="google-login-btn"
                            fullWidth variant="outlined"
                            onClick={() => { setError(''); triggerGoogle(); }}
                            disabled={loading}
                            startIcon={<GoogleIcon />}
                            sx={{
                                py: 1.4, borderRadius: 2, fontWeight: 600,
                                borderColor: 'rgba(255,255,255,0.15)',
                                color: 'white', mb: 3,
                                '&:hover': { borderColor: 'rgba(99,102,241,0.6)', background: 'rgba(99,102,241,0.08)' }
                            }}
                        >
                            Continuar con Google
                        </Button>

                        <Divider sx={{ mb: 3 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>o con tu email</Typography>
                        </Divider>

                        <Box component="form" onSubmit={handleLogin}>
                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                            <TextField
                                id="login-email"
                                label="Email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                fullWidth required
                                autoComplete="email"
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#6366f1', fontSize: 18 }} /></InputAdornment>
                                }}
                            />
                            <TextField
                                id="login-password"
                                label="Contraseña"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                fullWidth required
                                autoComplete="current-password"
                                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#6366f1', fontSize: 18 }} /></InputAdornment>,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPass(!showPass)}>
                                                {showPass ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Button
                                id="login-submit-btn"
                                type="submit" fullWidth variant="contained"
                                disabled={loading}
                                sx={{
                                    py: 1.5, borderRadius: 2, fontWeight: 700,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                                    '&:hover': { boxShadow: '0 6px 16px rgba(99,102,241,0.55)' }
                                }}
                            >
                                {loading ? <CircularProgress size={20} color="inherit" /> : 'Iniciar Sesión'}
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default AuthPage;
