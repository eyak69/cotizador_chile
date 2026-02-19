import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Box,
    Divider,
    Avatar,
    Tooltip,
    IconButton
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const Sidebar = ({ currentTab, onTabChange }) => {
    const [version, setVersion] = useState('');
    const { user, logout } = useAuth();

    useEffect(() => {
        axios.get('/api/config', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => {
                if (res.data.system_version) setVersion(res.data.system_version);
            })
            .catch(err => console.error("Error obteniendo version:", err));
    }, []);

    const menuItems = [
        { text: 'Cotizador', icon: <DashboardIcon />, index: 0 },
        { text: 'Empresas', icon: <BusinessIcon />, index: 1 },
        { text: 'Historial', icon: <HistoryIcon />, index: 2 },
        { text: 'Configuración', icon: <SettingsIcon />, index: 3 },
    ];

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '?';

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid rgba(255, 255, 255, 0.12)' },
            }}
        >
            <Toolbar>
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" component="div" sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold',
                        letterSpacing: 0.5
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
                                onClick={(event) => onTabChange(event, item.index)}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                        borderRight: '3px solid #6366f1',
                                        '&:hover': {
                                            backgroundColor: 'rgba(99, 102, 241, 0.25)',
                                        }
                                    },
                                    borderRadius: '0 4px 4px 0',
                                    mr: 2
                                }}
                            >
                                <ListItemIcon sx={{
                                    color: currentTab === item.index ? '#6366f1' : 'text.secondary',
                                    minWidth: 40
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: currentTab === item.index ? '600' : '400',
                                        color: currentTab === item.index ? '#fff' : 'text.secondary',
                                        fontSize: '0.95rem'
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
                        width: 34,
                        height: 34,
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    }}>
                        {getInitials(user?.username)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight={600} color="white" noWrap>
                            {user?.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
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
        </Drawer>
    );
};

export default Sidebar;
