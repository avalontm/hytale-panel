import axios from 'axios';

// Base Provider Class
class ModProvider {
    constructor(name) {
        this.name = name;
    }

    async search(query) { throw new Error("Not implemented"); }
    async getDownloadUrl(modId) { throw new Error("Not implemented"); }
}

// CurseForge Implementation
class CurseForgeProvider extends ModProvider {
    constructor() {
        super('CurseForge');
        this.gameId = 70216; // Hytale
    }

    async getApiKey() {
        // Dynamic import to avoid circular dependency issues if any, ensuring fresh execution
        const settingsService = (await import('./settingsService.js')).default;
        const settings = await settingsService.get();
        return settings.modProviders?.curseforge?.apiKey;
    }

    async search(query) {
        const apiKey = await this.getApiKey();

        // Without an API Key, we can't hit the real CF API.
        // Returning mock data for demonstration if no key is present.
        if (!apiKey) {
            console.warn("No CurseForge API Key found in settings. Returning mock results.");
            // Filter mock results by query
            const mockResults = [
                { id: '1', name: 'Hytale Tools (Demo)', summary: 'Essential tools for server. Configure API Key to search real mods.', author: 'Admin', logo: '', downloadUrl: '' },
                { id: '2', name: 'WorldEdit (Demo)', summary: 'Edit the world in-game. Configure API Key to search real mods.', author: 'sk89q', logo: '', downloadUrl: '' },
            ];
            return mockResults.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
        }

        try {
            const response = await axios.get('https://api.curseforge.com/v1/mods/search', {
                params: {
                    gameId: this.gameId,
                    searchFilter: query
                },
                headers: {
                    'Accept': 'application/json',
                    'x-api-key': apiKey
                }
            });

            return response.data.data.map(mod => {
                // Logic to select the best file:
                // 1. Try to match mainFileId
                let bestFile = mod.latestFiles?.find(f => f.id === mod.mainFileId);

                // 2. If no main file match, prefer .jar files
                if (!bestFile) {
                    bestFile = mod.latestFiles?.find(f => f.fileName.toLowerCase().endsWith('.jar'));
                }

                // 3. Fallback to the most recent file
                if (!bestFile) {
                    bestFile = mod.latestFiles?.[0];
                }

                return {
                    id: mod.id,
                    name: mod.name,
                    summary: mod.summary,
                    author: mod.authors[0]?.name,
                    logo: mod.logo?.thumbnailUrl,
                    websiteUrl: mod.links?.websiteUrl,
                    downloadUrl: bestFile?.downloadUrl,
                    latestFileId: bestFile?.id,
                    latestFileName: bestFile?.fileName
                };
            });
        } catch (error) {
            console.error("CurseForge Search Error:", error.result?.data || error.message);
            // Improve error message for user
            if (error.response?.status === 403) {
                throw new Error("Invalid API Key. Please check your CurseForge Settings.");
            }
            throw new Error("Failed to search CurseForge: " + error.message);
        }
    }
    async getDownloadUrl(modId, fileId) {
        const apiKey = await this.getApiKey();
        if (!apiKey) throw new Error("API Key required");

        try {
            const response = await axios.get(`https://api.curseforge.com/v1/mods/${modId}/files/${fileId}/download-url`, {
                headers: {
                    'Accept': 'application/json',
                    'x-api-key': apiKey
                }
            });
            return response.data.data; // The URL string
        } catch (error) {
            console.error("Get Download URL Error:", error.result?.data || error.message);
            throw new Error("Failed to get download URL");
        }
    }
}

// Provider Manager
class ModProviderService {
    constructor() {
        this.providers = new Map();
        this.registerProvider(new CurseForgeProvider());
    }

    registerProvider(provider) {
        this.providers.set(provider.name, provider);
    }

    getProvider(name) {
        return this.providers.get(name);
    }

    getProvidersList() {
        return Array.from(this.providers.keys());
    }

    async search(providerName, query) {
        const provider = this.getProvider(providerName);
        if (!provider) throw new Error(`Provider ${providerName} not found`);
        return await provider.search(query);
    }

    async getDownloadUrl(modId, fileId) {
        const apiKey = await this.getApiKey();
        if (!apiKey) throw new Error("API Key required");

        const url = `https://api.curseforge.com/v1/mods/${modId}/files/${fileId}/download-url`;
        console.log(`[CurseForge] Requesting Download URL: ${url}`);
        // Log length and partial key to debug if it's hashed
        console.log(`[CurseForge] Key Length: ${apiKey.length}. Start: ${apiKey.substring(0, 10)}...`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'x-api-key': apiKey
                }
            });
            return response.data.data; // The URL string
        } catch (error) {
            console.error("Get Download URL Error:", error.response?.status, error.response?.data || error.message);
            throw new Error("Failed to get download URL: " + (error.response?.status === 403 ? "Access Denied (Check API Key)" : error.message));
        }
    }
}

export default new ModProviderService();
