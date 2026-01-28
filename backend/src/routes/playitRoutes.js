import express from 'express';
import playitService from '../services/playitService.js';
import settingsService from '../services/settingsService.js';

const router = express.Router();

// Get tunnel status
router.get('/status', (req, res) => {
    const status = playitService.getStatus();
    res.json(status);
});

// Start tunnel
router.post('/start', async (req, res) => {
    try {
        // Get server port from settings
        const settings = await settingsService.get();
        const serverPort = settings.port || 5520;

        const result = await playitService.start(serverPort);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop tunnel
router.post('/stop', (req, res) => {
    try {
        const result = playitService.stop();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tunnel URL
router.get('/url', (req, res) => {
    const url = playitService.getTunnelUrl();
    if (url) {
        res.json({ url });
    } else {
        res.status(404).json({ error: 'No active tunnel' });
    }
});

export default router;