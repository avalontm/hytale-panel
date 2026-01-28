import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BIN_DIR = path.join(__dirname, '../../bin');

class InstallerService {
    constructor() {
        this.currentProcess = null;
        this.status = {
            state: 'idle', // idle, downloading_tool, authenticating, downloading_game, finished, error
            deviceCode: null,
            verificationUrl: null,
            progress: 0,
            error: null,
            logs: []
        };
        this.outputBuffer = '';
    }

    getStatus() {
        return this.status;
    }

    async ensureBinDir() {
        try {
            await fs.access(BIN_DIR);
        } catch {
            await fs.mkdir(BIN_DIR, { recursive: true });
        }
    }

    getBinaryName() {
        const platform = process.platform;
        if (platform === 'win32') return 'hytale-downloader-windows-amd64.exe';
        if (platform === 'linux') return 'hytale-downloader-linux-amd64';
        return null;
    }

    async checkDownloaderAvailable() {
        const binName = this.getBinaryName();
        if (!binName) return { available: false, platform: process.platform, error: 'Unsupported platform' };

        const binPath = path.join(BIN_DIR, binName);
        try {
            await fs.access(binPath);
            return { available: true, platform: process.platform };
        } catch {
            return { available: false, platform: process.platform, error: 'Binary not found' };
        }
    }

