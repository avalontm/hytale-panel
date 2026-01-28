import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { PANEL_VERSION } from '../config';
import './LoginPage.css';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);
        if (!result.success) {
            setError(result.error);
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="login-page">
            <div className="login-overlay"></div>
            <div className="login-container fade-in">
                <div className="login-card">
                    <div className="login-header">
                        <img src="/static/images/logo.png" alt="Hytale Logo" className="login-logo" onError={(e) => e.target.style.display = 'none'} />
                        <h1>Server Control Panel</h1>
                        <p>Log in to manage your server</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="login-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Username</label>
                            <div className="input-with-icon">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                            <LogIn size={20} />
                            {loading ? 'Logging in...' : 'Enter Panel'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>&copy; 2026 Hytale Server Panel <span className="login-version">v{PANEL_VERSION}</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;