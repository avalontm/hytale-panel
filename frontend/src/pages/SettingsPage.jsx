import { useState } from 'react';
import PanelSettingsForm from '../components/settings/PanelSettingsForm';
import ServerSettingsForm from '../components/settings/ServerSettingsForm';
import JsonFileEditor from '../components/settings/JsonFileEditor';
import ServerUpdateForm from '../components/settings/ServerUpdateForm';

function SettingsPage() {
    const [activeTab, setActiveTab] = useState('panel');
    const [activeFile, setActiveFile] = useState('whitelist.json');

    return (
        <div className="fade-in">
            <h1 className="page-title">Settings</h1>

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'panel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('panel')}
                >
                    Panel Configuration
                </button>
                <button
                    className={`tab-btn ${activeTab === 'server' ? 'active' : ''}`}
                    onClick={() => setActiveTab('server')}
                >
                    Server Configuration
                </button>
                <button
                    className={`tab-btn ${activeTab === 'update' ? 'active' : ''}`}
                    onClick={() => setActiveTab('update')}
                >
                    Server Update
                </button>
                <button
                    className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                    onClick={() => setActiveTab('files')}
                >
                    Configuration Files
                </button>
            </div>

            <div className="tab-content" style={{ marginTop: '1rem' }}>
                {activeTab === 'panel' && <PanelSettingsForm />}
                {activeTab === 'server' && <ServerSettingsForm />}
                {activeTab === 'update' && <ServerUpdateForm />}
                {activeTab === 'files' && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'inline-block', marginRight: '10px' }}>Select File:</label>
                            <select
                                value={activeFile}
                                onChange={(e) => setActiveFile(e.target.value)}
                                className="input-field"
                                style={{ width: 'auto', display: 'inline-block' }}
                            >
                                <option value="bans.json">bans.json</option>
                                <option value="permissions.json">permissions.json</option>
                                <option value="whitelist.json">whitelist.json</option>
                            </select>
                        </div>
                        <JsonFileEditor filename={activeFile} />
                    </div>
                )}
            </div>

            <style>{`
        .tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 2px solid var(--border-color);
          margin-bottom: 1.5rem;
        }
        .tab-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }
      `}</style>
        </div>
    );
}

export default SettingsPage;
