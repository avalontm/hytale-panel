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
        const arch = os.arch();

        let binaryName = 'playit';
        if (platform === 'win32') {
            binaryName = 'playit.exe';
        }

        const possiblePaths = [
            path.resolve('bin', binaryName),
            path.resolve('tools', binaryName),
            path.resolve(binaryName)
        ];

        for (const binaryPath of possiblePaths) {
            try {
                await fs.access(binaryPath);
                return binaryPath;
            } catch (e) {
                continue;
            }
        }

        return binaryName;
    }

    async loadSecretKey() {
        try {
            const secretPath = path.resolve('data/playit-secret.txt');
            this.secretKey = await fs.readFile(secretPath, 'utf8');
            this.secretKey = this.secretKey.trim();
            console.log('[PlayitService] Loaded existing secret key');
        } catch (e) {
            console.log('[PlayitService] No existing secret key found');
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

            const args = [];

            if (this.secretKey) {
                args.push('--secret', this.secretKey);
            }

            this.status = 'connecting';
            this.readingOutput = true;
            this.emit('statusChange', 'connecting');

            this.process = spawn(binaryPath, args, {
                stdio: ['pipe', 'pipe', 'pipe']
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
                this.emit('error', error.message);
            });

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

            const tunnelMatch = line.match(/([a-z0-9-]+\.gl\.at\.ply\.gg):(\d+)\s*=>\s*127\.0\.0\.1:(\d+)/i);
            if (tunnelMatch) {
                this.tunnelInfo = {
                    domain: tunnelMatch[1],
                    port: tunnelMatch[2],
                    ip: tunnelMatch[1],
                    localPort: tunnelMatch[3]
                };

                this.status = 'connected';
                this.readingOutput = false;
                this.emit('statusChange', 'connected');
                this.emit('tunnelEstablished', this.tunnelInfo);

                console.log('[PlayitService] Tunnel established:', this.tunnelInfo);
                console.log('[PlayitService] Stopping log output, process remains active');
                return;
            }

            const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
            if (ipMatch && clean.includes('tunnel')) {
                this.tunnelInfo.ip = ipMatch[1];
                this.tunnelInfo.port = ipMatch[2];
            }

            if (clean.includes('verified') || clean.includes('authenticated')) {
                console.log('[PlayitService] Authentication verified');
            }

            if (clean.includes('error') || clean.includes('failed')) {
                console.error('[PlayitService] Error in output:', line);
                this.emit('error', line);
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