import express from 'express';
import authService from '../services/authService.js';
import userService from '../services/userService.js';
import settingsService from '../services/settingsService.js';

const router = express.Router();

router.get('/detect-system', async (req, res) => {
    try {
        const info = await settingsService.detectSystem();
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/setup-needed', async (req, res) => {
    try {
        const needed = await userService.needsSetup();
        res.json({ needed });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/setup', async (req, res) => {
    try {
        const user = await authService.setup(req.body);
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { user, password } = req.body;
        const result = await authService.login(user, password);
        res.json(result);
    } catch (error) {
        console.error('Login Error:', error);
        // Return generic error to client to hide system paths
        // unless it's a specific auth error we want to show
        if (error.message.includes('Invalid') || error.message.includes('required')) {
            res.status(401).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An internal error occurred. Please check server console.' });
        }
    }
});

export default router;
