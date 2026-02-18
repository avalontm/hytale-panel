import { useState, useEffect, useCallback } from 'react';
import { fileAPI } from '../services/api';
import { useDialog } from '../contexts/DialogContext';
import {
    Folder, File as FileIcon, ArrowLeft, RefreshCw,
    Plus, Trash2, Upload, X, Save, FileText, ToggleLeft, ToggleRight, Layout,
    Edit2, Copy, Move, ClipboardPaste
} from 'lucide-react';
import JsonFormEditor from '../components/common/JsonFormEditor';
import '../styles/global.css';

function FilesPage() {
    const dialog = useDialog();
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({
        current: 0,
        total: 0,
        percentage: 0,
        fileName: '',
        currentFileProgress: 0
    });

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingFile, setEditingFile] = useState(null); // { name, path }
    const [editorContent, setEditorContent] = useState('');
    const [visualMode, setVisualMode] = useState(false);
    const [parsedJson, setParsedJson] = useState(null);
    const [saving, setSaving] = useState(false);

    // Clipboard State
    const [clipboard, setClipboard] = useState(null); // { path, name, type: 'copy' | 'move' }

    const loadFiles = useCallback(async (path) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fileAPI.list(path);
            const data = response.data;
            const sorted = data.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory ? -1 : 1;
            });
            setFiles(sorted);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFiles(currentPath);
    }, [currentPath, loadFiles]);

    const handleNavigate = useCallback((folderName) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        setCurrentPath(newPath);
    }, [currentPath]);

    const handleBack = useCallback(() => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    }, [currentPath]);

    const handleCreateFolder = useCallback(async () => {
        const name = await dialog.showPrompt("Enter folder name:", "New Folder", "Create Folder");
        if (!name) return;
        try {
            const path = currentPath ? `${currentPath}/${name}` : name;
            await fileAPI.createDirectory(path);
            loadFiles(currentPath);
        } catch (err) {
            dialog.showAlert("Failed to create folder: " + (err.response?.data?.error || err.message), "Error");
        }
    }, [currentPath, dialog, loadFiles]);

    const handleCreateFile = async () => {
        const name = await dialog.showPrompt("Enter file name (e.g. notes.txt):", "new-file.txt", "Create File");
        if (!name) return;
        try {
            const path = currentPath ? `${currentPath}/${name}` : name;
            await fileAPI.write(path, ""); // Empty file
            loadFiles(currentPath);
            // Optionally open editor immediately
            handleEditFile(name);
        } catch (err) {
            dialog.showAlert("Failed to create file: " + (err.response?.data?.error || err.message), "Error");
        }
    };

    const handleDelete = async (fileName) => {
        const confirmed = await dialog.showConfirm(`Are you sure you want to delete '${fileName}'? This cannot be undone.`, "Delete File");
        if (!confirmed) return;
        try {
            const path = currentPath ? `${currentPath}/${fileName}` : fileName;
            await fileAPI.delete(path);
            loadFiles(currentPath);
        } catch (err) {
            dialog.showAlert("Failed to delete: " + (err.response?.data?.error || err.message), "Error");
        }
    };

    const handleRename = async (fileName) => {
        const newName = await dialog.showPrompt("Enter new name:", fileName, "Rename");
        if (!newName || newName === fileName) return;
        try {
            const oldPath = currentPath ? `${currentPath}/${fileName}` : fileName;
            const newPath = currentPath ? `${currentPath}/${newName}` : newName;
            await fileAPI.rename(oldPath, newPath);
            loadFiles(currentPath);
        } catch (err) {
            dialog.showAlert("Failed to rename: " + (err.response?.data?.error || err.message), "Error");
        }
    };

    const handleCopy = (file) => {
        const path = currentPath ? `${currentPath}/${file.name}` : file.name;
        setClipboard({ path, name: file.name, type: 'copy' });
    };

    const handleMove = (file) => {
        const path = currentPath ? `${currentPath}/${file.name}` : file.name;
        setClipboard({ path, name: file.name, type: 'move' });
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        try {
            const destPath = currentPath ? `${currentPath}/${clipboard.name}` : clipboard.name;
            if (clipboard.type === 'copy') {
                await fileAPI.copy(clipboard.path, destPath);
            } else {
                await fileAPI.move(clipboard.path, destPath);
            }
            setClipboard(null);
            loadFiles(currentPath);
        } catch (err) {
            dialog.showAlert("Failed to paste: " + (err.response?.data?.error || err.message), "Error");
        }
    };

    const handleEditFile = async (fileName) => {
        try {
            const path = currentPath ? `${currentPath}/${fileName}` : fileName;
            const response = await fileAPI.read(path);
            setEditingFile({ name: fileName, path });
            setEditorContent(response.data.content);

            const isJson = fileName.toLowerCase().endsWith('.json');
            setVisualMode(isJson);
            if (isJson) {
                try {
                    setParsedJson(JSON.parse(response.data.content));
                } catch (e) {
                    console.error("Invalid JSON", e);
                    setVisualMode(false);
                }
            } else {
                setParsedJson(null);
            }

            setEditorOpen(true);
        } catch (err) {
            dialog.showAlert("Failed to read file: " + (err.response?.data?.error || err.message), "Error");
        }
    };

    const handleSaveFile = async () => {
        if (!editingFile) return;
        setSaving(true);
        try {
            const contentToSave = visualMode ? JSON.stringify(parsedJson, null, 2) : editorContent;
            await fileAPI.write(editingFile.path, contentToSave);
            setEditorOpen(false);
            setEditingFile(null);
            loadFiles(currentPath);
        } catch (err) {
            dialog.showAlert("Failed to save: " + (err.response?.data?.error || err.message), "Error");
        } finally {
            setSaving(false);
        }
    };

    // Drag & Drop Handlers
    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    const onDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const items = Array.from(e.dataTransfer.items);
        if (items.length === 0) return;

        setUploading(true);

        const uploadTasks = [];

        const traverseFileTree = (item, path = "") => {
            return new Promise((resolve) => {
                if (item.isFile) {
                    item.file((file) => {
                        uploadTasks.push({
                            file,
                            path: path ? `${path}/${file.name}` : file.name
                        });
                        resolve();
                    });
                } else if (item.isDirectory) {
                    const dirReader = item.createReader();
                    const readEntries = () => {
                        dirReader.readEntries(async (entries) => {
                            if (entries.length > 0) {
                                for (const entry of entries) {
                                    await traverseFileTree(entry, path ? `${path}/${item.name}` : item.name);
                                }
                                readEntries(); // Continue reading if more entries
                            } else {
                                resolve();
                            }
                        });
                    };
                    readEntries();
                } else {
                    resolve();
                }
            });
        };

        // Collect all files recursively
        for (const item of items) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                await traverseFileTree(entry);
            }
        }

        const totalFiles = uploadTasks.length;
        setUploadProgress({
            current: 0,
            total: totalFiles,
            percentage: 0,
            fileName: '',
            currentFileProgress: 0
        });

        // Upload sequentially to avoid overloading the server/network
        for (let i = 0; i < uploadTasks.length; i++) {
            const task = uploadTasks[i];
            try {
                const fullPath = currentPath ? `${currentPath}/${task.path}` : task.path;

                setUploadProgress(prev => ({
                    ...prev,
                    current: i + 1,
                    fileName: task.file.name,
                    percentage: Math.round((i / totalFiles) * 100),
                    currentFileProgress: 0
                }));

                await fileAPI.upload(fullPath, task.file, (progressEvent) => {
                    const filePercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(prev => {
                        // Total percentage is (filesDone / total) + (currentFilePercent / total)
                        const overallPercent = Math.round(((i + (filePercent / 100)) / totalFiles) * 100);
                        return {
                            ...prev,
                            currentFileProgress: filePercent,
                            percentage: overallPercent
                        };
                    });
                });
            } catch (err) {
                console.error("Upload failed for " + task.path, err);
                dialog.showAlert(`Failed to upload ${task.path}`, "Upload Error");
            }
        }
        setUploading(false);
        setUploadProgress({ current: 0, total: 0, percentage: 0, fileName: '', currentFileProgress: 0 });
        loadFiles(currentPath);
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header / Toolbar */}
            <div className="dashboard-header" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
            }}>
                <div>
                    <h1 className="page-title">File Manager</h1>
                    <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <Folder size={14} style={{ marginRight: '4px', opacity: 0.6 }} />
                        <span
                            onClick={() => setCurrentPath('')}
                            style={{ cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: currentPath === '' ? 'bold' : 'normal' }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                            Root
                        </span>
                        {currentPath.split('/').filter(Boolean).map((part, index, array) => (
                            <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ opacity: 0.5 }}>/</span>
                                <span
                                    onClick={() => {
                                        const newPath = array.slice(0, index + 1).join('/');
                                        setCurrentPath(newPath);
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        color: index === array.length - 1 ? 'var(--text-primary)' : 'var(--accent-blue)',
                                        fontWeight: index === array.length - 1 ? '600' : 'normal'
                                    }}
                                    onMouseEnter={(e) => index !== array.length - 1 && (e.target.style.textDecoration = 'underline')}
                                    onMouseLeave={(e) => index !== array.length - 1 && (e.target.style.textDecoration = 'none')}
                                >
                                    {part}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => loadFiles(currentPath)} className="btn btn-secondary" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    {currentPath && (
                        <button onClick={handleBack} className="btn btn-secondary">
                            <ArrowLeft size={18} style={{ marginRight: '5px' }} /> Back
                        </button>
                    )}
                    <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                    {clipboard && (
                        <button onClick={handlePaste} className="btn btn-primary" title={`Paste ${clipboard.name}`}>
                            <ClipboardPaste size={18} style={{ marginRight: '5px' }} /> Paste
                        </button>
                    )}
                    <button onClick={handleCreateFolder} className="btn btn-secondary">
                        <Plus size={18} style={{ marginRight: '5px' }} /> Folder
                    </button>
                    <button onClick={handleCreateFile} className="btn btn-secondary">
                        <FileText size={18} style={{ marginRight: '5px' }} /> File
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && <div className="status-badge status-offline" style={{ marginBottom: '1rem', display: 'block' }}>{error}</div>}

            {/* Main Content Area (Drop Zone) */}
            <div
                className="card"
                style={{
                    flex: 1,
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: isDragging ? '2px dashed var(--accent-green)' : '1px solid var(--border-color)',
                    position: 'relative'
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {/* Columns Header */}
                <div className="file-manager-grid" style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                }}>
                    <span>Type</span>
                    <span>Name</span>
                    <span style={{ textAlign: 'right' }}>Size</span>
                    <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {/* File List */}
                <div className="file-list" style={{ overflowY: 'auto', flex: 1 }}>
                    {loading || uploading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {uploading ? (
                                <div style={{
                                    padding: '3rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '20px',
                                    background: 'var(--bg-secondary)',
                                    height: '100%'
                                }}>
                                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <span>Subiendo: {uploadProgress.fileName}</span>
                                            <span>{uploadProgress.percentage}%</span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '8px',
                                            background: 'var(--bg-primary)',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{
                                                width: `${uploadProgress.percentage}%`,
                                                height: '100%',
                                                background: 'var(--accent-green)',
                                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                                                transition: 'width 0.3s ease-out'
                                            }}></div>
                                        </div>
                                        <div style={{
                                            marginTop: '8px',
                                            textAlign: 'center',
                                            fontSize: '12px',
                                            color: 'var(--text-muted)'
                                        }}>
                                            Archivo {uploadProgress.current} de {uploadProgress.total}
                                        </div>
                                    </div>
                                </div>
                            ) : 'Loading...'}
                        </div>
                    ) : files.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Upload size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>Empty Directory</p>
                            <p style={{ fontSize: '0.9em' }}>Drag files here to upload</p>
                        </div>
                    ) : (
                        files.map((file) => (
                            <div
                                key={file.name}
                                className="file-row file-manager-grid"
                                style={{
                                    padding: '12px 20px',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                                onClick={() => file.isDirectory ? handleNavigate(file.name) : handleEditFile(file.name)}
                            >
                                <div style={{ color: file.isDirectory ? 'var(--accent-gold)' : 'var(--text-highlight)', display: 'flex', alignItems: 'center' }}>
                                    {file.isDirectory ? <Folder size={20} /> : <FileIcon size={20} />}
                                </div>
                                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                </div>
                                <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'monospace' }}>
                                    {file.isDirectory ? '-' : formatSize(file.size)}
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleRename(file.name)}
                                        title="Rename"
                                        style={{ '--hover-color': 'var(--accent-blue)' }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleCopy(file)}
                                        title="Copy"
                                        style={{ '--hover-color': 'var(--accent-gold)' }}
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleMove(file)}
                                        title="Move"
                                        style={{ '--hover-color': 'var(--accent-green)' }}
                                    >
                                        <Move size={16} />
                                    </button>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => handleDelete(file.name)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Drop Overlay */}
                {isDragging && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10, pointerEvents: 'none'
                    }}>
                        <div style={{ textAlign: 'center', color: 'white' }}>
                            <Upload size={48} />
                            <h2>Drop files to upload</h2>
                        </div>
                    </div>
                )}
            </div>

            {/* Editor Overlay */}
            {editorOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div className="card" style={{
                        width: '100%', maxWidth: '900px', height: '80vh',
                        display: 'flex', flexDirection: 'column', padding: 0,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            padding: '1rem', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--bg-tertiary)'
                        }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={18} />
                                {editingFile?.name}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {editingFile?.name.toLowerCase().endsWith('.json') && (
                                    <button
                                        className={`btn btn-sm ${visualMode ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => {
                                            if (!visualMode) {
                                                try {
                                                    setParsedJson(JSON.parse(editorContent));
                                                    setVisualMode(true);
                                                } catch (e) {
                                                    dialog.showAlert("Cannot switch to visual mode: Invalid JSON structure", "Error");
                                                }
                                            } else {
                                                setEditorContent(JSON.stringify(parsedJson, null, 2));
                                                setVisualMode(false);
                                            }
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        {visualMode ? <Layout size={16} /> : <FileText size={16} />}
                                        {visualMode ? 'Visual Editor' : 'Text Editor'}
                                    </button>
                                )}
                                <button onClick={() => setEditorOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {visualMode ? (
                                <JsonFormEditor data={parsedJson} onChange={setParsedJson} />
                            ) : (
                                <textarea
                                    value={editorContent}
                                    onChange={(e) => setEditorContent(e.target.value)}
                                    style={{
                                        width: '100%', height: '100%',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        border: 'none', padding: '1rem',
                                        fontFamily: 'monospace', fontSize: '14px',
                                        resize: 'none', outline: 'none'
                                    }}
                                />
                            )}
                        </div>

                        <div style={{
                            padding: '1rem', borderTop: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'flex-end', gap: '1rem',
                            background: 'var(--bg-secondary)'
                        }}>
                            <button className="btn btn-secondary" onClick={() => setEditorOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveFile} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'} <Save size={16} style={{ marginLeft: '5px' }} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FilesPage;
