import { useState, useEffect, useRef } from 'react';
import { installerAPI, settingsAPI } from '../../services/api';
import { RefreshCw, Download, Terminal, CheckCircle, AlertTriangle, FileText, Info } from 'lucide-react';

function ServerUpdateForm() {
    const [status, setStatus] = useState(null);
    const [version, setVersion] = useState(null);
    const [checking, setChecking] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [frontendLogs, setFrontendLogs] = useState([]);
    const consoleContainerRef = useRef(null);
    const hasLoaded = useRef(false);

    const addLog = (msg, type = 'info') => {
        const entry = {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            msg,
            type
        };
        setFrontendLogs(prev => [...prev, entry]);
    };

    useEffect(() => {
        if (!hasLoaded.current) {
            loadData();
            hasLoaded.current = true;
        }
        const interval = setInterval(pollStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (consoleContainerRef.current) {
            const { scrollHeight, clientHeight } = consoleContainerRef.current;
            consoleContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }, [status?.logs, status?.debugLogs, frontendLogs]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        // addLog('Iniciando carga de datos de actualización...');
        try {
            const sRes = await installerAPI.getStatus();
            setStatus(sRes.data);

            const vRes = await installerAPI.getVersion();
            setVersion(vRes.data.version);
            if (vRes.data.version.includes('Timed Out')) {
                addLog(`Versión actual cargada: ${vRes.data.version}`, 'error');
            }
        } catch (err) {
            console.error('Failed to load update data:', err);
            addLog(`ERROR: ${err.message}`, 'error');
            setError('Error de conexión con el backend.');
        } finally {
            setLoading(false);
        }
    };

    const pollStatus = async () => {
        try {
            const res = await installerAPI.getStatus();
            setStatus(res.data);
            if (res.data.state === 'finished' && (!version || version === 'Unknown' || version === 'Timed out')) {
                const vRes = await installerAPI.getVersion();
                setVersion(vRes.data.version);
            }
        } catch (err) { }
    };

    // handleCheckUpdate removed as per user request (no flags)

    const handleStartUpdate = async () => {
        try {
            addLog('Preparando descarga de Hytale Server...', 'process');
            const settingsRes = await settingsAPI.getPanel();
            const targetPath = settingsRes.data.serverPath || '.';
            addLog(`Directorio destino: ${targetPath}`);

            await installerAPI.start(targetPath);
            addLog('Instalación/Actualización iniciada en segundo plano.', 'success');
        } catch (err) {
            addLog(`ERROR al iniciar: ${err.message}`, 'error');
            alert('Error: ' + err.message);
        }
    };

    if (loading && frontendLogs.length < 3) {
        return (
            <div className="fade-in card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Conectando con el servicio de instalación...</span>
                </div>
            </div>
        );
    }

    const isUpdating = status && !['idle', 'finished', 'error', 'tool_installed'].includes(status.state);

    return (
        <div className="fade-in">
            {error && (
                <div className="status-badge status-offline" style={{ width: '100%', padding: '15px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title">Hytale Server Update</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Versión del Juego</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: version === 'Timed out' ? 'var(--status-offline)' : 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={18} />
                                {version || 'Desconocida'}
                                {version === 'Timed out' && <AlertTriangle size={16} title="El CLI tardó demasiado en responder" />}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn btn-icon"
                                onClick={loadData}
                                title="Recargar Versión"
                                disabled={loading || isUpdating}
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '100px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Info size={18} />
                            <span>Para actualizar, presiona el botón de abajo. El sistema detectará si es necesario.</span>
                        </div>
                    </div>
                </div>

                {!isUpdating && (
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(52, 152, 219, 0.05)', border: '1px solid var(--accent-blue)', borderRadius: '12px', borderLeftWidth: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ maxWidth: '70%' }}>
                                <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-blue)' }}>Actualización Manual</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Ejecuta el descargador oficial para instalar o actualizar el servidor ("release"). <br />
                                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Si el servidor ya está actualizado, el proceso finalizará sin cambios.</span>
                                </p>
                            </div>
                            <button
                                className="btn btn-primary" onClick={handleStartUpdate} style={{ padding: '0.8rem 1.5rem' }}>
                                Descargar e Instalar
                            </button>
                        </div>
                    </div>
                )}

                {status?.state === 'authenticating' && status?.deviceCode && (
                    <div className="auth-card fade-in" style={{ marginTop: '2rem', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px dashed var(--accent-gold)', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem' }}>Autenticación Requerida</h3>
                        <p style={{ marginBottom: '1.5rem' }}>El descargador de Hytale necesita que verifiques tu identidad.</p>

                        <div style={{ display: 'inline-block', padding: '1rem 2rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '1.5rem', letterSpacing: '2px', fontWeight: 'bold', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                            {status.deviceCode}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                            <a
                                href={status.verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                Ir a la página de verificación <RefreshCw size={16} />
                            </a>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                El panel continuará automáticamente una vez que completes la verificación.
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={18} color="var(--accent-color)" />
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Terminal de Instalación</h3>
                    </div>
                    {status?.state !== 'idle' && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: '500' }}>
                            ESTADO: {status.state.toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="console-area" style={{
                    height: '400px',
                    fontSize: '0.85rem',
                    background: '#0a0a0a',
                    padding: '0',
                    border: 'none',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    position: 'relative'
                }} ref={consoleContainerRef}>
                    <div style={{
                        padding: '15px',
                        fontFamily: '"Fira Code", monospace',
                        minWidth: '100%',
                        width: 'max-content',
                        maxWidth: '200%' // Allow some breathing room for wide lines but keep scroll
                    }}>
                        {/* Status logs (Download progress etc) */}
                        {status?.logs.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ color: '#444', marginBottom: '8px', fontSize: '0.7rem', textTransform: 'uppercase' }}>— Salida del Instalador —</div>
                                {status.logs.map((log, i) => (
                                    <div key={`status-${i}`} style={{ color: '#00ff00', marginBottom: '2px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mixed Debug and Frontend logs */}
                        <div style={{ color: '#444', marginBottom: '8px', fontSize: '0.7rem', textTransform: 'uppercase' }}>— Registro de Actividad —</div>
                        {[...(status?.debugLogs || []).map(l => ({ msg: l, type: 'debug' })), ...frontendLogs.map(l => ({ msg: `[${l.time}] ${l.msg}`, type: l.type }))]
                            .sort((a, b) => {
                                // Sort attempt (roughly by time if possible)
                                return 0; // Keeping them as they come for now
                            })
                            .map((log, i) => (
                                <div key={`debug-${i}`} style={{
                                    color: log.type === 'error' ? '#ff5555' : (log.type === 'debug' ? '#666' : '#888'),
                                    marginBottom: '4px',
                                    display: 'flex',
                                    gap: '10px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }}>
                                    <span style={{ flexShrink: 0 }}>{log.msg}</span>
                                </div>
                            ))
                        }

                    </div>
                </div>

                {isUpdating && (
                    <div style={{ position: 'relative', height: '4px', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{
                            position: 'absolute',
                            height: '100%',
                            width: `${status.progress}%`,
                            background: 'var(--accent-blue)',
                            transition: 'width 0.5s ease-out',
                            boxShadow: '0 0 10px var(--accent-blue)'
                        }}></div>
                    </div>
                )}
            </div>

            <style>{`
                .console-area::-webkit-scrollbar { width: 8px; }
                .console-area::-webkit-scrollbar-track { background: #0a0a0a; }
                .console-area::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
                .console-area::-webkit-scrollbar-thumb:hover { background: #333; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div >
    );
}

export default ServerUpdateForm;
