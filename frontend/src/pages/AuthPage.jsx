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
            background: '#0a0a0f', // Very dark background like the mockup
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: 2,
            position: 'relative',
        }}>
            <Box className="glass-card" sx={{
                width: '100%', maxWidth: 400,
                p: { xs: 3, sm: 4 },
                position: 'relative', zIndex: 1,
                background: 'rgba(20, 20, 30, 0.8)', // Dark purple tinted card
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: 4,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
                {/* Logo */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <span style={{ fontSize: '24px', color: '#a78bfa' }}>✨</span>
                        <Typography variant="h5" fontWeight={800} sx={{
                            background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            letterSpacing: 0.5
                        }}>
                            COTIZADOR IA
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        Plataforma de Seguros Inteligente
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
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Typography variant="h6" fontWeight={700} sx={{ color: '#fff' }}>Inicia sesión</Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Bienvenido de nuevo a la era premium</Typography>
                        </Box>

                        {/* Google */}
                        <Button
                            id="google-login-btn"
                            fullWidth variant="outlined"
                            onClick={() => { setError(''); triggerGoogle(); }}
                            disabled={loading}
                            startIcon={<GoogleIcon />}
                            sx={{
                                py: 1.2, borderRadius: 3, fontWeight: 600, fontSize: '0.85rem',
                                borderColor: 'rgba(255,255,255,0.05)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'white', mb: 3,
                                textTransform: 'uppercase',
                                '&:hover': {
                                    background: 'rgba(255,255,255,0.08)',
                                    borderColor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            CONTINUAR CON GOOGLE
                        </Button>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Typography variant="overline" sx={{ px: 2, color: '#64748b', fontSize: '0.7rem', letterSpacing: 1 }}>O CON TU EMAIL</Typography>
                            <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                        </Box>

                        <Box component="form" onSubmit={handleLogin}>
                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                            <TextField
                                id="login-email"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                fullWidth required
                                autoComplete="email"
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#cbd5e1',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' }
                                    },
                                    '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1 }
                                }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#64748b', fontSize: 18 }} /></InputAdornment>
                                }}
                            />
                            <TextField
                                id="login-password"
                                type={showPass ? 'text' : 'password'}
                                placeholder="Contraseña"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                fullWidth required
                                autoComplete="current-password"
                                sx={{
                                    mb: 1,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#cbd5e1',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' }
                                    },
                                    '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1 }
                                }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#64748b', fontSize: 18 }} /></InputAdornment>,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPass(!showPass)}>
                                                {showPass ? <VisibilityOff sx={{ color: '#64748b', fontSize: 18 }} /> : <Visibility sx={{ color: '#64748b', fontSize: 18 }} />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                                <Typography variant="caption" sx={{ color: '#a78bfa', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                                    ¿Olvidaste tu contraseña?
                                </Typography>
                            </Box>

                            <Button
                                id="login-submit-btn"
                                type="submit" fullWidth variant="contained"
                                disabled={loading}
                                sx={{
                                    py: 1.5, borderRadius: 3, fontWeight: 700,
                                    background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                                    boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)',
                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #9333ea 0%, #2563eb 100%)',
                                        boxShadow: '0 8px 25px rgba(168, 85, 247, 0.5)'
                                    }
                                }}
                            >
                                {loading ? <CircularProgress size={20} color="inherit" /> : 'INICIAR SESIÓN'}
                            </Button>
                        </Box>
                    </>
                )}
            </Box>

            {/* Footer Text */}
            {mode === 'login' && (
                <Box sx={{ position: 'absolute', bottom: 40, width: '100%', textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                        ¿No tienes una cuenta? <span style={{ color: '#a855f7', fontWeight: 600, cursor: 'pointer' }}>Crear cuenta</span>
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, color: '#475569', fontSize: '0.7rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <LockIcon sx={{ fontSize: 12 }} /> SECURE AI
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircleIcon sx={{ fontSize: 12 }} /> 256-BIT AES
                        </span>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default AuthPage;
