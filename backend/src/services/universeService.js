import path from 'path';
import fs from 'fs/promises';
import settingsService from './settingsService.js';

class UniverseService {
    async listUniverses() {
        const settings = await settingsService.get();
        if (!settings.serverPath) {
            throw new Error('Server path not configured');
        }

        const worldsDir = path.join(settings.serverPath, 'universe', 'worlds');

        try {
            const dirs = await fs.readdir(worldsDir);
            const universes = [];

            for (const dirName of dirs) {
                const configPath = path.join(worldsDir, dirName, 'config.json');
                try {
                    const data = await fs.readFile(configPath, 'utf8');
                    const config = JSON.parse(data);

                    // Filter relevant data
                    universes.push({
                        name: dirName,
                        displayName: config.WorldGen?.Name || dirName,
                        version: config.Version,
                        seed: config.Seed,
                        isTicking: config.IsTicking,
                        pvp: config.IsPvpEnabled,
                        gameTime: config.GameTime,
                        saving: {
                            players: config.IsSavingPlayers,
                            chunks: config.IsSavingChunks
                        },
                        worldGenType: config.WorldGen?.Type,
                        config: config
                    });
                } catch (e) {
                    console.error(`[UniverseService] Error reading config for ${dirName}:`, e.message);
                    // Skip invalid worlds
                }
            }
            return universes;
        } catch (e) {
            if (e.code === 'ENOENT') {
                return []; // No worlds directory yet
            }
            throw e;
        }
    }
}

export default new UniverseService();
