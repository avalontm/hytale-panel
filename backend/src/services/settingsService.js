import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

class SettingsService {
    constructor() {
        this.settings = null;
        this.defaultSettings = {
            os: process.platform === 'win32' ? 'windows' : (process.platform === 'darwin' ? 'macos' : 'linux'),
            serverPath: '',
            javaPath: 'java',
            jarFile: 'HytaleServer.jar',
            assetsFile: 'Assets.zip',
            startCommand: 'java -XX:AOTCache=HytaleServer.aot -Xmx2G -Xms1G -jar HytaleServer.jar --assets Assets.zip',
            maxMemory: '2G',
            minMemory: '1G',
            port: 5520, // Manual default
            modProviders: {
                curseforge: {
                    apiKey: ''
                }
            }
        };
    }

    async detectSystem() {
        const platform = process.platform;
        let detectedPath = '';
        let defaultPath = '';

        const possiblePaths = [];
        if (platform === 'win32') {
            defaultPath = path.join(os.homedir(), 'hytale_server');

            const appData = process.env.APPDATA;
            possiblePaths.push(defaultPath); // Check default first
            possiblePaths.push(path.join(appData, 'Hytale/install/release/package/game/latest/Server'));
            possiblePaths.push('C:\\Hytale\\Server');
            possiblePaths.push('C:\\Program Files\\Hytale\\Server');
            possiblePaths.push('D:\\Hytale\\Server');
        } else if (platform === 'linux') {
            defaultPath = path.join(os.homedir(), 'hytale_server');

            const xdgData = process.env.XDG_DATA_HOME || path.join(process.env.HOME, '.local/share');
            possiblePaths.push(defaultPath);
            possiblePaths.push(path.join(xdgData, 'Hytale/install/release/package/game/latest/Server'));
            possiblePaths.push('/opt/hytale/server');
            possiblePaths.push('/hytale/server');
        } else if (platform === 'darwin') {
            defaultPath = path.join(os.homedir(), 'hytale_server');
            possiblePaths.push(defaultPath);
            possiblePaths.push(path.join(process.env.HOME, 'Library/Application Support/Hytale/install/release/package/game/latest/Server'));
        }

        // Check each path
        for (const p of possiblePaths) {
            try {
                // Check if directory exists
                await fs.access(p);
                const stats = await fs.stat(p);

                if (stats.isDirectory()) {
                    // Only consider it detected if HytaleServer.jar exists
                    try {
                        await fs.access(path.join(p, 'HytaleServer.jar'));
                        detectedPath = p;
                        break;
                    } catch { }
                }
            } catch { }
        }

        const javaInfo = await this.checkJava();

        return {
            os: platform === 'win32' ? 'windows' : (platform === 'darwin' ? 'macos' : 'linux'),
            detectedPath: detectedPath,
            defaultPath: defaultPath,
            javaVersion: javaInfo.version,
            javaPath: javaInfo.path
        };
    }

    async checkJava() {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            // fs is already imported at the top level

            // Helper to parsing output
            const parseOutput = (out) => {
                const lines = out.split(/\r?\n/);
                const versionLine = lines.find(line => {
                    const l = line.toLowerCase();
                    return l.includes('version') || l.includes('java') || l.includes('openjdk') || l.includes('jdk');
                });
                return versionLine ? versionLine.trim() : null;
            };

            // 1. Try direct 'java' command (PATH)
            try {
                // On Linux, 'which java' gives the path
                let detectedPath = 'java';
                if (process.platform !== 'win32') {
                    try {
                        const { stdout } = await execAsync('which java');
                        if (stdout.trim()) detectedPath = stdout.trim();
                    } catch { }
                }

                console.log('[DEBUG] Trying "java -version"...');
                const { stdout, stderr } = await execAsync(`"${detectedPath}" -version`);
                const output = (stdout + stderr).trim();
                const version = parseOutput(output);
                if (version) return { version, path: detectedPath };
            } catch (e) {
                console.log('[DEBUG] "java -version" failed:', e.message);
            }

            // 2. If Windows, we are done (or could check registry, but 'where java' usually works or it's not installed)
            if (process.platform === 'win32') return { version: 'Not Found', path: '' };

            // 3. Linux/Mac: Try common paths
            console.log('[DEBUG] Searching common paths...');
            const commonPaths = [
                '/usr/bin/java',
                '/usr/local/bin/java',
                '/bin/java',
                '/opt/java/bin/java',
                '/opt/jdk-25/bin/java' // Hytale recommended
            ];

            // Add finds in /usr/lib/jvm
            try {
                const jvmDir = '/usr/lib/jvm';
                const entries = await fs.readdir(jvmDir).catch(() => []);
                for (const entry of entries) {
                    commonPaths.push(path.join(jvmDir, entry, 'bin/java'));
                }
            } catch (e) { }

            // Add finds in /opt (looking for jdk* or java*)
            try {
                const optDir = '/opt';
                const entries = await fs.readdir(optDir).catch(() => []);
                for (const entry of entries) {
                    if (entry.toLowerCase().includes('jdk') || entry.toLowerCase().includes('java')) {
                        commonPaths.push(path.join(optDir, entry, 'bin/java'));
                    }
                }
            } catch (e) { }

            for (const javaPath of commonPaths) {
                try {
                    await fs.access(javaPath); // Check if exists
                    const { stdout, stderr } = await execAsync(`"${javaPath}" -version`);
                    const output = (stdout + stderr).trim();
                    const version = parseOutput(output);

                    if (version) {
                        console.log('[DEBUG] Found Java at:', javaPath);
                        return { version, path: javaPath };
                    }
                } catch (e) {
                    // Continue to next path
                }
            }

            return { version: 'Not Found', path: '' };
        } catch (error) {
            console.error('[DEBUG] Java detection critical error:', error);
            return { version: 'Not Found', path: '' };
        }
    }

    async ensureDataDir() {
        try {
            await fs.access(DATA_DIR);
        } catch {
            await fs.mkdir(DATA_DIR, { recursive: true });
        }
    }

    async load() {
        // if (this.settings) return this.settings; // Disable cache to ensure fresh reads

        try {
            await this.ensureDataDir();
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            this.settings = { ...this.defaultSettings, ...JSON.parse(data) };
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.settings = { ...this.defaultSettings };
                await this.save(this.settings);
            } else {
                throw error;
            }
        }
        return this.settings;
    }

    async save(newSettings) {
        await this.ensureDataDir();
        this.settings = { ...this.defaultSettings, ...newSettings };
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
        return this.settings;
    }

    async get() {
        return this.load();
    }

    async update(updates) {
        const current = await this.load();
        const updated = { ...current, ...updates };

        // Basic validation could go here
        if (updates.os && updates.os !== current.os) {
            // You might want to reset start commands if OS changes, but we'll leave that to the frontend to suggest
        }

        return this.save(updated);
    }
}

export default new SettingsService();
