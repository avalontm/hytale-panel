import express from 'express';
import userService from '../services/userService.js';
import { validateToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user routes require authentication
router.use(validateToken);

router.get('/', async (req, res) => {
    try {
        const users = await userService.getAll();
        // Strip passwords before sending
        const safeUsers = users.map(({ password, ...rest }) => rest);
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', isAdmin, async (req, res) => {
    try {
        const user = await userService.create(req.body);
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', isAdmin, async (req, res) => {
    try {
        const user = await userService.update(req.params.id, req.body);
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await userService.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/:id/toggle-active', isAdmin, async (req, res) => {
    try {
        const users = await userService.getAll();
        const user = users.find(u => u.id === req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const updated = await userService.update(user.id, { active: !user.active });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
