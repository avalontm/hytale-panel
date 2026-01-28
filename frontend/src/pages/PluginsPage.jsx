import { useState, useEffect, useCallback, useRef } from 'react';
import { pluginAPI } from '../services/api';
import * as settingsAPI from '../services/settingsApi';
import { useDialog } from '../contexts/DialogContext';
import {
    Package, Trash2, Upload, Search, Download, Layers,
    ExternalLink, Settings
} from 'lucide-react';
import '../styles/global.css';

function PluginsPage() {
    const dialog = useDialog();
    const [activeTab, setActiveTab] = useState('installed'); // installed | browse | providers

    // Installed State
    const [localPlugins, setLocalPlugins] = useState([]);
    const [loadingLocal, setLoadingLocal] = useState(false);

    // Browse State
    const [provider, setProvider] = useState('CurseForge');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [installingModId, setInstallingModId] = useState(null); // Track installing state

    // Providers Config State
    const [providerSettings, setProviderSettings] = useState({
        curseforge: { apiKey: '' }
    });

    // Upload State
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // --- Init ---
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await settingsAPI.getPanelSettings();
            if (settings.modProviders) {
                setProviderSettings(settings.modProviders);
            }
        } catch (err) {
            console.error("Failed to load settings", err);
        }
    };

    // --- Local Mods Logic ---
    const loadLocalPlugins = useCallback(async () => {
        setLoadingLocal(true);
        try {
            const response = await pluginAPI.list();
            setLocalPlugins(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingLocal(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'installed') {
            loadLocalPlugins();
        }
    }, [activeTab, loadLocalPlugins]);

    const handleDelete = async (name) => {
        const confirmed = await dialog.showConfirm(`Delete mod '${name}'?`, "Delete Mod");
        if (!confirmed) return;
        try {
            await pluginAPI.delete(name);
            loadLocalPlugins();
        } catch (err) {
            dialog.showAlert("Failed to delete: " + err.message);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        await processUploads(files);
        e.target.value = null;
    };

    const processUploads = async (files) => {
        setUploading(true);
        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.jar')) {
                dialog.showAlert(`Skipped ${file.name}: Only .jar files are allowed.`);
                continue;
            }
            try {
                await pluginAPI.upload(file);
            } catch (err) {
                console.error(err);
                dialog.showAlert(`Failed to upload ${file.name}`);
            }
        }
        setUploading(false);
        loadLocalPlugins();
    };

    // Drag & Drop Handlers
    const onDragOver = (e) => {
        e.preventDefault();
        if (activeTab === 'installed') setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        if (activeTab === 'installed') setIsDragging(false);
    };

    const onDrop = async (e) => {
        e.preventDefault();
        if (activeTab !== 'installed') return;
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length === 0) return;

        await processUploads(droppedFiles);
    };


    // --- Search Logic ---
    const handleSearch = async (e) => {
        e?.preventDefault();
        setLoadingSearch(true);
        try {
            const response = await pluginAPI.search(provider, searchQuery);
            setSearchResults(response.data);
        } catch (err) {
            dialog.showAlert("Search failed: " + err.message);
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleInstall = async (mod) => {
        if (!mod.downloadUrl && !mod.latestFileId) {
            dialog.showAlert("No download link available for this mod.");
            return;
        }

        setInstallingModId(mod.id);

        try {
            let downloadUrl = mod.downloadUrl;

            // Only try to fetch fresh URL if we don't have one
            if (!downloadUrl && mod.latestFileId && providerSettings.curseforge?.apiKey) {
                try {
                    const res = await pluginAPI.getDownloadUrl(provider, mod.id, mod.latestFileId);
                    if (res.data.url) downloadUrl = res.data.url;
                } catch (err) {
                    console.error("Failed to get download URL:", err);
                    throw new Error("Failed to get download link. Check API Key.");
                }
            }

            if (!downloadUrl) {
                throw new Error("Could not retrieve download URL.");
            }

            // Guess filename (use latestFileName if available, else name)
            const safeName = (mod.latestFileName || mod.name + '.jar').replace(/[^a-z0-9._-]/gi, '_');

            // Prepare metadata
            const metadata = {
                modId: mod.id,
                name: mod.name,
                logo: mod.logo,
                summary: mod.summary,
                websiteUrl: mod.websiteUrl,
                provider: 'curseforge'
            };

            await pluginAPI.installRemote(downloadUrl, safeName, metadata);
            dialog.showAlert(`Installed ${mod.name}!`, "Success");

            // Refresh local plugins to show the new install immediately
            loadLocalPlugins();
        } catch (err) {
            dialog.showAlert("Installation failed: " + err.message);
        } finally {
            setInstallingModId(null);
        }
    };

    // Helper to check if a mod is installed
    const isInstalled = (modId) => {
        return localPlugins.some(p => p.modId === modId);
    };

    // --- Provider Settings Logic ---
    const saveProviderSettings = async () => {
        try {
            const current = await settingsAPI.getPanelSettings();
            const updated = { ...current, modProviders: providerSettings };
            await settingsAPI.savePanelSettings(updated);
            dialog.showAlert("Settings saved successfully!", "Success");
        } catch (err) {
            dialog.showAlert("Failed to save settings: " + err.message);
        }
    };

    return (
        <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="dashboard-header" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'
            }}>
                <div>
                    <h1 className="page-title">Mod Manager</h1>
                    <p className="page-subtitle">Manage your server's mods and plugins</p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: '8px', background: 'var(--bg-secondary)',
                    padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)'
                }}>
                    <button
                        className={`btn ${activeTab === 'installed' ? 'btn-primary' : 'btn-ghost'}`}
                        style={activeTab !== 'installed' ? { background: 'transparent', border: 'none', color: 'var(--text-secondary)' } : {}}
                        onClick={() => setActiveTab('installed')}
                    >
                        Installed
                    </button>
                    <button
                        className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-ghost'}`}
                        style={activeTab !== 'browse' ? { background: 'transparent', border: 'none', color: 'var(--text-secondary)' } : {}}
                        onClick={() => setActiveTab('browse')}
                    >
                        Browse Providers
                    </button>
                    <button
                        className={`btn ${activeTab === 'providers' ? 'btn-primary' : 'btn-ghost'}`}
                        style={activeTab !== 'providers' ? { background: 'transparent', border: 'none', color: 'var(--text-secondary)' } : {}}
                        onClick={() => setActiveTab('providers')}
                    >
                        <Settings size={16} /> Providers
                    </button>
                </div>
            </div>

            {/* Content Area with Drag & Drop */}
            <div
                style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {/* Drop Overlay */}
                {isDragging && activeTab === 'installed' && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 10,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: 'white', pointerEvents: 'none'
                    }}>
                        <Upload size={64} style={{ marginBottom: '1rem' }} />
                        <h2>Drop Jar files to install</h2>
                    </div>
                )}

                {/* INSTALLED TAB */}
                {activeTab === 'installed' && (
                    <>
                        <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                <Package size={24} />
                                <span>
                                    <strong>{localPlugins.length}</strong> mods installed
                                </span>
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".jar"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : <><Upload size={18} /> Upload Jar</>}
                                </button>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                            gap: '20px'
                        }}>
                            {localPlugins.map(mod => (
                                <div key={mod.name} className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {mod.logo ? (
                                            <img src={mod.logo} alt={mod.displayName} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{
                                                width: '40px', height: '40px', background: 'var(--bg-primary)',
                                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--accent-gold)'
                                            }}>
                                                <Package size={20} />
                                            </div>
                                        )}
                                        <div style={{ overflow: 'hidden' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {mod.websiteUrl ? (
                                                    <a
                                                        href={mod.websiteUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ color: 'inherit', textDecoration: 'none' }}
                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                        title="Open Website"
                                                    >
                                                        {mod.displayName || mod.name} <ExternalLink size={10} style={{ marginLeft: '4px', opacity: 0.7 }} />
                                                    </a>
                                                ) : (
                                                    mod.displayName || mod.name
                                                )}
                                            </h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <small title={mod.name} style={{ cursor: 'help' }}>{(mod.size / 1024 / 1024).toFixed(2)} MB</small>
                                                {mod.websiteUrl && (
                                                    <a href={mod.websiteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center' }} title="View on CurseForge">
                                                        <ExternalLink size={12} />
                                                    </a>
                                                )}
                                                <span style={{
                                                    fontSize: '11px',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    color: 'var(--text-muted)'
                                                }}>
                                                    {mod.provider === 'curseforge' ? 'CurseForge' : 'Manual'}
                                                </span>
                                            </div>
                                            {mod.description && (
                                                <p style={{
                                                    fontSize: '12px', color: 'var(--text-secondary)',
                                                    margin: '4px 0 0 0',
                                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                                }}>
                                                    {mod.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(mod.name)}
                                        className="btn btn-danger"
                                        style={{ marginTop: 'auto', width: '100%', padding: '8px' }}
                                    >
                                        <Trash2 size={16} /> Uninstall
                                    </button>
                                </div>
                            ))}
                        </div>
                        {localPlugins.length === 0 && !loadingLocal && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No mods installed. Upload one or browse providers.
                            </div>
                        )}
                    </>
                )}

                {/* BROWSE TAB */}
                {activeTab === 'browse' && (
                    <>
                        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
                            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    style={{ width: 'auto', minWidth: '150px' }}
                                >
                                    <option value="CurseForge">CurseForge</option>
                                    {/* Future Providers here */}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search mods..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn btn-primary" disabled={loadingSearch}>
                                    <Search size={18} /> Search
                                </button>
                            </form>
                            {!providerSettings.curseforge?.apiKey && (
                                <div className="alert alert-warning" style={{ marginTop: '10px', fontSize: '14px' }}>
                                    <strong>Demo Mode:</strong> You haven't configured a CurseForge API Key. Displaying mock results.
                                    <br />
                                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('providers'); }} style={{ color: 'var(--accent-gold)' }}>Go to Providers settings</a>
                                </div>
                            )}
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '20px'
                        }}>
                            {searchResults.map(mod => {
                                const installed = isInstalled(mod.id);
                                return (
                                    <div key={mod.id} className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            {mod.logo ? (
                                                <img src={mod.logo} alt={mod.name} style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '64px', height: '64px', background: 'var(--bg-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Layers size={32} color="var(--text-muted)" />
                                                </div>
                                            )}
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                                                    {mod.websiteUrl ? (
                                                        <a
                                                            href={mod.websiteUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ color: 'inherit', textDecoration: 'none' }}
                                                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                            title="View on CurseForge"
                                                        >
                                                            {mod.name} <ExternalLink size={12} style={{ marginLeft: '4px', opacity: 0.7 }} />
                                                        </a>
                                                    ) : (
                                                        mod.name
                                                    )}
                                                </h3>
                                                <small style={{ color: 'var(--text-muted)' }}>by {mod.author}</small>
                                            </div>
                                        </div>
                                        <p style={{
                                            fontSize: '13px', color: 'var(--text-secondary)',
                                            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            flex: 1
                                        }}>
                                            {mod.summary}
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                            <button
                                                onClick={() => !installed && handleInstall(mod)}
                                                className={`btn ${installed ? 'btn-secondary' : 'btn-primary'}`}
                                                style={{ flex: 1 }}
                                                disabled={(!mod.downloadUrl && !mod.latestFileId) || installingModId === mod.id || installed}
                                            >
                                                {installingModId === mod.id ? (
                                                    <><Download size={16} className="spin" /> Installing...</>
                                                ) : installed ? (
                                                    <><Package size={16} /> Installed</>
                                                ) : (
                                                    <><Download size={16} /> Install</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* PROVIDERS CONFIG TAB */}
                {activeTab === 'providers' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className="card">
                            <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                CurseForge Configuration
                            </h2>
                            <div className="form-group">
                                <label>API Key</label>
                                <input
                                    type="password"
                                    value={providerSettings.curseforge?.apiKey || ''}
                                    onChange={(e) => setProviderSettings({
                                        ...providerSettings,
                                        curseforge: { ...providerSettings.curseforge, apiKey: e.target.value }
                                    })}
                                    placeholder="Enter your CurseForge API Key"
                                />
                                <small style={{ color: 'var(--text-secondary)', marginTop: '8px', display: 'block' }}>
                                    Required to search and download real mods.
                                    <a href="https://console.curseforge.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)', marginLeft: '4px' }}>
                                        Get an API Key <ExternalLink size={12} />
                                    </a>
                                </small>
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: '20px' }}
                                onClick={saveProviderSettings}
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PluginsPage;
