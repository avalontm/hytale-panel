import { useState, useEffect, useRef } from 'react';
import { useServerStatus } from '../../hooks/useServerStatus';
import './Header.css';

function Header() {
  const { status, players } = useServerStatus();
  const [startingTime, setStartingTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (status === 'starting') {
      setStartingTime(0);
      timerRef.current = setInterval(() => {
        setStartingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStartingTime(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'online':
        return { text: 'Online', class: 'status-online' };
      case 'offline':
        return { text: 'Offline', class: 'status-offline' };
      case 'starting':
        return { text: `Starting (${formatTime(startingTime)})`, class: 'status-starting' };
      case 'stopping':
        return { text: 'Stopping', class: 'status-stopping' };
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
