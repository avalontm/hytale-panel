import { useState, useEffect } from 'react';
import { ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import './ServerAuthDialog.css';

function ServerAuthDialog({ authData, onClose }) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        if (authData?.deviceCode) {
            navigator.clipboard.writeText(authData.deviceCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openAuthPage = () => {
        if (authData?.verificationUrl) {
            window.open(authData.verificationUrl, '_blank');
        }
    };

    useEffect(() => {
        // Auto-close on success
        if (authData?.success) {
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }, [authData?.success, onClose]);

    if (!authData) return null;

    return (
        <div className="modal-overlay">
            <div className="auth-dialog card">
                <div className="auth-dialog-header">
                    <img src="/static/images/logo.png" alt="Hytale Logo" className="auth-logo" />
                    <h2>Server Authentication Required</h2>
                    <p>Your Hytale server needs to be authenticated</p>
                </div>

                {authData.success ? (
                    <div className="auth-success">
                        <CheckCircle2 size={48} className="success-icon" />
                        <h3>Authentication Successful!</h3>
                        <p>Your server is now authenticated and ready to use.</p>
                    </div>
                ) : (
                    <div className="auth-content">
                        <div className="auth-code-box">
                            <label>Device Code</label>
                            <div className="code-display">
                                <span>{authData.deviceCode || '---- ----'}</span>
                                <button
                                    onClick={copyToClipboard}
                                    className="copy-btn"
                                    disabled={!authData.deviceCode}
                                    title={copied ? 'Copied!' : 'Copy code'}
                                >
                                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-instructions">
                            <ol>
                                <li>Click the button below to open the Hytale accounts page</li>
                                <li>Enter the code shown above</li>
                                <li>This dialog will close automatically once authenticated</li>
                            </ol>
                        </div>

                        <button
                            onClick={openAuthPage}
                            className="btn btn-primary auth-link"
                            disabled={!authData.verificationUrl}
                        >
                            Open Hytale Accounts <ExternalLink size={18} />
                        </button>

                        <button
                            onClick={onClose}
                            className="btn btn-secondary"
                            style={{ marginTop: '10px' }}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ServerAuthDialog;