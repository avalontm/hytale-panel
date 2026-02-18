import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import serverRoutes from './routes/serverRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import pluginRoutes from './routes/pluginRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import installerRoutes from './routes/installerRoutes.js';
import playitRoutes from './routes/playitRoutes.js';
import universeRoutes from './routes/universeRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import multer from 'multer';
import { validateToken } from './middleware/authMiddleware.js';
import { setupSocketHandlers } from './services/socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const isLocalNetwork = (origin) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Check for localhost/127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    // Check for 192.168.x.x
    if (hostname.startsWith('192.168.')) return true;

    // Check for 10.x.x.x
    if (hostname.startsWith('10.')) return true;

    // Check for 172.16-31.x.x
    if (hostname.startsWith('172.')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const secondPart = parseInt(parts[1], 10);
        return secondPart >= 16 && secondPart <= 31;
      }
    }

    return false;
  } catch (e) {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow if it's in allowedOrigins, if it's local network, or if it's undefined (like postman or same-origin)
    if (!origin || allowedOrigins.includes(origin) || isLocalNetwork(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

const io = new Server(httpServer, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '100MB' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '100MB' }));

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
app.use('/api/players', validateToken, playerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `File is too large. Max limit is ${process.env.MAX_FILE_SIZE || '100MB'}`
      });
    }
    return res.status(400).json({ error: err.message });
  }

  console.error('[Error Handler]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});