import fs from 'fs/promises';
import path from 'path';
import settingsService from './settingsService.js';
import serverService from './serverService.js';

class PlayerService {
    async getPlayersDir() {
        const settings = await settingsService.get();
        if (!settings.serverPath) throw new Error('Server path not configured');
        return path.join(settings.serverPath, 'universe', 'players');
    }

    async getPermissionsFile() {
        const settings = await settingsService.get();
        if (!settings.serverPath) throw new Error('Server path not configured');
        return path.join(settings.serverPath, 'permissions.json');
    }

    async listPlayers() {
        try {
            const dir = await this.getPlayersDir();
            const files = await fs.readdir(dir);
            const playerFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.bak'));

            const players = [];
            for (const file of playerFiles) {
                try {
                    const content = await fs.readFile(path.join(dir, file), 'utf8');
                    const data = JSON.parse(content);
                    const uuid = file.replace('.json', '');

                    // Basic extraction
                    players.push({
                        uuid,
                        name: data.Components?.Nameplate?.Text || data.Components?.DisplayName?.DisplayName?.RawText || 'Unknown',
                        gameMode: data.Components?.Player?.GameMode || 'Unknown',
                        health: data.Components?.EntityStats?.Stats?.Health?.Value || 0,
                        lastModified: (await fs.stat(path.join(dir, file))).mtime
                    });
                } catch (err) {
                    console.error(`Error reading player file ${file}:`, err.message);
                }
            }
            return players;
        } catch (error) {
            console.error('[PlayerService] Error listing players:', error.message);
            return [];
        }
    }

    async getPlayer(uuid) {
        const dir = await this.getPlayersDir();
        const filePath = path.join(dir, `${uuid}.json`);
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        // Add OP status
        const isOp = await this.isOp(uuid);
        return { ...data, isOp, uuid };
    }

    async updatePlayer(uuid, updates) {
        const dir = await this.getPlayersDir();
        const filePath = path.join(dir, `${uuid}.json`);
        const content = await fs.readFile(filePath, 'utf8');
        let data = JSON.parse(content);

        // Deep merge or specific updates? 
        // For simplicity and safety, let's allow updating specific components
        if (updates.Components) {
            if (updates.Components.EntityStats?.Stats) {
                const stats = updates.Components.EntityStats.Stats;
                for (const key in stats) {
                    if (data.Components.EntityStats.Stats[key]) {
                        data.Components.EntityStats.Stats[key].Value = stats[key].Value;
                    }
                }
            }
            if (updates.Components.Player?.GameMode) {
                data.Components.Player.GameMode = updates.Components.Player.GameMode;
            }
        }

        await fs.writeFile(filePath, JSON.stringify(data, null, 2));

        // Handle OP status update if provided
        if (updates.isOp !== undefined) {
            await this.setOp(uuid, updates.isOp);
        }

        return data;
    }

    async isOp(uuid) {
        try {
            const file = await this.getPermissionsFile();
            const content = await fs.readFile(file, 'utf8');
            const perms = JSON.parse(content);
            const userGroups = perms.users?.[uuid]?.groups || [];
            return userGroups.includes('OP');
        } catch {
            return false;
        }
    }

    async setOp(uuid, isOp) {
        // 1. Get player name first for the command
        let name = 'Unknown';
        try {
            const dir = await this.getPlayersDir();
            const content = await fs.readFile(path.join(dir, `${uuid}.json`), 'utf8');
            const data = JSON.parse(content);
            name = data.Components?.Nameplate?.Text || data.Components?.DisplayName?.DisplayName?.RawText || 'Unknown';
        } catch (err) {
            console.error('[PlayerService] Failed to read player name for OP command:', err.message);
        }

        // 2. Send command to live server if online (with / prefix as requested)
        if (name !== 'Unknown') {
            const command = isOp ? `/op add ${name}` : `/op remove ${name}`;
            if (serverService.status === 'online') {
                console.log(`[PlayerService] Priority sync: Sending command to server: ${command}`);
                serverService.sendCommand(command);
            } else {
                console.log(`[PlayerService] Server is offline. Command skipped (will apply via file): ${command}`);
            }
        }

        // 3. Update permissions.json for persistence
        const file = await this.getPermissionsFile();
        let perms = { users: {}, groups: {} };
        try {
            const content = await fs.readFile(file, 'utf8');
            perms = JSON.parse(content);
        } catch (err) {
            console.warn('[PlayerService] permissions.json not found or invalid, creating new.');
        }

        if (!perms.users) perms.users = {};
        if (!perms.users[uuid]) perms.users[uuid] = { groups: [] };

        const groups = perms.users[uuid].groups || [];
        if (isOp) {
            if (!groups.includes('OP')) groups.push('OP');
        } else {
            perms.users[uuid].groups = groups.filter(g => g !== 'OP');
        }

        await fs.writeFile(file, JSON.stringify(perms, null, 2));
        console.log(`[PlayerService] Permissions file updated for ${uuid} (OP: ${isOp})`);
    }
}

export default new PlayerService();
