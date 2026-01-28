import express from 'express';
import settingsService from '../services/settingsService.js';
import hytaleConfigService from '../services/hytaleConfigService.js';

const router = express.Router();

// --- Panel Settings ---

router.get('/panel', async (req, res) => {
    try {
        const settings = await settingsService.get();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/panel', async (req, res) => {
    try {
        const settings = await settingsService.update(req.body);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Server Settings (config.json) ---

router.get('/server', async (req, res) => {
    try {
        const config = await hytaleConfigService.get();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/server', async (req, res) => {
    try {
        const config = await hytaleConfigService.update(req.body);
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Generic File Settings (bans, permissions, whitelist) ---

router.get('/files/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const content = await hytaleConfigService.getFile(filename);
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/files/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const content = await hytaleConfigService.saveFile(filename, req.body);
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
