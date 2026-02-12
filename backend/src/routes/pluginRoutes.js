import express from 'express';
import multer from 'multer';
import pluginService from '../services/pluginService.js';

import config from '../config/config.js';
import os from 'os';
import fs from 'fs/promises';

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: config.upload.maxFileSize }
});

// List all plugins
router.get('/list', async (req, res) => {
  try {
    const plugins = await pluginService.listPlugins();
    res.json(plugins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload plugin
router.post('/upload', upload.single('plugin'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Plugin file is required' });
    }

    const result = await pluginService.uploadPlugin(
      req.file.originalname,
      req.file.path
    );
    // Clean up temporary file
    await fs.unlink(req.file.path).catch(console.error);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete plugin
router.delete('/delete', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Plugin name is required' });
    }

    const result = await pluginService.deletePlugin(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search Mods (Provider)
router.get('/search', async (req, res) => {
  try {
    const { provider, query } = req.query;
    if (!provider) return res.status(400).json({ error: 'Provider is required' });

    // Import service dynamically or check import
    const modProviderService = (await import('../services/modProviderService.js')).default;
    const results = await modProviderService.search(provider, query || '');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get Download URL (Provider)
router.get('/download-url', async (req, res) => {
  try {
    const { provider, modId, fileId } = req.query;
    if (!provider || !modId || !fileId) return res.status(400).json({ error: 'Missing parameters' });

    const modProviderService = (await import('../services/modProviderService.js')).default;
    const url = await modProviderService.getDownloadUrl(provider, modId, fileId);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Install from URL
router.post('/install-remote', async (req, res) => {
  try {
    const { url, filename, metadata } = req.body;
    if (!url || !filename) return res.status(400).json({ error: 'URL and filename required' });

    await pluginService.installFromUrl(url, filename, metadata);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
