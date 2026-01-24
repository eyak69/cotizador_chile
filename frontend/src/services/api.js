import axios from 'axios';

// Detectar base URL automáticamente (si estamos en dev con vite proxy: /, si no: /)
// Axios permite configurar base URL relativa.
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para manejo de errores global (opcional pero recomendado)
api.interceptors.response.use(
    response => response,
    error => {
        console.error("API Error:", error.response ? error.response.data : error.message);
        return Promise.reject(error);
    }
);

export const quotes = {
    getAll: () => api.get('/quotes'),
    getOne: (id) => api.get(`/quotes/${id}`),
    delete: (id) => api.delete(`/quotes/${id}`),
    downloadExcel: (id) => `/api/quotes/${id}/excel`, // Helper para URL directa
    downloadWord: (id) => `/api/quotes/${id}/word`   // Helper para URL directa
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
