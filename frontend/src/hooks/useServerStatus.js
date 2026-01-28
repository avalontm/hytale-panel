import { useState, useEffect } from 'react';
import { serverAPI } from '../services/api';
import socketService from '../services/socket';

export function useServerStatus() {
  const [status, setStatus] = useState('offline');
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState({
    uptime: '0d 00h 00m 00s',
    cpu: 0,
    memory: 0,
    tps: 20.0,
    players: { online: 0, max: 20 },
    version: 'Hytale 1.0.0',
    worldSize: '0 MB',
    playersOnline: 0,
    playersMax: 20
  });

  useEffect(() => {
    // Connect socket
    socketService.connect();

    // Get initial status
    serverAPI.getStatus()
      .then(response => {
        setStatus(response.data.status);
        if (response.data.config) {
          setConfig(response.data.config);
        }
        if (response.data.stats) {
          setStats(prev => ({ ...prev, ...response.data.stats }));
        }
      })
      .catch(error => {
        console.error('Failed to get server status:', error);
      });

    // Listen for status updates
    const handleStatus = (data) => {
      if (data.status) {
        setStatus(data.status);
      }
      if (data.config) {
        setConfig(data.config);
      }
    };

    const handleStats = (newStats) => {
      setStats(prev => ({ ...prev, ...newStats }));
    };

    socketService.on('status', handleStatus);
    socketService.on('stats', handleStats);

    // Cleanup
    return () => {
      socketService.off('status', handleStatus);
      socketService.off('stats', handleStats);
    };
  }, []);

  return {
    status,
    stats,
    config,
    players: stats.players
  };
}
