import { useState } from 'react';
import { Play, Square, RotateCw, Loader } from 'lucide-react';
import { serverAPI } from '../../services/api';
import './ServerControls.css';

function ServerControls({ status }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await serverAPI.start();
    } catch (error) {
      console.error('Failed to start server:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await serverAPI.stop();
    } catch (error) {
      console.error('Failed to stop server:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await serverAPI.restart();
    } catch (error) {
      console.error('Failed to restart server:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOnline = status === 'online';
  const isStarting = status === 'starting';
  const isOffline = status === 'offline';
  const isStopping = status === 'stopping';

  return (
    <div className="card">
      <h3 className="card-title">Server Controls</h3>

      <div className="controls-grid">
        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={loading || isOnline || isStarting || isStopping}
        >
          {loading ? <Loader className="spin" size={18} /> : <Play size={18} />}
          Start Server
        </button>

        <button
          className="btn btn-danger"
          onClick={handleStop}
          disabled={loading || isOffline || isStopping}
        >
          {loading ? <Loader className="spin" size={18} /> : <Square size={18} />}
          Stop Server
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleRestart}
          disabled={loading || !isOnline}
        >
          {loading ? <Loader className="spin" size={18} /> : <RotateCw size={18} />}
          Restart Server
        </button>
      </div>
    </div>
  );
}

export default ServerControls;
