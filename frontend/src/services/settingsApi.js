import api from './api';

export const getPanelSettings = async () => {
    const response = await api.get('/settings/panel');
    return response.data;
};

export const savePanelSettings = async (settings) => {
    const response = await api.post('/settings/panel', settings);
    return response.data;
};

export const getServerSettings = async () => {
    const response = await api.get('/settings/server');
    return response.data;
};

export const saveServerSettings = async (settings) => {
    const response = await api.post('/settings/server', settings);
    return response.data;
};

export const getFileSettings = async (filename) => {
    const response = await api.get(`/settings/files/${filename}`);
    return response.data;
};

export const saveFileSettings = async (filename, content) => {
    const response = await api.post(`/settings/files/${filename}`, content);
    return response.data;
};
