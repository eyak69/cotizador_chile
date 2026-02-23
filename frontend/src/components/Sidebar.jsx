import React, { useState, useEffect } from 'react';
import {
    Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Toolbar, Typography, Box, Divider, Avatar, Tooltip, IconButton
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const Sidebar = ({ currentTab, onTabChange, mobileOpen, handleDrawerToggle }) => {
    const [version, setVersion] = useState('');
    const { user, logout } = useAuth();

    useEffect(() => {
        api.get('/config')
            .then(res => { if (res.data.system_version) setVersion(res.data.system_version); })
            .catch(() => { });
    }, []);

    const baseItems = [
        { text: 'Cotizador', icon: <DashboardIcon />, index: 0 },
        { text: 'Empresas', icon: <BusinessIcon />, index: 1 },
        { text: 'Historial', icon: <HistoryIcon />, index: 2 },
        { text: 'Configuración', icon: <SettingsIcon />, index: 3 },
    ];

    // Solo el admin ve la sección de usuarios
    const menuItems = user?.role === 'admin'
        ? [...baseItems, { text: 'Usuarios', icon: <PeopleIcon />, index: 4, adminOnly: true }]
        : baseItems;

    const drawerContent = (
        <>
            <Toolbar>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" component="div" sx={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: '800',
                        letterSpacing: 1,
                        fontSize: '1.4rem'
                    }}>
                        COTIZADOR IA
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />
            <Box sx={{ overflow: 'auto', mt: 2 }}>
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                selected={currentTab === item.index}
                                onClick={(event) => {
                                    onTabChange(event, item.index);
                                    if (handleDrawerToggle) handleDrawerToggle(); // Close drawer on mobile after selection
                                }}
                                sx={{
                                    mx: 2,
                                    mb: 1,
                                    borderRadius: '12px',
                                    transition: 'all 0.3s ease',
                                    '&.Mui-selected': {
                                        backgroundColor: item.adminOnly
                                            ? 'rgba(236,72,153,0.15)'
                                            : 'rgba(139, 92, 246, 0.2)',
                                        boxShadow: item.adminOnly
                                            ? 'inset 0 0 0 1px rgba(236,72,153,0.3), 0 0 15px rgba(236,72,153,0.1)'
                                            : 'inset 0 0 0 1px rgba(139, 92, 246, 0.3), 0 0 15px rgba(139, 92, 246, 0.1)',
                                        '&:hover': { backgroundColor: item.adminOnly ? 'rgba(236,72,153,0.25)' : 'rgba(139, 92, 246, 0.3)' }
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    }
                                }}
                            >
                                <ListItemIcon sx={{
                                    color: currentTab === item.index
                                        ? (item.adminOnly ? '#ec4899' : '#8b5cf6')
                                        : 'text.secondary',
                                    minWidth: 40
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: currentTab === item.index ? '700' : '500',
                                        color: currentTab === item.index ? '#fff' : 'text.secondary',
                                        fontSize: '0.95rem',
                                        letterSpacing: '0.3px'
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Usuario actual + Cerrar Sesión */}
            <Box sx={{ mt: 'auto', p: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.15)',
                }}>
                    <Avatar sx={{
                        width: 38, height: 38, fontSize: '0.9rem', fontWeight: 800,
                        background: user?.role === 'admin'
                            ? 'linear-gradient(135deg, #ec4899, #be185d)'
                            : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}>
                        {(user?.displayName || user?.email || '?').substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight={600} color="white" noWrap>
                            {user?.displayName || user?.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {user?.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
                        </Typography>
                    </Box>
                    <Tooltip title="Cerrar Sesión">
                        <IconButton
                            id="logout-btn"
                            size="small"
                            onClick={logout}
                            sx={{ color: 'text.secondary', '&:hover': { color: '#ec4899' } }}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.5, display: 'block', textAlign: 'center', mt: 1.5 }}>
                    v{version || '...'}
                </Typography>
            </Box>
        </>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="opciones de navegacion"
        >
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawerContent}
            </Drawer>
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255, 255, 255, 0.12)' },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
};

export default Sidebar;
