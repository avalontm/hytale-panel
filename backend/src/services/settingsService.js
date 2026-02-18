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
            jarFile: 'Server/HytaleServer.jar',
            assetsFile: 'Assets.zip',
            startCommand: 'java -XX:AOTCache=Server/HytaleServer.aot -Xmx2G -Xms1G -jar Server/HytaleServer.jar --assets Assets.zip',
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
            javaPath: javaInfo.path,
            debug: javaInfo.debugLogs // Include debug logs in response
        };
    }

    async checkJava() {
        const debugLogs = [];
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            const log = (msg) => {
                console.log(`[JavaDetect] ${msg}`);
                debugLogs.push(msg);
            };

            log('Starting Java detection...');
            log(`Platform: ${process.platform}, PATH: ${process.env.PATH}`);

            // Helper to parse java version output
            const parseOutput = (out) => {
                const lines = out.split(/\r?\n/);
                const versionLine = lines.find(line => {
                    const l = line.toLowerCase();
                    return l.includes('version') || l.includes('java') || l.includes('openjdk') || l.includes('jdk');
                });
                return versionLine ? versionLine.trim() : null;
            };

            // Helper to check a specific java binary
            const checkBinary = async (binPath) => {
                try {
                    log(`Checking binary: ${binPath}`);
                    // If absolute path, check existence. If just 'java', skip access check.
                    if (path.isAbsolute(binPath)) {
                        await fs.access(binPath);
                    }
                    const { stdout, stderr } = await execAsync(`"${binPath}" -version`);
                    const output = (stdout + stderr).trim();
                    log(`Output for ${binPath}: ${output.split('\n')[0]}...`);

                    const version = parseOutput(output);
                    if (version) {
                        return { version, path: binPath };
                    }
                    log(`Failed to parse version for ${binPath}`);
                } catch (e) {
                    log(`Error checking ${binPath}: ${e.message}`);
                }
                return null;
            };

            // 0. Check JAVA_HOME environment variable
            if (process.env.JAVA_HOME) {
                log(`JAVA_HOME found: ${process.env.JAVA_HOME}`);
                const javaHomeBin = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
                const result = await checkBinary(javaHomeBin);
                if (result) {
                    console.log('[DEBUG] Found Java via JAVA_HOME:', result);
                    return { ...result, debugLogs };
                }
            } else {
                log('JAVA_HOME not set');
            }

            // 1. Check system PATH using shell commands
            const pathCommands = process.platform === 'win32'
                ? ['where java']
                : [
                    'which java',
                    'command -v java',
                    'bash -l -c "which java"',           // Login shell
                    'bash -i -c "which java"',           // Interactive shell (forces .bashrc)
                    'bash -c "source ~/.bashrc && which java"', // Explicit source bashrc
                    'bash -c "source ~/.bash_profile && which java"', // Explicit source bash_profile
                    'bash -c "source ~/.sdkman/bin/sdkman-init.sh && which java"', // Explicitly load SDKMAN environment
                    'bash -c "source /etc/profile && which java"' // System profile
                ];

            // Debug user context
            if (process.platform !== 'win32') {
                try {
                    const { stdout: who } = await execAsync('whoami');
                    const { stdout: home } = await execAsync('echo $HOME');
                    log(`User: ${who.trim()}, Home: ${home.trim()}`);
                } catch (e) { }
            }

            for (const cmd of pathCommands) {
                try {
                    log(`Running command: ${cmd}`);
                    // For interactive shell, we might need to ignore stderr noise
                    const { stdout } = await execAsync(cmd);

                    // Filter out non-path lines (bash -i produces prompts/banner text)
                    const lines = stdout.trim().split(/\r?\n/);
                    let systemJavaPath = null;

                    // Look for a line that looks like a path
                    for (let i = lines.length - 1; i >= 0; i--) {
                        const line = lines[i].trim();
                        if (line && line.startsWith('/') && !line.includes(' ')) {
                            systemJavaPath = line;
                            break;
                        }
                    }

                    if (systemJavaPath) log(`Parsed path: ${systemJavaPath}`);
                    else log(`Could not parse path from: ${stdout.trim()}`);

                    if (systemJavaPath && !systemJavaPath.toLowerCase().includes('not found')) {
                        const result = await checkBinary(systemJavaPath);
                        if (result) {
                            console.log(`[DEBUG] Found Java via '${cmd}':`, result);
                            return { ...result, debugLogs };
                        }
                    }
                } catch (e) {
                    log(`Command '${cmd}' failed: ${e.message}`);
                }
            }

            // 1b. Try executing 'java' directly (relies on Node's inherited PATH)
            const directResult = await checkBinary('java');
            if (directResult) {
                log('Direct "java" execution successful');
                console.log('[DEBUG] Found Java via direct execution');
                if (process.platform !== 'win32') {
                    try {
                        const { stdout } = await execAsync('readlink -f $(which java)');
                        if (stdout.trim()) directResult.path = stdout.trim();
                    } catch (e) { }
                }
                return { ...directResult, debugLogs };
            }

            log('All detection methods failed');
            // (Removed hardcoded SDKMAN paths better to rely on bash -l or standard locations)

            // 2. (Removed) Manual directory scanning
            // User prefers to rely solely on system configuration (PATH / JAVA_HOME) determining the correct version.
            // If it's not in PATH or JAVA_HOME, it is considered "Not Found" rather than guessing.

            return { version: 'Not Found', path: '', debugLogs };

        } catch (error) {
            console.error('[DEBUG] Java detection critical error:', error);
            debugLogs.push(`Critical error: ${error.message}`);
            return { version: 'Not Found', path: '', debugLogs };
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
