import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token JWT automáticamente a cada petición
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Interceptor para manejo de errores global
api.interceptors.response.use(
    response => response,
    error => {
        console.error("API Error:", error.response ? error.response.data : error.message);
        // Si el token venció o es inválido, cerrar sesión
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const auth = {
    login: (data) => api.post('/auth/login', data).then(r => r.data),
    register: (data) => api.post('/auth/register', data).then(r => r.data),
    googleLogin: (data) => api.post('/auth/google', data).then(r => r.data),
    me: () => api.get('/auth/me').then(r => r.data),
    setupPassword: (setupToken, newPassword) =>
        api.post('/auth/setup-password', { setupToken, newPassword }).then(r => r.data),
};

const downloadFile = async (url, filename) => {
    try {
        const response = await api.get(url, { responseType: 'blob' });
        const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = urlBlob;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
        console.error("Download error:", error);
        throw error;
    }
};

export const quotes = {
    getAll: () => api.get('/quotes'),
    getOne: (id) => api.get(`/quotes/${id}`),
    delete: (id) => api.delete(`/quotes/${id}`),
    downloadExcel: (id) => downloadFile(`/quotes/${id}/excel`, `Cotizacion-${id}.xlsx`),
    downloadWord: (id) => downloadFile(`/quotes/${id}/word`, `Presupuesto_${id}.docx`)
};

export const config = {
    getAll: () => api.get('/config'),
    update: (data) => api.put('/config', data)
};

export const empresas = {
    getAll: () => api.get('/empresas'),
    create: (data) => api.post('/empresas', data),
    update: (id, data) => api.put(`/empresas/${id}`, data),
    delete: (id) => api.delete(`/empresas/${id}`)
};

export default api;
