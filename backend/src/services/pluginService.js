import fs from 'fs/promises';
import path from 'path';
import settingsService from './settingsService.js';
import axios from 'axios';

class PluginService {
  constructor() {
    this.registryPath = path.resolve('data/installed_mods.json');
  }

  async getRegistry() {
    try {
      const data = await fs.readFile(this.registryPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {}; // Empty registry if missing
    }
  }

  async saveRegistry(registry) {
    try {
      await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2));
    } catch (err) {
      console.error("[PluginService] Failed to save registry:", err);
    }
  }

  async getModsPath() {
    const settings = await settingsService.get();
    const serverPath = settings.serverPath;
    const modsPath = path.join(serverPath, 'mods');

    // Ensure mods directory exists
    try {
      await fs.access(modsPath);
    } catch {
      await fs.mkdir(modsPath, { recursive: true });
    }

    return modsPath;
  }

  async listPlugins() {
    const modsPath = await this.getModsPath();
    const registry = await this.getRegistry();
    console.log('[PluginService] Listing plugins from:', modsPath);

    try {
      const files = await fs.readdir(modsPath, { withFileTypes: true });

      const plugins = await Promise.all(files
        .filter(dirent => dirent.isFile() && (dirent.name.toLowerCase().endsWith('.jar') || dirent.name.toLowerCase().endsWith('.zip')))
        .map(async (dirent) => {
          try {
            const stats = await fs.stat(path.join(modsPath, dirent.name));
            const meta = registry[dirent.name] || {};

            return {
              name: dirent.name,
              size: stats.size,
              lastModified: stats.mtime,
              // Metadata fields
              displayName: meta.name || dirent.name,
              logo: meta.logo || null,
              provider: meta.provider || 'manual',
              modId: meta.modId || null,
              description: meta.summary || null,
              websiteUrl: meta.websiteUrl || null
            };
          } catch (err) {
            console.error(`[PluginService] Error stating file ${dirent.name}:`, err);
            return null;
          }
        }));

      const validPlugins = plugins.filter(p => p !== null);
      // console.log('[PluginService] Returning plugins:', validPlugins); // Reduce noise
      return validPlugins;
    } catch (error) {
      console.error('[PluginService] Error listing plugins:', error);
      return [];
    }
  }

  async uploadPlugin(filename, source) {
    const modsPath = await this.getModsPath();
    const filePath = path.join(modsPath, filename);

    if (Buffer.isBuffer(source)) {
      await fs.writeFile(filePath, source);
    } else {
      await fs.copyFile(source, filePath);
    }

    // Register as manual upload
    const registry = await this.getRegistry();
    registry[filename] = {
      name: filename,
      provider: 'manual',
      uploadedAt: new Date().toISOString()
    };
    await this.saveRegistry(registry);

    return { success: true, name: filename };
  }

  async deletePlugin(filename) {
    const modsPath = await this.getModsPath();
    const filePath = path.join(modsPath, filename);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // Remove from registry
    const registry = await this.getRegistry();
    if (registry[filename]) {
      delete registry[filename];
      await this.saveRegistry(registry);
    }

    return { success: true };
  }

  // Install from a direct URL (used by providers)
  // Metadata: { modId, name, logo, summary, provider }
  async installFromUrl(url, filename, metadata = {}) {
    const modsPath = await this.getModsPath();
    const filePath = path.join(modsPath, filename);

    const writer = (await import('fs')).createWriteStream(filePath);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Save metadata
    const registry = await this.getRegistry();
    registry[filename] = {
      ...metadata,
      installedAt: new Date().toISOString(),
      provider: metadata.provider || 'remote'
    };
    await this.saveRegistry(registry);

    return { success: true };
  }
}

export default new PluginService();
