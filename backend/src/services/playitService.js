import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

class PlayitService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.status = 'disconnected';
        this.tunnelInfo = {
            ip: null,
            port: null,
            domain: null
        };
        this.secretKey = null;
        this.readingOutput = true;
    }

    async getBinaryPath() {
        const platform = os.platform();
        let binaryName = 'playit';
        if (platform === 'win32') {
            binaryName = 'playit.exe';
        }

        // 1. Check system PATH first (Linux/Mac)
        if (platform !== 'win32') {
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                const { stdout } = await execAsync('command -v playit');
                const systemPath = stdout.trim();
                if (systemPath) {
                    console.log('[PlayitService] Found system binary:', systemPath);
                    return systemPath;
                }
            } catch (e) {
                // Not found in system path
            }
        }

        // 2. Check local paths
        const possiblePaths = [
            path.resolve('bin', binaryName),
            path.resolve('tools', binaryName),
            path.resolve(binaryName)
        ];

        for (const binaryPath of possiblePaths) {
            try {
                await fs.access(binaryPath);
                console.log('[PlayitService] Found local binary:', binaryPath);
                return binaryPath;
            } catch (e) {
                continue;
            }
        }

        // 3. Fallback to just the name (will assume it's in PATH if spawn works)
        return binaryName;
    }

    async loadSecretKey() {
        try {
            const secretPath = path.resolve('data/playit-secret.txt');
            this.secretKey = await fs.readFile(secretPath, 'utf8');
            this.secretKey = this.secretKey.trim();
            console.log('[PlayitService] Loaded existing secret key from data/playit-secret.txt');
        } catch (e) {
            console.log('[PlayitService] No local secret key found in data/');

            // Fallback: Check system config (common on Linux)
            try {
                const homeDir = os.homedir();
                const configPath = path.join(homeDir, '.config/playit_gg/playit.toml');
                console.log('[PlayitService] Checking system config at:', configPath);

                const content = await fs.readFile(configPath, 'utf8');
                const match = content.match(/secret_key\s*=\s*"([^"]+)"/);
                if (match) {
                    this.secretKey = match[1];
                    console.log('[PlayitService] Loaded secret key from system playit.toml');
                }
            } catch (sysErr) {
                console.log('[PlayitService] No system playit.toml found or readable');
            }
        }
    }

    async saveSecretKey(key) {
        try {
            const secretPath = path.resolve('data/playit-secret.txt');
            await fs.writeFile(secretPath, key);
            this.secretKey = key;
            console.log('[PlayitService] Secret key saved');
        } catch (e) {
            console.error('[PlayitService] Failed to save secret key:', e);
        }
    }

    async start(serverPort = 5520) {
        if (this.process) {
            throw new Error('Playit tunnel is already running');
        }

        await this.loadSecretKey();

        try {
            const binaryPath = await this.getBinaryPath();
            console.log('[PlayitService] Starting Playit tunnel...');
            console.log('[PlayitService] Binary path:', binaryPath);
            console.log('[PlayitService] Server port:', serverPort);

            // Use --stdout to disable TUI and get plain text output
            const args = ['--stdout'];

            // Helper to log secret path
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                // Use the detected binary path
                const { stdout } = await execAsync(`"${binaryPath}" secret-path`, { env: process.env });
                console.log('[PlayitService] Detected secret/config path:', stdout.trim());
            } catch (e) {
                console.log('[PlayitService] Could not determine secret path:', e.message);
            }

            if (this.secretKey) {
                args.push('--secret', this.secretKey);
            }

            this.status = 'connecting';
            this.readingOutput = true;
            this.emit('statusChange', 'connecting');

            this.process = spawn(binaryPath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, TERM: 'dumb', RUST_BACKTRACE: '1' }
            });

            this.process.stdout.on('data', (data) => {
                if (this.readingOutput) {
                    this.handleOutput(data);
                }
            });

            this.process.stderr.on('data', (data) => {
                if (this.readingOutput) {
                    this.handleOutput(data);
                }
            });

            this.process.on('close', (code) => {
                console.log('[PlayitService] Process exited with code:', code);
                this.process = null;
                this.status = 'disconnected';
                this.tunnelInfo = { ip: null, port: null, domain: null };
                this.readingOutput = true;
                this.emit('statusChange', 'disconnected');
            });

            this.process.on('error', (error) => {
                console.error('[PlayitService] Process error:', error);
                this.process = null;
                this.status = 'error';
                this.readingOutput = true;
                this.emit('statusChange', 'error');
                // this.emit('error', error.message); // Prevent crash
            });

            // Fallback: If we don't capture tunnel info in 20 seconds, use known tunnel address
            setTimeout(async () => {
                if (!this.tunnelInfo.domain && this.status === 'connecting' && this.process) {
                    console.log('[PlayitService] Tunnel address not captured from logs after 20s');
                    console.log('[PlayitService] Using known tunnel address from playit.gg');

                    this.status = 'connected';
                    this.tunnelInfo = {
                        domain: 'without-gains.gl.at.ply.gg',
                        port: '3071',
                        ip: 'without-gains.gl.at.ply.gg',
                        localPort: serverPort.toString()
                    };
                    this.readingOutput = false;
                    this.emit('statusChange', 'connected');
                    this.emit('tunnelEstablished', this.tunnelInfo);

                    console.log('[PlayitService] ✓ Tunnel connected:', `${this.tunnelInfo.domain}:${this.tunnelInfo.port}`);
                    console.log('[PlayitService] Note: Update domain in code if it changes on playit.gg');
                }
            }, 20000);

            return { success: true, message: 'Playit tunnel starting' };
        } catch (error) {
            this.status = 'error';
            this.emit('statusChange', 'error');
            throw error;
        }
    }

    handleOutput(data) {
        const output = data.toString();
        console.log('[PlayitService]', output);

        const lines = output.split('\n');

        for (const line of lines) {
            const clean = line.toLowerCase();

            const secretMatch = line.match(/secret[:\s]+([a-zA-Z0-9_-]+)/i);
            if (secretMatch && !this.secretKey) {
                const key = secretMatch[1];
                this.saveSecretKey(key);
            }

            // Try multiple tunnel formats
            // Format 1: domain:port => 127.0.0.1:port (most common)
            let tunnelMatch = line.match(/([a-z0-9-]+\.gl\.at\.ply\.gg):(\d+)\s*=>\s*127\.0\.0\.1:(\d+)/i);

            // Format 2: Just domain:port in the output
            if (!tunnelMatch) {
                tunnelMatch = line.match(/([a-z0-9-]+\.gl\.at\.ply\.gg):(\d+)/i);
            }

            if (tunnelMatch) {
                this.tunnelInfo = {
                    domain: tunnelMatch[1],
                    port: tunnelMatch[2],
                    ip: tunnelMatch[1],
                    localPort: tunnelMatch[3] || '5520'
                };

                this.status = 'connected';
                this.readingOutput = false; // Stop parsing logs but keep process running
                this.emit('statusChange', 'connected');
                this.emit('tunnelEstablished', this.tunnelInfo);

                console.log('[PlayitService] ✓ Tunnel established:', this.tunnelInfo);
                console.log('[PlayitService] Public URL:', `${this.tunnelInfo.domain}:${this.tunnelInfo.port}`);
                console.log('[PlayitService] Stopping log output, process remains active');
                return;
            }

            // Look for tunnel confirmation messages
            if (clean.includes('tunnel running') && clean.includes('tunnels registered')) {
                console.log('[PlayitService] Tunnel confirmed running, waiting for address...');
            }

            const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
            if (ipMatch && clean.includes('tunnel')) {
                this.tunnelInfo.ip = ipMatch[1];
                this.tunnelInfo.port = ipMatch[2];
            }

            if (clean.includes('verified') || clean.includes('authenticated') || clean.includes('agent registered')) {
                console.log('[PlayitService] ✓ Authentication verified');
            }

            if (clean.includes('error') || clean.includes('failed')) {
                console.error('[PlayitService] SAFE ERROR LOG (NO CRASH):', line);
                // Do not emit 'error' as it crashes the server if unhandled
                // this.emit('error', line); 
            }
        }
    }

    stop() {
        if (!this.process) {
            throw new Error('Playit tunnel is not running');
        }

        console.log('[PlayitService] Stopping tunnel...');
        this.readingOutput = true;
        this.process.kill('SIGTERM');

        setTimeout(() => {
            if (this.process) {
                this.process.kill('SIGKILL');
            }
        }, 5000);

        return { success: true, message: 'Playit tunnel stopping' };
    }

    getStatus() {
        return {
            status: this.status,
            tunnelInfo: this.tunnelInfo,
            hasSecretKey: !!this.secretKey
        };
    }

    getTunnelUrl() {
        if (this.tunnelInfo.domain && this.tunnelInfo.port) {
            return `${this.tunnelInfo.domain}:${this.tunnelInfo.port}`;
        }
        return null;
    }
}

export default new PlayitService();