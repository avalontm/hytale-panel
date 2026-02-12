import fs from 'fs/promises';
import path from 'path';
import settingsService from './settingsService.js';

class FileService {
  // Helper to resolve path and prevent directory traversal
  async resolvePath(relativePath = '') {
    const settings = await settingsService.get();
    // Normalize basePath to ensure consistent separators/casing
    const basePath = path.resolve(settings.serverPath);

    // Normalize the target path
    const resolvedPath = path.resolve(basePath, relativePath);

    // Security check: Ensure resolved path starts with base path
    // We treat both as resolved paths to compare correctly
    const isWindows = process.platform === 'win32';
    const basePathCheck = isWindows ? basePath.toLowerCase() : basePath;
    const resolvedPathCheck = isWindows ? resolvedPath.toLowerCase() : resolvedPath;

    if (!resolvedPathCheck.startsWith(basePathCheck)) {
      console.error(`[Security] Access Denied. Base: ${basePath}, Target: ${resolvedPath}`);
      throw new Error('Access denied: Path traversal detected');
    }

    console.log(`[FileService] Accessing: ${resolvedPath}`);

    return resolvedPath;
  }

  async listFiles(directory = '') {
    try {
      const dirPath = await this.resolvePath(directory);
      console.log(`[FileService] Listing: ${dirPath}`);
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      return items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        size: item.isDirectory() ? 0 : 0, // Could get valid size if needed
        lastModified: new Date() // Placeholder, could use stat
      }));
    } catch (error) {
      console.error('[FileService] List Error:', error);
      if (error.code === 'ENOENT') return []; // Directory doesn't exist?
      throw error;
    }
  }

  async readFile(filePath) {
    const fullPath = await this.resolvePath(filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    return { content };
  }

  async writeFile(filePath, content) {
    const fullPath = await this.resolvePath(filePath);
    await fs.writeFile(fullPath, content);
    return { success: true };
  }

  async deleteFile(filePath) {
    const fullPath = await this.resolvePath(filePath);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    return { success: true };
  }

  async createDirectory(dirPath) {
    const fullPath = await this.resolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  }

  async uploadFile(filePath, source) {
    const fullPath = await this.resolvePath(filePath);
    const dirPath = path.dirname(fullPath);
    await fs.mkdir(dirPath, { recursive: true });

    if (Buffer.isBuffer(source)) {
      await fs.writeFile(fullPath, source);
    } else {
      // Assume source is a path to a file (string)
      await fs.copyFile(source, fullPath);
    }
    return { success: true };
  }
}

export default new FileService();
