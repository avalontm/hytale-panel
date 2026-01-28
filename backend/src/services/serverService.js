import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import pidusage from 'pidusage';
import settingsService from './settingsService.js';

class ServerService extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.status = 'offline';
    this.stats = {
      uptime: 0,
      cpu: 0,
      memory: 0,
      tps: 20.0,
      players: { online: 0, max: 20 },
      authFileExists: false
    };
    this.logs = [];
    this.MAX_LOGS = 1000;
    this.startTime = null;
    this.statsInterval = null;
    this.checkPidFile();
  }

  addLog(data) {
    const line = data.toString();
    this.logs.push(line);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
    this.emit('console', line);
    return line.replace(/\x1B\[[0-9;]*[mK]/g, '');
  }

  async checkPidFile() {
    try {
      const pidPath = path.resolve('data/server.pid');
      const pid = await fs.readFile(pidPath, 'utf8');

      if (pid) {
        try {
          process.kill(parseInt(pid), 0);
          console.log(`[ServerService] Found running server process with PID ${pid}`);
          this.status = 'online';
          this.pid = parseInt(pid);
          this.startTime = Date.now();
          this.startStatsCollection();
          this.emit('statusChange', 'online');
        } catch (e) {
          console.log('[ServerService] PID file exists but process is dead. Cleaning up.');
          await fs.unlink(pidPath).catch(() => { });
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('[ServerService] Failed to read PID file:', e.message);
      }
      // No pid file or error reading it
    }
  }

  async start() {
    if (this.status === 'online' || this.process) {
      throw new Error('Server is already running');
    }

    try {
      const settings = await settingsService.get();

      if (!settings.serverPath) {
        throw new Error('Server path is not configured. Please go to Settings.');
      }

      this.status = 'starting';
      this.emit('statusChange', 'starting');

      const startCommand = settings.startCommand.split(' ');
      // Use configured java path if available and valid, otherwise fallback to the first part of startCommand
      const command = (settings.javaPath && settings.javaPath.trim()) ? settings.javaPath.trim() : startCommand[0];
      const args = startCommand.slice(1);

      console.log(`[ServerService] Spawning: ${command} ${args.join(' ')}`);

      this.process = spawn(command, args, {
        cwd: settings.serverPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.startTime = Date.now();

      if (this.process.pid) {
        try {
          await fs.writeFile(path.resolve('data/server.pid'), this.process.pid.toString());
        } catch (e) {
          console.error('[ServerService] CRITICAL: Failed to save PID file. Check permissions for data/ directory:', e.message);
        }
      } else {
        console.error('[ServerService] Process spawned but no PID generated. This usually means the executable was not found.');
      }

      this.process.on('error', (err) => {
        console.error('[ServerService] Failed to start server process:', err.message);
        let userMessage = 'Failed to start server: ' + err.message;

        if (err.code === 'ENOENT') {
          const msg = 'Could not find the "java" executable. Is Java installed and in your PATH?';
          this.addLog('[Error] ' + msg);
          userMessage = msg;
        }

        this.status = 'offline';
        this.emit('statusChange', 'offline');
        this.emit('startError', userMessage);
      });

      const handleOutput = (data) => {
        const output = this.addLog(data);
        const clean = output.toLowerCase();

        // Parse server ready state
        if (
          clean.includes('done!') ||
          clean.includes('server started') ||
          clean.includes('universe ready') ||
          clean.includes('hytale server booted')
        ) {
          if (this.status !== 'online') {
            console.log(`[ServerService] Server detected as ONLINE via logs`);
            this.status = 'online';
            this.emit('statusChange', 'online');
          }
        }

        // Player join detection - Hytale format
        const joinMatch = output.match(/\[Universe\|P\]\s+Adding player\s+'([^']+)'\s+\(([a-f0-9-]+)\)/i);
        if (joinMatch) {
          const playerName = joinMatch[1];
          this.stats.players.online++;
          console.log(`[ServerService] Player joined: ${playerName} (${this.stats.players.online}/${this.stats.players.max})`);
          this.emit('stats', { ...this.stats });
        }

        // Alternative join detection - when player joins world
        const worldJoinMatch = output.match(/\[World\|[^\]]+\]\s+Player\s+'([^']+)'\s+joined world/i);
        if (worldJoinMatch && !joinMatch) {
          const playerName = worldJoinMatch[1];
          this.stats.players.online++;
          console.log(`[ServerService] Player joined world: ${playerName} (${this.stats.players.online}/${this.stats.players.max})`);
          this.emit('stats', { ...this.stats });
        }

        // Player leave detection - Hytale format
        const leaveMatch = output.match(/\[Universe\|P\]\s+Removing player\s+'([^']+)'/i) ||
          output.match(/\[World\|[^\]]+\]\s+Player\s+'([^']+)'\s+left/i) ||
          output.match(/Player\s+'([^']+)'\s+disconnected/i);

        if (leaveMatch) {
          const playerName = leaveMatch[1];
          this.stats.players.online = Math.max(0, this.stats.players.online - 1);
          console.log(`[ServerService] Player left: ${playerName} (${this.stats.players.online}/${this.stats.players.max})`);
          this.emit('stats', { ...this.stats });
        }

        if (clean.includes('no server tokens configured') && !this.stats.authFileExists) {
          console.log('[ServerService] Auth token check failed. Auto-sending "/auth login device"...');
          setTimeout(() => {
            this.sendCommand('/auth login device');
          }, 1000);
        }

        // Detect Auth URL and Code
        const authUrlPattern = /(https?:\/\/(?:oauth\.)?accounts\.hytale\.com\/(?:oauth2\/)?device(?:\/verify)?(?:\?user_code=[A-Za-z0-9]+)?)/i;
        const authCodePatterns = [
          /(?:Authorization code|Enter code|user_code):\s*([A-Za-z0-9]{4,})/i,
          /code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i,
          /user_code[=:]\s*([A-Za-z0-9]+)/i
        ];

        const urlMatch = output.match(authUrlPattern);
        let codeMatch = null;

        for (const pattern of authCodePatterns) {
          codeMatch = output.match(pattern);
          if (codeMatch) break;
        }

        if (urlMatch || codeMatch) {
          const deviceCode = codeMatch ? codeMatch[1] : null;
          const baseUrl = 'https://oauth.accounts.hytale.com/oauth2/device/verify';

          const authData = {
            verificationUrl: deviceCode ? `${baseUrl}?user_code=${deviceCode}` : baseUrl,
            deviceCode: deviceCode
          };

          if (authData.deviceCode || authData.verificationUrl) {
            console.log('[ServerService] Detected Auth Request:', authData);
            this.emit('authRequest', authData);
          }
        }

        // Detect authentication success
        if (clean.includes('authentication successful') || clean.includes('authorized')) {
          console.log('[ServerService] Authentication successful!');
          this.emit('authRequest', { success: true });

          console.log('[ServerService] Setting encrypted auth persistence...');
          setTimeout(() => {
            this.sendCommand('auth persistence Encrypted');
          }, 1000);
        }

        // Detect persistence change confirmation
        if (clean.includes('swapped credential store to: encryptedauthcredentialstoreprovider')) {
          console.log('[ServerService] Auth persistence set to Encrypted successfully!');
          this.addLog('[Panel] Authentication configured with encrypted persistence. Server will remember credentials on restart.\n');
        }
      };

      this.process.stdout.on('data', handleOutput);
      this.process.stderr.on('data', handleOutput);

      this.process.on('close', async (code) => {
        this.status = 'offline';
        this.process = null;
        this.startTime = null;

        try {
          await fs.unlink(path.resolve('data/server.pid')).catch(() => { });
        } catch (e) { }

        this.emit('statusChange', 'offline');
        this.addLog(`Server stopped with code ${code}\n`);

        if (this.statsInterval) {
          clearInterval(this.statsInterval);
          this.statsInterval = null;
        }
      });

      this.startStatsCollection();

      return { success: true, message: 'Server starting' };
    } catch (error) {
      this.status = 'offline';
      this.emit('statusChange', 'offline');
      throw error;
    }
  }

  stop() {
    if (this.status !== 'online' && !this.process) {
      throw new Error('Server is not running');
    }

    if (this.process) {
      this.sendCommand('stop');
      setTimeout(() => {
        if (this.process) this.process.kill('SIGTERM');
      }, 30000);
    } else if (this.pid) {
      console.log(`[ServerService] Stopping orphaned process ${this.pid}`);
      try {
        process.kill(this.pid, 'SIGTERM');
      } catch (e) {
        console.error("Failed to kill PID:", e);
      }

      this.status = 'offline';
      this.emit('statusChange', 'offline');
      fs.unlink(path.resolve('data/server.pid')).catch(() => { });
    }

    return { success: true, message: 'Server stopping' };
  }

  async restart() {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return this.start();
  }

  sendCommand(command) {
    if (!this.process) {
      throw new Error('Cannot send command to detached process (logs only). Restart panel to regain control, or just wait.');
    }
    this.process.stdin.write(command + '\n');
    return { success: true };
  }

  getStatus() {
    return {
      status: this.status,
      stats: this.stats
    };
  }

  startStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(async () => {
      let targetPid = this.process ? this.process.pid : this.pid;

      if (!targetPid) return;

      if (!this.startTime) {
        this.startTime = Date.now();
      }

      try {
        const settings = await settingsService.get();
        if (settings.serverPath) {
          try {
            await fs.access(path.join(settings.serverPath, 'auth.enc'));
            this.stats.authFileExists = true;
          } catch {
            this.stats.authFileExists = false;
          }
        }

        const usage = await pidusage(targetPid).catch(() => ({ cpu: 0, memory: 0 }));

        const uptimeMs = Date.now() - this.startTime;
        const totalSeconds = Math.floor(uptimeMs / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n) => n.toString().padStart(2, '0');
        const uptimeStr = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

        this.stats = {
          ...this.stats,
          uptime: uptimeStr,
          cpu: Math.round(usage.cpu),
          memory: Math.round(usage.memory / 1024 / 1024)
        };

        this.emit('stats', { ...this.stats });
      } catch (error) {
        // Silently handle errors
      }
    }, 2000);
  }
}

export default new ServerService();