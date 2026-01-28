import { useState, useEffect } from 'react';
import * as settingsApi from '../../services/settingsApi';

function ServerSettingsForm() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await settingsApi.getServerSettings();
            setConfig(data);
        } catch (err) {
            setError(err.message + ". Check if Server Path is correct in Panel Settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value);

        setConfig(prev => ({ ...prev, [name]: val }));
    };

    const handleNestedChange = (parent, key, value) => {
        setConfig(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [key]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            await settingsApi.saveServerSettings(config);
            setSuccess('Server config.json saved! Restart server to apply.');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading config...</div>;
    if (error && !config) return <div className="status-badge status-offline">{error}</div>;

    return (
        <div className="card">
            <h2 className="card-title">Hytale Server Configuration (config.json)</h2>

            {error && <div className="status-badge status-offline" style={{ marginBottom: '1rem', display: 'block' }}>{error}</div>}
            {success && <div className="status-badge status-online" style={{ marginBottom: '1rem', display: 'block' }}>{success}</div>}

            <form onSubmit={handleSubmit}>
                {/* Basic Settings */}
                <div className="form-group">
                    <label>Server Name</label>
                    <input type="text" name="ServerName" value={config.ServerName || ''} onChange={handleChange} className="input-field" />
                </div>

                <div className="form-group">
                    <label>MOTD</label>
                    <input type="text" name="MOTD" value={config.MOTD || ''} onChange={handleChange} className="input-field" />
                </div>

                <div className="form-group">
                    <label>Max Players</label>
                    <input type="number" name="MaxPlayers" value={config.MaxPlayers || 20} onChange={handleChange} className="input-field" />
                </div>

                <div className="form-group">
                    <label>Max View Radius</label>
                    <input type="number" name="MaxViewRadius" value={config.MaxViewRadius || 16} onChange={handleChange} className="input-field" />
                </div>

                <div className="form-group">
                    <label>Password (leave empty for none)</label>
                    <input type="text" name="Password" value={config.Password || ''} onChange={handleChange} className="input-field" placeholder="No Password" />
                </div>

                {/* Defaults Object */}
                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Defaults</h3>
                <div className="form-group">
                    <label>Default World</label>
                    <input
                        type="text"
                        value={config.Defaults?.World || ''}
                        onChange={(e) => handleNestedChange('Defaults', 'World', e.target.value)}
                        className="input-field"
                    />
                </div>
                <div className="form-group">
                    <label>Game Mode</label>
                    <select
                        value={config.Defaults?.GameMode || 'Adventure'}
                        onChange={(e) => handleNestedChange('Defaults', 'GameMode', e.target.value)}
                        className="input-field"
                    >
                        <option value="Adventure">Adventure</option>
                        <option value="Creative">Creative</option>
                        <option value="Survival">Survival</option>
                    </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Server Config</button>
            </form>
        </div>
    );
}

export default ServerSettingsForm;
