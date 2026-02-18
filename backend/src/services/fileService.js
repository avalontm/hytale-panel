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

      const result = await Promise.all(items.map(async (item) => {
        const itemPath = path.join(dirPath, item.name);
        try {
          const stats = await fs.stat(itemPath);
          return {
            name: item.name,
            isDirectory: item.isDirectory(),
            size: item.isDirectory() ? 0 : stats.size,
            lastModified: stats.mtime
          };
        } catch (error) {
          console.error(`[FileService] Error stating ${item.name}:`, error);
          return {
            name: item.name,
            isDirectory: item.isDirectory(),
            size: 0,
            lastModified: new Date(0)
          };
        }
      }));

      return result;
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

  async rename(oldPath, newPath) {
    const source = await this.resolvePath(oldPath);
    const destination = await this.resolvePath(newPath);
    await fs.rename(source, destination);
    return { success: true };
  }

  async move(sourcePath, destPath) {
    const source = await this.resolvePath(sourcePath);
    const destination = await this.resolvePath(destPath);
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(source, destination);
    return { success: true };
  }

  async copy(sourcePath, destPath) {
    const source = await this.resolvePath(sourcePath);
    const destination = await this.resolvePath(destPath);
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, { recursive: true });
    return { success: true };
  }
}

export default new FileService();
