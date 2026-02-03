import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid, clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Server API
export const serverAPI = {
  getStatus: () => api.get('/server/status'),
  start: () => api.post('/server/start'),
  stop: () => api.post('/server/stop'),
  restart: () => api.post('/server/restart'),
  sendCommand: (command) => api.post('/server/command', { command })
};

// File API
export const fileAPI = {
  list: (directory = '') => api.get('/files/list', { params: { directory } }),
  read: (path) => api.get('/files/read', { params: { path } }),
  write: (path, content) => api.post('/files/write', { path, content }),
  delete: (path) => api.delete('/files/delete', { data: { path } }),
  createDirectory: (path) => api.post('/files/mkdir', { path }),
  upload: (path, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    });
  }
};

// Plugin API
export const pluginAPI = {
  list: () => api.get('/plugins/list'),
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('plugin', file);
    return api.post('/plugins/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    });
  },
  delete: (name) => api.delete('/plugins/delete', { data: { name } }),
  search: (provider, query) => api.get('/plugins/search', { params: { provider, query } }),
  getDownloadUrl: (provider, modId, fileId) => api.get('/plugins/download-url', { params: { provider, modId, fileId } }),
  installRemote: (url, filename, metadata) => api.post('/plugins/install-remote', { url, filename, metadata })
};

// Playit API
export const playitAPI = {
  getStatus: () => api.get('/playit/status'),
  start: () => api.post('/playit/start'),
  stop: () => api.post('/playit/stop'),
  getUrl: () => api.get('/playit/url')
};

// Universe API
export const universeAPI = {
  list: () => api.get('/universes')
};

// User API
export const userAPI = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleActive: (id) => api.post(`/users/${id}/toggle-active`)
};

// Player API
export const playerAPI = {
  list: () => api.get('/players/list'),
  get: (uuid) => api.get(`/players/${uuid}`),
  update: (uuid, data) => api.put(`/players/${uuid}`, data)
};

export default api;