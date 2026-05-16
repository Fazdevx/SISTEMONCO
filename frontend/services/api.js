import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Interceptor para agregar token JWT a las peticiones
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error al obtener sesión:', error);
  }
  return config;
});


// --- MÉTODOS DE API ---

export const mammographyApi = {
  getAll: (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/mammographies?${params.toString()}`);
  },
  getById: (id) => api.get(`/mammographies/${id}`),
  create: (data) => api.post('/mammographies', data),
  update: (id, data) => api.put(`/mammographies/${id}`, data),
  delete: (id) => api.delete(`/mammographies/${id}`),
  getStats: () => api.get('/mammographies/stats/dashboard'),
};

export const userApi = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const establishmentApi = {
  getMicroredes: () => api.get('/microredes/microredes'),
  getEstablecimientos: () => api.get('/establecimientos/establecimientos'),
};

export default api;
 