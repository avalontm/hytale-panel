import express from 'express';
import universeService from '../services/universeService.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const universes = await universeService.listUniverses();
        res.json(universes);
    } catch (error) {
        console.error('[UniverseRoutes] Error listing universes:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
