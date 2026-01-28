import { useState, useEffect } from 'react';
import * as settingsApi from '../../services/settingsApi';
import '../../styles/global.css';

function PanelSettingsForm() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await settingsApi.getPanelSettings();
            setSettings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleOsChange = (e) => {
        const newOs = e.target.value;
        setSettings(prev => ({
            ...prev,
            os: newOs,
            // Optional: Reset defaults if OS changes? For now just keep values but user can edit.
        }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            // Compute the start command to ensure it matches the preview
            const aotPart = (settings.aotCacheFile || 'HytaleServer.aot') ? `-XX:AOTCache=${settings.aotCacheFile || 'HytaleServer.aot'} ` : '';
            const startCommand = `java ${aotPart}-Xms${settings.minMemory} -Xmx${settings.maxMemory} -jar ${settings.jarFile} --assets ${settings.assetsFile}`;

            const payload = {
                ...settings,
                startCommand
            };

            await settingsApi.savePanelSettings(payload);

            // Update local state to reflect the saved command
            setSettings(payload);

            setSuccess('Panel settings saved successfully! Restart server to apply.');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (loading) return <div>Loading...</div>;
    if (error) return (
        <div className="card">
            <h2 className="card-title">Panel Configuration</h2>
            <div className="status-badge status-offline" style={{ display: 'block', marginBottom: '1rem' }}>
                Error: {error}
            </div>
            <button onClick={loadSettings} className="btn btn-secondary">Retry</button>
        </div>
    );
    if (!settings) return <div>No settings available</div>;

    return (
        <div className="card">
            <h2 className="card-title">Panel Configuration</h2>

            {error && <div className="status-badge status-offline" style={{ marginBottom: '1rem', display: 'block' }}>{error}</div>}
            {success && <div className="status-badge status-online" style={{ marginBottom: '1rem', display: 'block' }}>{success}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Operating System</label>
                    <select
                        name="os"
                        value={settings.os}
                        onChange={handleOsChange}
                        className="input-field"
                    >
                        <option value="windows">Windows</option>
                        <option value="linux">Linux</option>
                    </select>
                    <small>Select the OS where the panel is running to adjust default behavior.</small>
                </div>

                <div className="form-group">
                    <label>Server Path</label>
                    <input
                        type="text"
                        name="serverPath"
                        value={settings.serverPath}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="/path/to/server or C:\path\to\server"
                    />
                    <small>Absolute path to the directory containing hytale-server.jar</small>
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label>Min Memory (RAM)</label>
                            <input
                                type="text"
                                name="minMemory"
                                value={settings.minMemory}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="1G"
                            />
                            {/^\d+$/.test(settings.minMemory) && <small style={{ color: 'var(--accent-gold)' }}>Warning: Missing unit (e.g., '1G' or '1024M')</small>}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label>Max Memory (RAM)</label>
                            <input
                                type="text"
                                name="maxMemory"
                                value={settings.maxMemory}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="2G"
                            />
                            {/^\d+$/.test(settings.maxMemory) && <small style={{ color: 'var(--accent-gold)' }}>Warning: Missing unit (e.g., '2G' or '2048M')</small>}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Server Files</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <small style={{ marginBottom: '4px', display: 'block' }}>Server JAR</small>
                            <input
                                type="text"
                                name="jarFile"
                                value={settings.jarFile}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="HytaleServer.jar"
                            />
                        </div>
                        <div>
                            <small style={{ marginBottom: '4px', display: 'block' }}>Assets File</small>
                            <input
                                type="text"
                                name="assetsFile"
                                value={settings.assetsFile}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Assets.zip"
                            />
                        </div>
                        <div>
                            <small style={{ marginBottom: '4px', display: 'block' }}>AOT Cache File</small>
                            <input
                                type="text"
                                name="aotCacheFile"
                                value={settings.aotCacheFile || 'HytaleServer.aot'}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="HytaleServer.aot"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Command Preview</label>
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                        fontSize: '13px'
                    }}>
                        java {(settings.aotCacheFile || 'HytaleServer.aot') ? `-XX:AOTCache=${settings.aotCacheFile || 'HytaleServer.aot'} ` : ''}-Xms{settings.minMemory} -Xmx{settings.maxMemory} -jar {settings.jarFile} --assets {settings.assetsFile}
                    </div>
                    <small>This command is generated automatically from your settings.</small>
                </div>

                <div className="form-group">
                    <label>Server Port (Panel internal)</label>
                    <input
                        type="number"
                        name="port"
                        value={settings.port}
                        onChange={handleChange}
                        className="input-field"
                    />
                </div>

                <button type="submit" className="btn btn-primary">Save Panel Settings</button>
            </form>
        </div>
    );
}

export default PanelSettingsForm;
