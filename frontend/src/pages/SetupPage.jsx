import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
    User, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft,
    Settings, Server, Cpu, Globe, CheckCircle2, Loader2, Search,
    Download, ExternalLink, Copy, Terminal
} from 'lucide-react';
import './LoginPage.css';
import './SetupPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function SetupPage() {
    const [step, setStep] = useState(1);
    const [installMode, setInstallMode] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        password: '',
        confirmPassword: ''
    });
    const [settings, setSettings] = useState({
        os: 'windows',
        serverPath: '',
        jarFile: 'HytaleServer.jar',
        assetsFile: 'Assets.zip',
        maxMemory: '2G',
        minMemory: '1G',
        port: 5520
    });
    const [detection, setDetection] = useState({
        loading: false,
        results: null
    });
    const [installStatus, setInstallStatus] = useState({
        state: 'idle',
        deviceCode: null,
        verificationUrl: null,
        progress: 0,
        error: null,
        logs: []
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setup } = useAuth();

    useEffect(() => {
        let interval;
        const activeStates = ['downloading_tool', 'extracting_tool', 'downloading_game', 'extracting', 'authenticating', 'starting'];

        if (activeStates.includes(installStatus.state)) {
            interval = setInterval(async () => {
                try {
                    const response = await axios.get(`${API_URL}/installer/status`);
                    setInstallStatus(response.data);

                    if (response.data.state === 'finished') {
                        clearInterval(interval);
                        // Installation is done, user can now click "Complete Setup" or we can auto-trigger it
                        // For safety, let's just stop polling and let the UI update (which it will via state)
                    }
                    // Handle tool download completion specifically
                    if (response.data.state === 'tool_installed') {
                        clearInterval(interval);
                        // Refresh prerequisites
                        checkPrerequisites();
                        // Reset status slightly delayed to avoid flash, or keep it to show 100%
                        setTimeout(() => {
                            setInstallStatus(prev => ({ ...prev, state: 'idle' }));
                        }, 2000);
                    }
                    if (response.data.state === 'error') {
                        clearInterval(interval);
                        setError(response.data.error);
                        // Don't auto-reset error for tools, let user see it
                        if (installStatus.state === 'downloading_tool') {
                            setPrerequisites(prev => ({ ...prev, checking: false, error: response.data.error }));
                        }
                    }
                } catch (err) {
                    console.error('Failed to poll installer status');
                }
            }, 1000); // Faster polling for smooth progress
        }
        return () => clearInterval(interval);
    }, [installStatus.state]);

    const handleNext = () => {
        if (step === 1) {
            if (!formData.user || !formData.password) {
                return setError('Please fill all fields');
            }
            if (formData.password.length < 6) {
                return setError('Password must be at least 6 characters long');
            }
            if (formData.password !== formData.confirmPassword) {
                return setError('Passwords do not match');
            }
        }
        if (step === 2) {
            setError('');
        }
        if (step === 4 && !settings.serverPath) {
            return setError('Please provide a server path');
        }
        setError('');
        setStep(step + 1);
    };

    const handleBack = () => {
        setError('');
        if (step === 6 && installMode === 'manual') {
            setStep(4);
            return;
        }
        setStep(step - 1);
    };

    const detectSystem = async () => {
        setDetection({ ...detection, loading: true });
        try {
            const response = await axios.get(`${API_URL}/auth/detect-system`);
            const { os, detectedPath, defaultPath, javaVersion } = response.data;

            setSettings(prev => ({
                ...prev,
                os,
                serverPath: defaultPath || detectedPath || prev.serverPath
            }));
            setDetection({ loading: false, results: { javaVersion, detectedPath } });
        } catch (err) {
            setDetection({ loading: false, results: { error: 'Failed' } });
        }
    };

    const [prerequisites, setPrerequisites] = useState({
        checking: false,
        available: true, // Optimistic default to avoid flash
        error: null
    });

    const checkPrerequisites = async () => {
        setPrerequisites({ ...prerequisites, checking: true });
        try {
            const response = await axios.get(`${API_URL}/installer/prerequisites`);
            setPrerequisites({
                checking: false,
                available: response.data.available,
                error: response.data.error
            });
        } catch (err) {
            setPrerequisites({ checking: false, available: false, error: 'Failed to check' });
        }
    };

    useEffect(() => {
        if (step === 4 && installMode === 'auto') {
            checkPrerequisites();
        }
    }, [step, installMode]);

    const startAutoInstall = async () => {
        if (!settings.serverPath) {
            return setError('Please specify a destination path');
        }
        if (!prerequisites.available) {
            return setError('Hytale Downloader is missing. Please download it first.');
        }
        setError('');
        try {
            await axios.post(`${API_URL}/installer/start`, { targetPath: settings.serverPath });
            setInstallStatus({ ...installStatus, state: 'starting' });
            setStep(5);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start installation');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await setup({
            user: {
                user: formData.user,
                // Email removed as per requirement
                password: formData.password
            },
            settings: settings
        });

        if (!result.success) {
            setError(result.error);
            setLoading(false);
        } else {
            window.location.href = '/login';
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSettingsChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const steps = [
        { n: 1, label: 'Account' },
        { n: 2, label: 'Environment' },
        { n: 3, label: 'Method' },
        { n: 4, label: 'Location' },
        { n: 5, label: 'Summary' }
    ].filter(s => !s.skip);

    return (
        <div className="login-page">
            <div className="login-overlay"></div>
            <div className="login-container fade-in">
                <div className="login-card">
                    <div className="setup-progress">
                        {steps.map((s, idx) => (
                            <div key={s.n} className="setup-progress-item">
                                <div className={`progress-dot ${step === s.n ? 'active' : (step > s.n ? 'completed' : '')}`}>
                                    {step > s.n ? <CheckCircle2 size={16} /> : s.n}
                                </div>
                                {idx < steps.length - 1 && <div className={`progress-line ${step > s.n ? 'active' : ''}`}></div>}
                            </div>
                        ))}
                    </div>

                    <div className="login-header">
                        <img src="/static/images/logo.png" alt="Hytale Logo" className="login-logo" />
                        {step === 1 && (
                            <>
                                <h1>Primary Admin</h1>
                                <p>Create your master account</p>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <h1>Environment Check</h1>
                                <p>Verifying server platform and Java status</p>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <h1>Installation Method</h1>
                                <p>How would you like to set up the server?</p>
                            </>
                        )}
                        {step === 4 && (
                            <>
                                <h1>Server Location</h1>
                                <p>{installMode === 'auto' ? 'Where should we install the server?' : 'Specify where your server is located'}</p>
                            </>
                        )}
                        {step === 5 && (
                            <>
                                <h1>Installing...</h1>
                                <p>{installStatus.state === 'authenticating' ? 'Device Authorization Required' : 'Downloading Hytale Server'}</p>
                            </>
                        )}
                        {step === 6 && (
                            <>
                                <h1>Ready to Launch!</h1>
                                <p>Verify your settings and complete setup</p>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="login-error">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="login-form">
                            <div className="form-group">
                                <label>Username</label>
                                <div className="input-with-icon">
                                    <User className="input-icon" size={18} />
                                    <input type="text" name="user" placeholder="admin" value={formData.user} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <div className="input-with-icon">
                                    <Lock className="input-icon" size={18} />
                                    <input type="password" name="password" placeholder="********" value={formData.password} onChange={handleChange} required minLength={6} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <div className="input-with-icon">
                                    <Lock className="input-icon" size={18} />
                                    <input type="password" name="confirmPassword" placeholder="********" value={formData.confirmPassword} onChange={handleChange} required />
                                </div>
                            </div>
                            <button onClick={handleNext} className="btn btn-primary login-btn">
                                Next Step <ArrowRight size={20} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="login-form">
                            <div className="form-group">
                                <label>Operating System</label>
                                <select name="os" value={settings.os} onChange={handleSettingsChange}>
                                    <option value="windows">Windows</option>
                                    <option value="linux">Linux</option>
                                    <option value="macos">macOS</option>
                                </select>
                            </div>

                            <div className="java-status-card">
                                <div className="card-header">
                                    <Cpu size={20} className="text-blue" />
                                    <h4>Java Runtime Status</h4>
                                </div>
                                <div className="card-body">
                                    {!detection.results ? (
                                        <button onClick={detectSystem} disabled={detection.loading} className="btn btn-secondary check-btn">
                                            {detection.loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                            Check Java Installation
                                        </button>
                                    ) : (
                                        <div className="java-result-container">
                                            <div className={`status-pill ${detection.results.javaVersion === 'Not Found' ? 'error' : 'success'}`}>
                                                {detection.results.javaVersion === 'Not Found' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                                                <div>
                                                    <strong>{detection.results.javaVersion === 'Not Found' ? 'Java Not Found' : 'Java Detected'}</strong>
                                                    <p>{detection.results.javaVersion}</p>
                                                </div>
                                            </div>

                                            {detection.results.javaVersion === 'Not Found' && (
                                                <div className="java-instructions fade-in">
                                                    <h5><Terminal size={16} /> How to install <strong>Java 25</strong>:</h5>

                                                    {settings.os === 'windows' ? (
                                                        <div className="instruction-steps">
                                                            <p>1. Download the <strong>x64 Installer</strong> from <a href="https://www.oracle.com/java/technologies/downloads/#java25" target="_blank" rel="noopener">Oracle</a> or <a href="https://adoptium.net/temurin/releases/?version=25" target="_blank" rel="noopener">Adoptium</a>.</p>
                                                            <p>2. Run the <code>.exe</code> and follow the installation wizard.</p>
                                                            <p>3. Restart this panel (or the command prompt) so it detects the new <code>PATH</code>.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="instruction-steps">
                                                            <p>Run these commands in your terminal:</p>
                                                            <pre>
                                                                <code>
                                                                    {`# Download Java 25\nwget https://download.oracle.com/java/25/latest/jdk-25_linux-x64_bin.tar.gz\n\n# Extract and setup\nsudo mkdir -p /usr/lib/jvm\nsudo tar -xzf jdk-25_linux-x64_bin.tar.gz -C /usr/lib/jvm/\n\n# Update alternatives\nsudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/jdk-25/bin/java" 1`}
                                                                </code>
                                                            </pre>
                                                        </div>
                                                    )}
                                                    <button onClick={detectSystem} className="btn-text-action">
                                                        <Search size={14} /> Re-scan for Java
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="multi-step-buttons">
                                <button onClick={handleBack} className="btn btn-secondary">
                                    <ArrowLeft size={18} /> Back
                                </button>
                                <button onClick={handleNext} className="btn btn-primary" disabled={!detection.results || detection.results.javaVersion === 'Not Found'}>
                                    Next Step <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="install-mode-grid">
                            <button
                                className={`install-mode-card ${installMode === 'auto' ? 'selected' : ''}`}
                                onClick={() => { setInstallMode('auto'); handleNext(); }}
                            >
                                <div className="mode-icon"><Download size={32} /></div>
                                <h3>Automatic Download</h3>
                                <p>We'll handle the Hytale Downloader for you</p>
                            </button>

                            <button
                                className={`install-mode-card ${installMode === 'manual' ? 'selected' : ''}`}
                                onClick={() => { setInstallMode('manual'); handleNext(); }}
                            >
                                <div className="mode-icon"><Server size={32} /></div>
                                <h3>Manual Mode</h3>
                                <p>Point us to your existing server files</p>
                            </button>

                            <div className="multi-step-buttons" style={{ gridColumn: 'span 2' }}>
                                <button onClick={handleBack} className="btn btn-secondary">
                                    <ArrowLeft size={18} /> Back
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="login-form">
                            <div className="form-group">
                                <label>Server Files Path</label>
                                <div className="input-with-action">
                                    <div className="input-with-icon">
                                        <Server className="input-icon" size={18} />
                                        <input type="text" name="serverPath" placeholder="C:\Hytale\Server" value={settings.serverPath} onChange={handleSettingsChange} />
                                    </div>
                                    {installMode === 'manual' && (
                                        <button onClick={detectSystem} disabled={detection.loading} className="btn-icon-action" title="Auto-detect existing">
                                            {detection.loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                        </button>
                                    )}
                                    {installMode === 'manual' && detection.results?.detectedPath && (
                                        <div className="detection-tag tag-success" style={{ marginTop: '10px' }}>
                                            <CheckCircle2 size={14} /> Found existing server at location
                                        </div>
                                    )}
                                </div>
                            </div>

                            {installMode === 'auto' && (
                                <div style={{ marginTop: '1rem' }}>
                                    {prerequisites.checking ? (
                                        <div className="status-pill"><Loader2 className="animate-spin" size={14} /> Checking system requirements...</div>
                                    ) : !prerequisites.available ? (
                                        <div className="java-status-card" style={{ border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                                            <div className="card-header" style={{ color: '#ef4444' }}>
                                                <AlertCircle size={20} />
                                                <h4>Downloader Tool Missing</h4>
                                            </div>
                                            <div className="card-body">
                                                <p style={{ marginBottom: '10px' }}>The Hytale Downloader tool is required to proceed. The panel can attempt to download and set it up for you.</p>

                                                {!['downloading_tool', 'extracting_tool', 'tool_installed'].includes(installStatus.state) ? (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                // Start polling immediately by setting state first
                                                                setInstallStatus(prev => ({
                                                                    ...prev,
                                                                    state: 'downloading_tool',
                                                                    progress: 0,
                                                                    logs: ['Initiating download...']
                                                                }));

                                                                await axios.post(`${API_URL}/installer/download-tool`);

                                                                // We rely on the useEffect poll to handle updates now
                                                            } catch (err) {
                                                                setError('Failed to start download');
                                                                setInstallStatus(prev => ({ ...prev, state: 'error' }));
                                                            }
                                                        }}
                                                        className="btn btn-primary"
                                                        style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }}
                                                    >
                                                        <Download size={18} /> Download & Install Tool Automatically
                                                    </button>
                                                ) : (
                                                    <div className="download-step fade-in" style={{ marginTop: '0', padding: '0', background: 'transparent' }}>
                                                        <div className="progress-container">
                                                            <div className="progress-label">
                                                                <span style={{ fontSize: '13px' }}>{installStatus.state === 'extracting_tool' ? 'Extracting Tool...' : 'Downloading Tool...'}</span>
                                                                <span>{installStatus.progress}%</span>
                                                            </div>
                                                            <div className="progress-bar-bg">
                                                                <div className="progress-bar-fill" style={{ width: `${installStatus.progress}%` }}></div>
                                                            </div>
                                                            <div className="progress-note">
                                                                {installStatus.logs && installStatus.logs.length > 0 && installStatus.logs[installStatus.logs.length - 1]}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="instruction-steps" style={{ marginTop: '15px' }}>
                                                    <p>If automatic download fails:</p>
                                                    <p>1. <a href="https://downloader.hytale.com/hytale-downloader.zip" target="_blank" rel="noopener noreferrer">Download hytale-downloader.zip manually</a></p>
                                                    <p>2. Extract content to <code>backend/bin/</code></p>
                                                </div>

                                                <button onClick={checkPrerequisites} className="btn-text-action" style={{ marginTop: '10px' }}>
                                                    <Search size={14} /> Check Again
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="detection-tag tag-success">
                                            <CheckCircle2 size={14} /> Installer tool detected and ready
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="multi-step-buttons">
                                <button onClick={handleBack} className="btn btn-secondary">
                                    <ArrowLeft size={18} /> Back
                                </button>
                                {installMode === 'auto' ? (
                                    <button onClick={startAutoInstall} className="btn btn-primary" disabled={!prerequisites.available || prerequisites.checking}>
                                        Start Installation <Download size={18} />
                                    </button>
                                ) : (
                                    <button onClick={() => setStep(5)} className="btn btn-primary">
                                        Next Step <ArrowRight size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="setup-summary">
                            <div className="summary-section">
                                <h3>Review Settings</h3>
                                <div className="summary-item">
                                    <div className="summary-label"><User size={14} /> Admin Account</div>
                                    <div className="summary-value">{formData.user}</div>
                                </div>
                                <div className="summary-item">
                                    <div className="summary-label"><Globe size={14} /> Environment</div>
                                    <div className="summary-value">{settings.os} - Port {settings.port}</div>
                                </div>
                                <div className="summary-item">
                                    <div className="summary-label"><Server size={14} /> Server Path</div>
                                    <div className="summary-value">{settings.serverPath}</div>
                                </div>
                            </div>

                            {/* Installation Progress UI - shown when installing */}
                            {(installStatus.state !== 'idle' && installStatus.state !== 'finished' && installStatus.state !== 'error' && installStatus.state !== 'tool_installed') && (
                                <div className="install-process-card" style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                                    {installStatus.state === 'authenticating' && (
                                        <div className="auth-step fade-in">
                                            <div className="auth-code-box">
                                                <label>Device Code</label>
                                                <div className="code-display">
                                                    <span>{installStatus.deviceCode || '---- ----'}</span>
                                                    <button onClick={() => copyToClipboard(installStatus.deviceCode)} className="copy-btn" disabled={!installStatus.deviceCode}>
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="auth-instructions">
                                                <ol>
                                                    <li>Visit the Hytale accounts page</li>
                                                    <li>Enter the code shown above</li>
                                                    <li>Wait for detection...</li>
                                                </ol>
                                            </div>
                                            <a
                                                href={installStatus.verificationUrl || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`btn btn-primary auth-link ${!installStatus.verificationUrl ? 'disabled' : ''}`}
                                                onClick={(e) => !installStatus.verificationUrl && e.preventDefault()}
                                            >
                                                Open Hytale Accounts <ExternalLink size={18} />
                                            </a>
                                        </div>
                                    )}

                                    {(installStatus.state === 'downloading_game' || installStatus.state === 'starting' || installStatus.state === 'extracting') && (
                                        <div className="download-step fade-in" style={{ padding: 0, marginTop: 0 }}>
                                            <div className="progress-container">
                                                <div className="progress-label">
                                                    <span>{installStatus.state === 'extracting' ? 'Extracting Server Files...' : 'Downloading Hytale Server...'}</span>
                                                    <span>{installStatus.progress}%</span>
                                                </div>
                                                <div className="progress-bar-bg">
                                                    <div className="progress-bar-fill" style={{ width: `${installStatus.progress}%` }}></div>
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="multi-step-buttons" style={{ marginTop: '30px' }}>
                                <button onClick={handleBack} className="btn btn-secondary" disabled={loading || (installStatus.state !== 'idle' && installStatus.state !== 'error')}>
                                    <ArrowLeft size={18} /> Back
                                </button>

                                {installMode === 'auto' && (installStatus.state === 'idle' || installStatus.state === 'error') ? (
                                    <button onClick={startAutoInstall} className="btn btn-primary">
                                        Start Install & Setup <Download size={18} />
                                    </button>
                                ) : (
                                    <button onClick={handleSubmit} className="btn btn-primary" disabled={loading || (installMode === 'auto' && installStatus.state !== 'finished')}>
                                        {loading ? 'Finalizing Setup...' : (installMode === 'manual' ? 'Complete Setup' : (installStatus.state === 'finished' ? 'Complete Setup' : 'Installing...'))}
                                        {installStatus.state === 'finished' || installMode === 'manual' ? <CheckCircle2 size={18} /> : (loading ? <Loader2 className="animate-spin" size={18} /> : null)}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SetupPage;