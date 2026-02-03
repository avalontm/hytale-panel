import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import Ansi from 'ansi-to-react';
import { useServerStatus } from '../hooks/useServerStatus';
import socketService from '../services/socket';
import './ConsolePage.css';

function ConsolePage() {
  const { status, stats } = useServerStatus();
  const [logs, setLogs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const consoleOutputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    socketService.connect();

    const handleConsole = (data) => {
      setLogs(prev => [...prev, data]);
    };

    const handleHistory = (history) => {
      setLogs(history);
      setIsSyncing(false);
    };

    // Auto-hide sync indicator after 3 seconds even if no history (avoid stuck UI)
    const syncTimeout = setTimeout(() => setIsSyncing(false), 3000);

    socketService.on('console', handleConsole);
    socketService.on('consoleHistory', handleHistory);

    socketService.emit('getConsoleHistory');

    return () => {
      socketService.off('console', handleConsole);
      socketService.off('consoleHistory', handleHistory);
      clearTimeout(syncTimeout);
    };
  }, []);

  useEffect(() => {
    if (consoleOutputRef.current) {
      consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!command.trim()) return;

    setLogs(prev => [...prev, `> ${command}\n`]);

    socketService.sendCommand(command);

    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    setCommand('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  return (
    <div className="console-page fade-in">
      <div className="console-header">
        <h1 className="page-title">Server Console</h1>
        <p className="page-subtitle">Real-time server output and command execution</p>
      </div>

      <div className="console-container">
        {isSyncing && (
          <div className="console-sync-overlay">
            <div className="sync-spinner"></div>
            <span>Sincronizando consola...</span>
          </div>
        )}
        <div className="console-output" ref={consoleOutputRef}>
          {logs.map((log, index) => (
            <div key={index} className="console-line">
              <Ansi linkify={false}>{log}</Ansi>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="console-input-form">
          <div className="input-wrapper">
            <span className="input-prefix">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="console-input"
              autoFocus
            />
            <button type="submit" className="btn btn-primary send-btn">
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ConsolePage;