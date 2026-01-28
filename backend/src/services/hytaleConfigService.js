import fs from 'fs/promises';
import path from 'path';
import settingsService from './settingsService.js';

class HytaleConfigService {
    constructor() {
        this.allowedFiles = [
            'config.json',
            'bans.json',
            'permissions.json',
            'whitelist.json'
        ];
    }

    async getConfigPath(filename = 'config.json') {
        if (!this.allowedFiles.includes(filename)) {
            throw new Error(`Access to file '${filename}' is not allowed`);
        }
        const settings = await settingsService.get();
        return path.join(settings.serverPath, filename);
    }

    // Legacy method for backward compatibility if needed, or alias to getFile
    async get() {
        return this.getFile('config.json');
    }

    async update(newConfig) {
        return this.saveFile('config.json', newConfig);
    }

    async getFile(filename) {
        try {
            const configPath = await this.getConfigPath(filename);
            // Check existence
            try {
                await fs.access(configPath);
            } catch {
                // If file doesn't exist, return empty array/object based on file type?
                // Or just return null/empty to let frontend decide.
                // For array-based files like bans/whitelist, empty array is good default.
                if (filename === 'bans.json' || filename === 'whitelist.json') return [];
                return {};
            }

            const content = await fs.readFile(configPath, 'utf8');
            if (!content.trim()) {
                if (filename === 'bans.json' || filename === 'whitelist.json') return [];
                return {};
            }
            return JSON.parse(content);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`File ${filename} contains invalid JSON.`);
            }
            throw error;
        }
    }

    async saveFile(filename, content) {
        const configPath = await this.getConfigPath(filename);

        // Validate JSON structure if content is string (though we expect object here usually, handling raw JSON string could be useful)
        // The previous service took an object. Let's assume content is an object/array here.

        // Ensure parent dir exists (it should if serverPath is valid)

        await fs.writeFile(configPath, JSON.stringify(content, null, 4));
        return content;
    }
}

export default new HytaleConfigService();
