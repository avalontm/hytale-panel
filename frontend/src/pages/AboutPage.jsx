import { Github, Mail, Globe, Code2, ExternalLink } from 'lucide-react';
import { PANEL_VERSION, DEVELOPER_NAME, GITHUB_URL, REPOSITORY_URL, PROFILE_IMAGE, DEVELOPER_EMAIL, DEVELOPER_WEBSITE } from '../config';
import './AboutPage.css';

function AboutPage() {
    return (
        <div className="about-page fade-in">
            <div className="about-container">
                <div className="profile-card card">
                    <div className="profile-header">
                        <div className="profile-avatar-wrapper">
                            <img
                                src={PROFILE_IMAGE}
                                alt={DEVELOPER_NAME}
                                className="profile-avatar"
                            />
                            <div className="status-indicator online"></div>
                        </div>
                        <div className="profile-info">
                            <h1 className="dev-name">{DEVELOPER_NAME}</h1>
                            <p className="dev-role">Full-Stack Developer & Hytale Enthusiast</p>
                            <div className="social-links">
                                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="social-link">
                                    <Github size={20} />
                                </a>
                                <a href={`mailto:${DEVELOPER_EMAIL}`} className="social-link">
                                    <Mail size={20} />
                                </a>
                                <a href={DEVELOPER_WEBSITE} target="_blank" rel="noopener noreferrer" className="social-link">
                                    <Globe size={20} />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="profile-body">
                        <section className="about-section">
                            <h3><Code2 size={18} /> About the Project</h3>
                            <p>
                                The <strong>Hytale Panel</strong> is a premium, open-source management solution designed specifically for Hytale servers.
                                Built with modern web technologies, it provides a cinematic and intuitive experience for server owners to
                                monitor, configure, and scale their Hytale universes.
                            </p>
                        </section>

                        <div className="stats-row">
                            <div className="profile-stat">
                                <span className="stat-label">Project Version</span>
                                <span className="stat-value">v{PANEL_VERSION}</span>
                            </div>
                            <div className="profile-stat">
                                <span className="stat-label">Tech Stack</span>
                                <span className="stat-value">React / Node.js</span>
                            </div>
                        </div>

                        <div className="github-highlight">
                            <div className="gh-icon">
                                <Github size={32} />
                            </div>
                            <div className="gh-content">
                                <h4>Open Source on GitHub</h4>
                                <p>Contributions and bug reports are always welcome.</p>
                                <a
                                    href={REPOSITORY_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary compact"
                                >
                                    Visit Repository <ExternalLink size={14} style={{ marginLeft: '6px' }} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AboutPage;
