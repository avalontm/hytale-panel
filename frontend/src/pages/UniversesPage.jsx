import { useState, useEffect } from 'react';
import { Globe, RefreshCw, Layers, Shield, Zap, ChevronRight, Binary } from 'lucide-react';
import { universeAPI } from '../services/api';
import './UniversesPage.css';

function UniversesPage() {
    const [universes, setUniverses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUniverse, setSelectedUniverse] = useState(null);

    const fetchUniverses = async () => {
        setLoading(true);
        try {
            const response = await universeAPI.list();
            setUniverses(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch universes:', err);
            setError('Could not load universes. Ensure the server path is correct.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUniverses();
    }, []);

    return (
        <div className="universes-page fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Universes</h1>
                    <p className="page-subtitle">Manage and monitor Hytale worlds</p>
                </div>
                <button
                    className="btn btn-secondary fetch-btn"
                    onClick={fetchUniverses}
                    disabled={loading}
                >
                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="error-message-card">
                    <p>{error}</p>
                </div>
            )}

            <div className="universes-grid">
                {universes.length > 0 ? (
                    universes.map((universe) => (
                        <div key={universe.name} className="universe-card card">
                            <div className="universe-card-header">
                                <div className="universe-icon">
                                    <Globe size={24} />
                                </div>
                                <div className="universe-title">
                                    <h3>{universe.displayName}</h3>
                                    <span className="universe-path">/universe/worlds/{universe.name}</span>
                                </div>
                                <div className={`status-pill ${universe.isTicking ? 'active' : 'inactive'}`}>
                                    {universe.isTicking ? 'ACTIVE' : 'IDLE'}
                                </div>
                            </div>

                            <div className="universe-stats-grid">
                                <div className="u-stat">
                                    <span className="u-label"><Binary size={14} /> Seed</span>
                                    <span className="u-value">{universe.seed}</span>
                                </div>
                                <div className="u-stat">
                                    <span className="u-label"><Layers size={14} /> Generator</span>
                                    <span className="u-value">{universe.worldGenType} ({universe.version})</span>
                                </div>
                                <div className="u-stat">
                                    <span className="u-label"><Zap size={14} /> Game Time</span>
                                    <span className="u-value">{new Date(universe.gameTime).toLocaleTimeString()}</span>
                                </div>
                                <div className="u-stat">
                                    <span className="u-label"><Shield size={14} /> PVP</span>
                                    <span className="u-value">{universe.pvp ? 'Enabled' : 'Disabled'}</span>
                                </div>
                            </div>

                            <div className="universe-toggles">
                                <div className="toggle-info">
                                    <span className={universe.saving?.players ? 'enabled' : 'disabled'}>
                                        Saving Players: {universe.saving?.players ? 'YES' : 'NO'}
                                    </span>
                                    <span className={universe.saving?.chunks ? 'enabled' : 'disabled'}>
                                        Saving Chunks: {universe.saving?.chunks ? 'YES' : 'NO'}
                                    </span>
                                </div>
                            </div>

                            <div className="universe-card-footer">
                                <button
                                    className="btn btn-primary compact"
                                    onClick={() => setSelectedUniverse(universe)}
                                >
                                    View Details <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : !loading && !error && (
                    <div className="empty-state">
                        <Globe size={48} />
                        <h3>No Universes Found</h3>
                        <p>Start your server to generate the default world.</p>
                    </div>
                )}
            </div>

            {selectedUniverse && (
                <div className="modal-overlay" onClick={() => setSelectedUniverse(null)}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>World Configuration: {selectedUniverse.displayName}</h2>
                            <button className="close-btn" onClick={() => setSelectedUniverse(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <pre className="json-display">
                                {JSON.stringify(selectedUniverse.config, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UniversesPage;
