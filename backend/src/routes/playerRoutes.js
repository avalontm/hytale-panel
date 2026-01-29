import express from 'express';
import playerService from '../services/playerService.js';
import { validateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(validateToken);

router.get('/list', async (req, res) => {
    try {
        const players = await playerService.listPlayers();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:uuid', async (req, res) => {
    try {
        const player = await playerService.getPlayer(req.params.uuid);
        res.json(player);
    } catch (error) {
        res.status(404).json({ error: 'Player not found' });
    }
});

router.put('/:uuid', isAdmin, async (req, res) => {
    try {
        const updated = await playerService.updatePlayer(req.params.uuid, req.body);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
