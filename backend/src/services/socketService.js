import serverService from './serverService.js';
import hytaleConfigService from './hytaleConfigService.js';
import installerService from './installerService.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Helper to send full status
    const sendStatus = async () => {
      const status = serverService.getStatus();
      try {
        const config = await hytaleConfigService.get();
        status.config = {
          motd: config.MOTD,
          maxPlayers: config.MaxPlayers,
          worldName: config.Defaults?.World || 'default',
          serverName: config.ServerName,
          version: `v${config.Version}`
        };
        if (status.stats.players) {
          status.stats.players.max = config.MaxPlayers;
        }
      } catch (err) {
        // Silently skip config if it fails
      }
      socket.emit('status', status);
    };

    // Send initial status
    sendStatus();
    socket.emit('consoleHistory', serverService.logs);

    // Listen for server status changes
    const statusHandler = () => {
      sendStatus();
    };

    // Listen for console output
    const consoleHandler = (data) => {
      socket.emit('console', data);
    };

    // Listen for stats updates
    const statsHandler = (stats) => {
      socket.emit('stats', stats);
    };

    // Listen for auth requests
    const authRequestHandler = (data) => {
      socket.emit('authRequest', data);
    };
    const installerAuthHandler = (data) => {
      socket.emit('authRequest', data);
    };

    // Listen for start errors
    const startErrorHandler = (error) => {
      socket.emit('startError', error);
    };

    // Register listeners
    serverService.on('statusChange', statusHandler);
    serverService.on('console', consoleHandler);
    serverService.on('stats', statsHandler);
    serverService.on('authRequest', authRequestHandler);
    serverService.on('startError', startErrorHandler);

    // Installer listeners
    installerService.on('authRequest', installerAuthHandler);

    // Handle console commands from client
    socket.on('command', (command) => {
      try {
        serverService.sendCommand(command);
      } catch (error) {
        socket.emit('error', error.message);
      }
    });

    // Handle history requests
    socket.on('getConsoleHistory', () => {
      socket.emit('consoleHistory', serverService.logs);
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      serverService.off('statusChange', statusHandler);
      serverService.off('console', consoleHandler);
      serverService.off('stats', statsHandler);
      serverService.off('authRequest', authRequestHandler);
      serverService.off('startError', startErrorHandler);

      installerService.off('authRequest', installerAuthHandler);
    });
  });
}