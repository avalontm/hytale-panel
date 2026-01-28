import { Server, Users, HardDrive, Clock } from 'lucide-react';
import './ServerInfo.css';

function ServerInfo({ stats, config, className }) {
  return (
    <div className={`card ${className || ''}`}>
      <h3 className="card-title">
        {config?.serverName || 'Server Information'}
      </h3>
      {config?.motd && <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>"{config.motd}"</p>}

      <div className="info-list">
        <div className="info-item">
          <Server size={20} className="info-icon" />
          <div className="info-content">
            <span className="info-label">Active World</span>
            <span className="info-value">{config?.worldName || 'default'}</span>
          </div>
        </div>

        <div className="info-item">
          <Users size={20} className="info-icon" />
          <div className="info-content">
            <span className="info-label">Players</span>
            <span className="info-value">
              {stats.players?.online || 0} / {config?.maxPlayers || stats.players?.max || 20}
            </span>
          </div>
        </div>

        <div className="info-item">
          <HardDrive size={20} className="info-icon" />
          <div className="info-content">
            <span className="info-label">World Size</span>
            <span className="info-value">{stats.worldSize || '0 MB'}</span>
          </div>
        </div>

        <div className="info-item">
          <Clock size={20} className="info-icon" />
          <div className="info-content">
            <span className="info-label">Uptime</span>
            <span className="info-value">{stats.uptime || '0d 00h 00m 00s'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServerInfo;
