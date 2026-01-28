import { useServerStatus } from '../../hooks/useServerStatus';
import './Header.css';

function Header() {
  const { status, players } = useServerStatus();

  const getStatusInfo = () => {
    switch (status) {
      case 'online':
        return { text: 'Online', class: 'status-online' };
      case 'offline':
        return { text: 'Offline', class: 'status-offline' };
      case 'starting':
        return { text: 'Starting', class: 'status-starting' };
      default:
        return { text: 'Unknown', class: 'status-offline' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="server-info">
            <h2 className="server-name">My Hytale Server</h2>
            <div className="server-stats">
              <span className={`status-badge ${statusInfo.class}`}>
                <span className="status-dot"></span>
                {statusInfo.text}
              </span>
              {status === 'online' && (
                <span className="player-count">
                  {players.online}/{players.max} players
                </span>
              )}
            </div>
          </div>
        </div>


        <div className="header-right">
          {/* Espacio para futuras acciones a la derecha */}
        </div>
      </div>
    </header>
  );
}

export default Header;
