// Utility functions for SetupPage

/**
 * Filters logs to show only important messages, excluding progress bars
 * @param {string[]} logs - Raw log lines from installer
 * @param {number} maxLines - Maximum number of lines to return
 * @returns {string[]} Filtered log lines
 */
export function filterInstallLogs(logs, maxLines = 5) {
    if (!logs || logs.length === 0) return [];

    // Filter out progress bar lines and keep only meaningful messages
    const filtered = logs.filter(log => {
        const line = log.trim();

        // Skip empty lines
        if (!line) return false;

        // Skip lines that are just progress bars: [==============]
        if (/^\[=+\]$/.test(line)) return false;

        // Skip lines that only contain progress percentage with MB/GB
        if (/^]\s*\d+\.?\d*%\s*\([^)]+\)$/.test(line)) return false;

        // Skip pure whitespace or control characters
        if (!/[a-zA-Z0-9]/.test(line)) return false;

        return true;
    });

    // Return last N lines
    return filtered.slice(-maxLines);
}

/**
 * Formats a log line for display
 * @param {string} log - Raw log line
 * @returns {string} Formatted log line
 */
export function formatLogLine(log) {
    let formatted = log.trim();

    // Remove ANSI color codes if present
    formatted = formatted.replace(/\x1B\[[0-9;]*[mGKH]/g, '');

    // Truncate very long lines
    if (formatted.length > 100) {
        formatted = formatted.substring(0, 97) + '...';
    }

    return formatted;
}

/**
 * Checks if installation state should show device code UI
 * @param {string} state - Current installation state
 * @returns {boolean}
 */
export function shouldShowDeviceAuth(state) {
    return state === 'authenticating';
}

/**
 * Checks if installation state should show progress bar
 * @param {string} state - Current installation state
 * @returns {boolean}
 */
export function shouldShowProgress(state) {
    return state === 'downloading_game' || state === 'starting' || state === 'extracting';
}

/**
 * Gets a human-readable status message
 * @param {object} status - Installation status object
 * @returns {string}
 */
export function getStatusMessage(status) {
    switch (status.state) {
        case 'idle':
            return 'Ready to start installation';
        case 'starting':
            return 'Preparing download...';
        case 'authenticating':
            return 'Waiting for device authorization';
        case 'downloading_game':
            return `Downloading Hytale Server (${status.progress}%)`;
        case 'extracting':
            return 'Extracting server files...';
        case 'finished':
            return 'Installation completed successfully';
        case 'error':
            return status.error || 'Installation failed';
        default:
            return 'Processing...';
    }
}