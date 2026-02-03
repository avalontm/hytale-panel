import { useState, useEffect } from 'react';
import { playerAPI } from '../services/api';
import { useDialog } from '../contexts/DialogContext';
import {
    Users, Shield, ShieldOff, Edit2, MapPin, Activity,
    Heart, Zap, Wind, Save, X, ChevronRight, Gamepad2, Search
} from 'lucide-react';
import '../styles/global.css';

function PlayersPage() {
    const dialog = useDialog();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [selectedUuid, setSelectedUuid] = useState(null);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        setLoading(true);
        try {
            const response = await playerAPI.list();
            setPlayers(response.data);
        } catch (err) {
            console.error('Failed to load players:', err);
            dialog.showAlert('Failed to load players list');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlayer = async (uuid) => {
        try {
            const response = await playerAPI.get(uuid);
            setSelectedUuid(uuid);
            setSelectedPlayer(response.data);
            setEditingPlayer(JSON.parse(JSON.stringify(response.data))); // Deep clone for editing
        } catch (err) {
            dialog.showAlert('Failed to load player details');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const uuid = selectedUuid || selectedPlayer?.uuid;
            if (!uuid) throw new Error("Internal Error: Player UUID is missing. Please re-select the player.");
            // Hytal Panel expects a specific update structure defined in PlayerService.js
            const updates = {
                Components: {
                    EntityStats: {
                        Stats: editingPlayer.Components.EntityStats.Stats
                    },
                    Player: {
                        GameMode: editingPlayer.Components.Player.GameMode
                    }
                },
                isOp: editingPlayer.isOp
            };

            await playerAPI.update(uuid, updates);
            dialog.showAlert('Player updated successfully!', 'Success');
            handleSelectPlayer(uuid); // Reload details
            loadPlayers(); // Refresh list
        } catch (err) {
            dialog.showAlert('Failed to update player: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const toggleOp = () => {
        setEditingPlayer(prev => ({ ...prev, isOp: !prev.isOp }));
    };

    const handleStatChange = (statKey, value) => {
        setEditingPlayer(prev => {
            const newStats = { ...prev.Components.EntityStats.Stats };
            newStats[statKey] = { ...newStats[statKey], Value: parseFloat(value) };
            return {
                ...prev,
                Components: {
                    ...prev.Components,
                    EntityStats: {
                        ...prev.Components.EntityStats,
                        Stats: newStats
                    }
                }
            };
        });
    };

    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.uuid.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="page-loading">Searching for players...</div>;

    return (
        <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Player Management</h1>
                    <p className="page-subtitle">View and manage Hytale server players</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
                {/* Player List */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} />
                            <strong>Players ({players.length})</strong>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 36px',
                                    fontSize: '14px',
                                    height: '38px'
                                }}
                            />
                            {searchQuery && (
                                <X
                                    size={16}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
                                    onClick={() => setSearchQuery('')}
                                />
                            )}
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {filteredPlayers.map(p => (
                            <div
                                key={p.uuid}
                                onClick={() => handleSelectPlayer(p.uuid)}
                                style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    background: selectedPlayer?.uuid === p.uuid ? 'var(--bg-secondary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: '600' }}>{p.name}</div>
                                    <small style={{ color: 'var(--text-muted)' }}>{p.gameMode}</small>
                                </div>
                                <ChevronRight size={16} opacity={0.5} />
                            </div>
                        ))}
                        {players.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No players found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Player Details/Editor */}
                <div className="card" style={{ padding: '24px', overflowY: 'auto' }}>
                    {!selectedPlayer ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <Users size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>Select a player to view details and edit.</p>
                        </div>
                    ) : (
                        <div className="fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>{selectedPlayer.Components.DisplayName.DisplayName.RawText}</h2>
                                    <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedPlayer.uuid}</code>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        className={`btn ${editingPlayer.isOp ? 'btn-danger' : 'btn-primary'}`}
                                        onClick={toggleOp}
                                    >
                                        {editingPlayer.isOp ? <><ShieldOff size={16} /> De-OP</> : <><Shield size={16} /> Make OP</>}
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {/* General Info & Stats */}
                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Activity size={18} /> Character Stats
                                    </h3>

                                    <div className="form-group" style={{ marginBottom: '16px' }}>
                                        <label>Game Mode</label>
                                        <select
                                            value={editingPlayer.Components.Player.GameMode}
                                            onChange={(e) => setEditingPlayer(prev => ({
                                                ...prev,
                                                Components: {
                                                    ...prev.Components,
                                                    Player: { ...prev.Components.Player, GameMode: e.target.value }
                                                }
                                            }))}
                                        >
                                            <option value="Survival">Survival</option>
                                            <option value="Creative">Creative</option>
                                            <option value="Adventure">Adventure</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div className="form-group">
                                            <label><Heart size={14} /> Health</label>
                                            <input
                                                type="number"
                                                value={editingPlayer.Components.EntityStats.Stats.Health.Value}
                                                onChange={(e) => handleStatChange('Health', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label><Zap size={14} /> Mana</label>
                                            <input
                                                type="number"
                                                value={editingPlayer.Components.EntityStats.Stats.Mana.Value}
                                                onChange={(e) => handleStatChange('Mana', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label><Wind size={14} /> Oxygen</label>
                                            <input
                                                type="number"
                                                value={editingPlayer.Components.EntityStats.Stats.Oxygen.Value}
                                                onChange={(e) => handleStatChange('Oxygen', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label><Wind size={14} /> Stamina</label>
                                            <input
                                                type="number"
                                                value={editingPlayer.Components.EntityStats.Stats.Stamina.Value}
                                                onChange={(e) => handleStatChange('Stamina', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* World Info */}
                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={18} /> World Context
                                    </h3>

                                    <div className="card" style={{ background: 'var(--bg-primary)', margin: 0, padding: '16px' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <small style={{ color: 'var(--text-muted)' }}>Location</small>
                                            <div>
                                                X: {editingPlayer.Components.Transform.Position.X.toFixed(2)} <br />
                                                Y: {editingPlayer.Components.Transform.Position.Y.toFixed(2)} <br />
                                                Z: {editingPlayer.Components.Transform.Position.Z.toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            <small style={{ color: 'var(--text-muted)' }}>Rotation (Yaw)</small>
                                            <div>{editingPlayer.Components.Transform.Rotation.Yaw.toFixed(2)}°</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '24px' }}>
                                        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Gamepad2 size={18} /> Inventory Status
                                        </h3>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                            Hotbar Slots: {Object.keys(editingPlayer.Components.Player.Inventory.HotBar.Items).length} items <br />
                                            Main Storage: {Object.keys(editingPlayer.Components.Player.Inventory.Storage.Items).length} items
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PlayersPage;
