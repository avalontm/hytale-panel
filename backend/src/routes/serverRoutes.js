import express from 'express';
import serverService from '../services/serverService.js';

import hytaleConfigService from '../services/hytaleConfigService.js';

const router = express.Router();

// Get server status
router.get('/status', async (req, res) => {
  try {
    const status = serverService.getStatus();

    try {
      const config = await hytaleConfigService.get();
      // Merge config info into stats or a new field
      status.config = {
        motd: config.MOTD,
        maxPlayers: config.MaxPlayers,
        worldName: config.Defaults?.World || 'default',
        serverName: config.ServerName,
        version: `v${config.Version}`
      };

      // Update max players in stats if available
      if (status.stats.players) {
        status.stats.players.max = config.MaxPlayers;
      }
    } catch (err) {
      console.error("Failed to load config for status:", err.message);
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
router.post('/start', (req, res) => {
  try {
    console.log('[API] Received Start Server Request');
    const result = serverService.start();
    res.json(result);
  } catch (error) {
    console.error('[API] Start Server Failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Stop server
router.post('/stop', (req, res) => {
  try {
    const result = serverService.stop();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Restart server
router.post('/restart', (req, res) => {
  try {
    const result = serverService.restart();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send command
router.post('/command', (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    const result = serverService.sendCommand(command);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
