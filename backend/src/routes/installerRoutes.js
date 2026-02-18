import express from 'express';
import installerService from '../services/installerService.js';
import settingsService from '../services/settingsService.js';

const router = express.Router();

// Get current installation status
router.get('/status', (req, res) => {
    res.json(installerService.getStatus());
});

// Check prerequisites (if downloader binary exists)
router.get('/prerequisites', async (req, res) => {
    try {
        const result = await installerService.checkDownloaderAvailable();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download the tool automatically
router.post('/download-tool', async (req, res) => {
    try {
        await installerService.downloadTool();
        res.json({ message: 'Tool download started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the automatic download
router.post('/start', async (req, res) => {
    try {
        const { targetPath } = req.body;
        if (!targetPath) {
            return res.status(400).json({ error: 'Target path is required' });
        }

        await installerService.startDownload(targetPath);
        res.json({ message: 'Installation started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel the current process
router.post('/cancel', async (req, res) => {
    try {
        await installerService.cancelDownload();
        res.json({ message: 'Installation cancelled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get game version
router.get('/version', async (req, res) => {
    try {
        const settings = await settingsService.get();
        const result = await installerService.getGameVersion(settings.serverPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check for updates
router.get('/check-update', async (req, res) => {
    try {
        const result = await installerService.checkUpdate();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