    async downloadTool() {
        if (this.status.state !== 'idle' && this.status.state !== 'error' && this.status.state !== 'tool_installed') {
            throw new Error('Another process is running'); // Prevent collision
        }

        const binName = this.getBinaryName();
        if (!binName) throw new Error('Unsupported platform');

        this.status.state = 'downloading_tool';
        this.status.progress = 0;
        this.status.logs = ['Starting download...'];
        this.status.error = null;

        try {
            await this.ensureBinDir();
            const zipPath = path.join(BIN_DIR, 'hytale-downloader.zip');
            const downloadUrl = 'https://downloader.hytale.com/hytale-downloader.zip';

            // Download file
            this.status.logs.push(`Downloading from ${downloadUrl}...`);
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error(`Failed to download tool: ${response.statusText}`);

            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            let loaded = 0;

            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                if (total) {
                    this.status.progress = Math.round((loaded / total) * 50); // Download is first 50%
                }
            }

            const buffer = Buffer.concat(chunks);
            await fs.writeFile(zipPath, buffer);

            this.status.progress = 50;
            this.status.state = 'extracting_tool';
            this.status.logs.push('Download complete. Extracting...');

            // Extract
            const AdmZip = (await import('adm-zip')).default;
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(BIN_DIR, true);
            this.status.progress = 80;

            // Cleanup
            await fs.unlink(zipPath);
            this.status.progress = 90;

            // Allow execution on Linux/Mac
            if (process.platform !== 'win32') {
                const binPath = path.join(BIN_DIR, binName);
                await fs.chmod(binPath, 0o755);
            }

            this.status.progress = 100;
            this.status.state = 'tool_installed';
            this.status.logs.push('Hytale Downloader installed successfully.');
            return { success: true };

        } catch (error) {
            this.status.state = 'error';
            this.status.error = error.message;
            this.status.logs.push(`Error: ${error.message}`);
            throw error;
        }
    }

    parseDeviceAuthOutput(text) {
        // Match the actual format from hytale-downloader:
        // https://oauth.accounts.hytale.com/oauth2/device/verify?user_code=caHcKDCE
        // Authorization code: caHcKDCE

        let url = null;
        let code = null;

        // Extract URL with user_code parameter
        const urlWithCodePattern = /(https?:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify\?user_code=[A-Za-z0-9]+)/i;
        const urlMatch = text.match(urlWithCodePattern);
        if (urlMatch) {
            url = urlMatch[1];
        }

        // If no URL with code, try to get the base URL
        if (!url) {
            const baseUrlPattern = /(https?:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify)/i;
            const baseMatch = text.match(baseUrlPattern);
            if (baseMatch) {
                url = baseMatch[1];
            }
        }

        // Extract authorization code
        // Matches: "Authorization code: caHcKDCE" or "Enter code: ABCD-1234" or "user_code=caHcKDCE"
        const codePatterns = [
            /Authorization code:\s*([A-Za-z0-9]+)/i,
            /Enter code:\s*([A-Za-z0-9-]+)/i,
            /user_code[=:]\s*([A-Za-z0-9]+)/i
        ];

        for (const pattern of codePatterns) {
            const match = text.match(pattern);
            if (match) {
                code = match[1];
                break;
            }
        }

        return { url, code };
    }

    async startDownload(targetPath) {
        if (this.currentProcess) {
            throw new Error('An installation process is already running');
        }

        const binName = this.getBinaryName();
        if (!binName) {
            throw new Error('Unsupported platform for automatic downloader');
        }

        const binPath = path.join(BIN_DIR, binName);

        // Check if binary exists
        try {
            await fs.access(binPath);
            // Ensure executable permissions on Linux/Mac
            if (process.platform !== 'win32') {
                console.log(`[INSTALLER] Checking permissions for ${binPath}`);

                try {
                    // Method 1: fs.chmod (native)
                    await fs.chmod(binPath, 0o755);
                    console.log('[INSTALLER] fs.chmod(755) successful');
                } catch (e) {
                    console.log('[INSTALLER] fs.chmod failed:', e.message);

                    try {
                        // Method 2: shell chmod
                        const { exec } = await import('child_process');
                        const { promisify } = await import('util');
                        const execAsync = promisify(exec);
                        await execAsync(`chmod +x "${binPath}"`);
                        console.log('[INSTALLER] shell chmod +x successful');
                    } catch (e2) {
                        console.error('[INSTALLER] All chmod attempts failed:', e2.message);
                    }
                }

                // Verification
                const stats = await fs.stat(binPath);
                // Check X bit for user(100), group(010), or other(001)
                const isExecutable = !!(stats.mode & 0o100) || !!(stats.mode & 0o010) || !!(stats.mode & 0o001);
                console.log(`[INSTALLER] File mode: ${stats.mode.toString(8)}, Executable: ${isExecutable}`);

                if (!isExecutable) {
                    this.status.state = 'error';
                    this.status.error = `Permission Error: Cannot execute downloader. Please run: chmod +x "${binPath}"`;
                    return;
                }
            }
        } catch {
            this.status.state = 'error';
            this.status.error = `Downloader binary not found at ${binPath}. Please place the CLI tool in the backend/bin folder.`;
            return;
        }

        // Reset status
        this.status.state = 'authenticating';
        this.status.progress = 0;
        this.status.deviceCode = null;
        this.status.verificationUrl = null;
        this.status.logs = [];
        this.status.error = null;
        this.outputBuffer = '';

        // Ensure target directory exists
        try {
            await fs.mkdir(targetPath, { recursive: true });
        } catch (err) {
            this.status.state = 'error';
            this.status.error = `Failed to create target directory: ${err.message}`;
            return;
        }

        // Usage: ./hytale-downloader -download-path game.zip -skip-update-check
        const downloadPath = path.join(targetPath, 'game.zip');

        // Check if game.zip already exists
        try {
            const stats = await fs.stat(downloadPath);
            if (stats.size > 10000000) { // arbitrary 10MB check
                console.log('[INSTALLER] Found existing game.zip, skipping download.');
                this.status.logs.push('Found existing game.zip, skipping download...');
                this.finalizeInstallation(targetPath);
                return;
            }
        } catch (e) {
            // File doesn't exist, proceed with download
        }

        this.currentProcess = spawn(binPath, [
            '-download-path', downloadPath,
            '-skip-update-check'
        ], {
            cwd: targetPath,
            env: {
                ...process.env,
                // Force unbuffered output for better real-time streaming
                PYTHONUNBUFFERED: '1',
                TERM: 'dumb'
            }
        });

        // Handle stdout
        this.currentProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.outputBuffer += output;
            this.status.logs.push(output);

            console.log('[INSTALLER STDOUT]:', output);

            // Parse device authorization
            const { url, code } = this.parseDeviceAuthOutput(this.outputBuffer);

            if (code && !this.status.deviceCode) {
                this.status.deviceCode = code;
                console.log('[INSTALLER] Device code detected:', code);
            }

            if (url && !this.status.verificationUrl) {
                this.status.verificationUrl = url;
                console.log('[INSTALLER] Verification URL detected:', url);
            }

            // Check for authentication success
            if (output.toLowerCase().includes('authentication successful') ||
                output.toLowerCase().includes('authorized')) {
                this.status.state = 'downloading_game';
                console.log('[INSTALLER] Authentication successful, starting download');
            }

            // Check for completion - wait for process to actually exit first to ensure file handles are closed
            // But the close event handles the state update to 'finished' or 'error' normally.
            // However, we want to intercept success to do extraction.

            // Enhanced progress tracking - matches patterns like:
            // ] 29.0% (413.5 MB / 1.4 GB)
            const progressPatterns = [
                /]\s*(\d+(?:\.\d+)?)%/,           // ] 29.0%
                /(\d+(?:\.\d+)?)%\s*\(/,          // 29.0% (
                /progress[:\s]+(\d+(?:\.\d+)?)%/i // progress: 29%
            ];

            for (const pattern of progressPatterns) {
                const match = output.match(pattern);
                if (match) {
                    const progress = Math.floor(parseFloat(match[1]));
                    if (progress > this.status.progress && progress <= 100) {
                        this.status.progress = progress;

                        // Automatically transition to downloading state
                        if (this.status.state === 'authenticating' || this.status.state === 'starting') {
                            this.status.state = 'downloading_game';
                        }
                    }
                    break;
                }
            }

            // Check for download started
            if ((output.toLowerCase().includes('downloading') ||
                output.toLowerCase().includes('download')) &&
                this.status.state === 'authenticating') {
                this.status.state = 'downloading_game';
            }
        });

        // Handle stderr
        this.currentProcess.stderr.on('data', (data) => {
            const output = data.toString();
            this.status.logs.push(`STDERR: ${output}`);
            console.error('[INSTALLER STDERR]:', output);

            // Some CLIs output normal messages to stderr
            const { url, code } = this.parseDeviceAuthOutput(output);

            if (code && !this.status.deviceCode) {
                this.status.deviceCode = code;
            }

            if (url && !this.status.verificationUrl) {
                this.status.verificationUrl = url;
            }

            // Check if it's actually an error
            if (output.toLowerCase().includes('error') ||
                output.toLowerCase().includes('failed')) {
                this.status.error = output;
            }
        });

        // Handle process exit
        this.currentProcess.on('close', async (code) => {
            console.log('[INSTALLER] Process exited with code:', code);
            this.currentProcess = null;

            if (code === 0) {
                // Success! Now Extract
                this.finalizeInstallation(targetPath);
            } else {
                this.status.state = 'error';
                this.status.error = `Downloader exited with code ${code}. Check logs for details.`;
            }
        });
        // Handle process errors
        this.currentProcess.on('error', (err) => {
            console.error('[INSTALLER] Process error:', err);
            this.currentProcess = null;
            this.status.state = 'error';
            this.status.error = `Failed to start downloader: ${err.message}`;
        });
    }

    async finalizeInstallation(targetPath) {
        this.status.state = 'extracting';
        this.status.logs.push('Extracting server files (streaming via Yauzl)...');
        console.log('[INSTALLER] finalizeInstallation: Starting extraction...');

        try {
            const downloadPath = path.join(targetPath, 'game.zip');

            // Verify file exists
            try {
                await fs.stat(downloadPath);
            } catch (e) {
                throw new Error(`Game zip not found: ${e.message}`);
            }

            // Using yauzl for streaming extraction (handles >2GB files)
            let yauzl;
            try {
                const mod = await import('yauzl');
                yauzl = mod.default || mod;
            } catch (e) { throw new Error('Failed to import yauzl: ' + e.message); }

            await new Promise((resolve, reject) => {
                yauzl.open(downloadPath, { lazyEntries: true }, (err, zipfile) => {
                    if (err) return reject(err);

                    let entriesProcessed = 0;
                    const totalEntries = zipfile.entryCount;
                    const reportProgress = () => {
                        entriesProcessed++;
                        const percent = Math.floor((entriesProcessed / totalEntries) * 100);
                        // Update every 1% or at least 100 entries to avoid spam, but ensure 100% is reached
                        if (percent % 1 === 0 || percent === 100) {
                            this.status.progress = percent;
                        }
                    };

                    zipfile.readEntry();

                    zipfile.on('entry', async (entry) => {
                        if (/\/$/.test(entry.fileName)) {
                            // Directory
                            try {
                                await fs.mkdir(path.join(targetPath, entry.fileName), { recursive: true });
                                reportProgress();
                                zipfile.readEntry();
                            } catch (e) {
                                reportProgress();
                                zipfile.readEntry(); // Try continuing
                            }
                        } else {
                            // File
                            zipfile.openReadStream(entry, async (err, readStream) => {
                                if (err) return reject(err);

                                const fullPath = path.join(targetPath, entry.fileName);
                                // Ensure parent dir exists
                                await fs.mkdir(path.dirname(fullPath), { recursive: true });

                                const writeStream = (await import('fs')).createWriteStream(fullPath);

                                readStream.pipe(writeStream);
                                writeStream.on('finish', () => {
                                    reportProgress();
                                    zipfile.readEntry();
                                });
                                writeStream.on('error', (e) => reject(e));
                            });
                        }
                    });

                    zipfile.on('end', () => {
                        resolve();
                    });

                    zipfile.on('error', (err) => {
                        reject(err);
                    });
                });
            });

            this.status.logs.push('Extraction complete.');

            try {
                // Cleanup zip
                await fs.unlink(downloadPath);

                // Flattening logic removed to preserve 'Server' folder structure expected by start.bat

                // Propagate downloader credentials to Server folder if they exist
                try {
                    const credsFile = '.hytale-downloader-credentials.json';
                    const srcCreds = path.join(targetPath, credsFile);
                    const destCreds = path.join(targetPath, 'Server', credsFile);

                    // Check if source exists first
                    await fs.access(srcCreds);

                    // Ensure Server directory exists (though it should from unzip)
                    try { await fs.mkdir(path.join(targetPath, 'Server'), { recursive: true }); } catch { }

                    // Copy to Server folder
                    await fs.copyFile(srcCreds, destCreds);
                    this.status.logs.push('Propagated authentication credentials to server.');
                } catch (e) {
                    // Credentials might not exist or copy failed, which is non-critical
                }

                this.status.state = 'finished';
                this.status.progress = 100;

            } catch (err) {
                this.status.state = 'error';
                this.status.logs.push(`ERROR: ${err.message}`);
            }
        } catch (err) {
            this.status.state = 'error';
            this.status.error = `Extraction setup failed: ${err.message}`;
            this.status.logs.push(`ERROR: ${err.message}`);
        }
    }

    async cancelDownload() {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');

            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGKILL');
                }
            }, 5000);

            this.currentProcess = null;
            this.status.state = 'idle';
            this.status.logs.push('Download cancelled by user');
        }
    }

    // Method to manually set device code (for testing or manual input)
    setDeviceCode(code, url) {
        this.status.deviceCode = code;
        this.status.verificationUrl = url || 'https://accounts.hytale.com/device';
    }

    // Clear logs to prevent memory buildup
    clearOldLogs() {
        if (this.status.logs.length > 1000) {
            this.status.logs = this.status.logs.slice(-500);
        }
    }
}

export default new InstallerService();