import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import serverRoutes from './routes/serverRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import pluginRoutes from './routes/pluginRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import installerRoutes from './routes/installerRoutes.js';
import playitRoutes from './routes/playitRoutes.js';
import universeRoutes from './routes/universeRoutes.js';
import { validateToken } from './middleware/authMiddleware.js';
import { setupSocketHandlers } from './services/socketService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/installer', installerRoutes);

// Protected Routes
app.use('/api/server', validateToken, serverRoutes);
app.use('/api/files', validateToken, fileRoutes);
app.use('/api/plugins', validateToken, pluginRoutes);
app.use('/api/settings', validateToken, settingsRoutes);
app.use('/api/playit', validateToken, playitRoutes);
app.use('/api/universes', validateToken, universeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});