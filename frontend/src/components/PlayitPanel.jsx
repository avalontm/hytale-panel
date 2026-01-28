import { useState, useEffect } from 'react';
import { Globe, Power, PowerOff, Copy, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { playitAPI } from '../services/api';
import './PlayitPanel.css';

function PlayitPanel() {
    const [status, setStatus] = useState({
        status: 'disconnected',
        tunnelInfo: { ip: null, port: null, domain: null },
        hasSecretKey: false
    });
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await playitAPI.getStatus();
            setStatus(response.data);
        } catch (error) {
            console.error('Failed to fetch Playit status:', error);
        }
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            await playitAPI.start();
            setTimeout(fetchStatus, 1000);
        } catch (error) {
            alert('Failed to start tunnel: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        setLoading(true);
        try {
            await playitAPI.stop();
            fetchStatus();
        } catch (error) {
            alert('Failed to stop tunnel: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getTunnelUrl = () => {
        if (status.tunnelInfo.domain && status.tunnelInfo.port) {
            return `${status.tunnelInfo.domain}:${status.tunnelInfo.port}`;
        }
        return null;
    };

    const getStatusColor = () => {
        switch (status.status) {
            case 'connected':
                return 'success';
            case 'connecting':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'offline';
        }
    };

    const getStatusText = () => {
        switch (status.status) {
            case 'connected':
                return 'Connected';
            case 'connecting':
                return 'Connecting...';
            case 'error':
                return 'Error';
            default:
                return 'Disconnected';
        }
    };

    const tunnelUrl = getTunnelUrl();

    return (
        <div className="playit-panel card">
            <div className="playit-header">
                <div className="playit-title">
                    <Globe size={20} />
                    <h3>Playit.gg Tunnel</h3>
                </div>
                <div className={`playit-status-badge status-${getStatusColor()}`}>
                    {status.status === 'connecting' && <Loader2 size={14} className="animate-spin" />}
                    {status.status === 'connected' && <CheckCircle2 size={14} />}
                    {status.status === 'error' && <AlertCircle size={14} />}
                    <span>{getStatusText()}</span>
                </div>
            </div>

            {status.status === 'connected' && tunnelUrl && (
                <div className="tunnel-info">
                    <label>Public Address</label>
                    <div className="tunnel-url">
                        <span className="url-text">{tunnelUrl}</span>
                        <button
                            className="icon-btn"
                            onClick={() => copyToClipboard(tunnelUrl)}
                            title={copied ? 'Copied!' : 'Copy to clipboard'}
                        >
                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                    <p className="tunnel-note">
                        Share this address with players to connect to your server
                    </p>
                </div>
            )}

            {status.status === 'disconnected' && (
                <div className="tunnel-disconnected">
                    <p>Start a Playit.gg tunnel to make your server publicly accessible</p>
                </div>
            )}

            <div className="playit-actions">
                {status.status === 'connected' ? (
                    <button
                        className="btn btn-secondary"
                        onClick={handleStop}
                        disabled={loading}
                    >
                        <PowerOff size={18} />
                        Stop Tunnel
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={handleStart}
                        disabled={loading || status.status === 'connecting'}
                    >
                        {loading || status.status === 'connecting' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Power size={18} />
                                Start Tunnel
                            </>
                        )}
                    </button>
                )}
            </div>

            {status.hasSecretKey && (
                <div className="playit-footer">
                    <small>Tunnel configured with saved credentials</small>
                </div>
            )}
        </div>
    );
}

export default PlayitPanel;