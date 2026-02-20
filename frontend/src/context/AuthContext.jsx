import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registrationOpen, setRegistrationOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        // Consultar si el registro está abierto (sin autenticación)
        axios.get('/api/auth/status')
            .then(res => setRegistrationOpen(res.data.open))
            .catch(() => setRegistrationOpen(false));
        setLoading(false);
    }, []);

    const setSession = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const login = async (email, password) => {
        const data = await auth.login({ email, password });
        // Si el backend pide setup de contraseña, NO hacemos setSession
        if (data.needsSetup) return data;
        setSession(data);
        return data;
    };

    const register = async (email, password, displayName) => {
        const data = await auth.register({ email, password, displayName });
        setSession(data);
        return data;
    };

    const googleLogin = async (payload) => {
        const data = await auth.googleLogin(payload);
        setSession(data);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading, registrationOpen }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
