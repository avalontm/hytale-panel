const parseSize = (sizeStr) => {
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  const match = sizeStr.trim().match(/^(\d+)\s*([a-zA-Z]*)$/);
  if (!match) return 100 * 1024 * 1024; // Default 100MB

  const value = parseInt(match[1]);
  let unit = match[2].toUpperCase() || 'B';
  if (unit && !units[unit]) {
    if (units[unit + 'B']) unit = unit + 'B';
    else if (unit.endsWith('B') && units[unit.slice(0, -1)]) unit = unit.slice(0, -1);
  }

  return value * (units[unit] || units[unit + 'B'] || 1);
};

export default {
  server: {
    // Path to Hytale server directory
    serverPath: process.env.SERVER_PATH || '/opt/hytale-server',

    // Command to start server
    startCommand: process.env.START_COMMAND || 'java -Xmx2G -Xms1G -jar hytale-server.jar nogui',

    // Server JAR file name
    jarFile: process.env.JAR_FILE || 'hytale-server.jar',

    // Plugins directory
    pluginsDir: process.env.PLUGINS_DIR || 'plugins',

    // Worlds directory
    worldsDir: process.env.WORLDS_DIR || 'worlds',

    // Backup directory
    backupDir: process.env.BACKUP_DIR || 'backups',

    // Max memory allocation
    maxMemory: process.env.MAX_MEMORY || '2G',

    // Min memory allocation
    minMemory: process.env.MIN_MEMORY || '1G'
  },

  // File upload settings
  upload: {
    maxFileSize: parseSize(process.env.MAX_FILE_SIZE || '100MB'),
    allowedTypes: ['.jar', '.yml', '.yaml', '.txt', '.json', '.properties']
  },

  // Auto-shutdown settings
  autoShutdown: {
    enabled: process.env.AUTO_SHUTDOWN === 'true',
    idleTime: parseInt(process.env.IDLE_TIME) || 300000 // 5 minutes
  }
};
