import { useState, useEffect } from 'react';
import * as settingsApi from '../../services/settingsApi';

function JsonFileEditor({ filename }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        loadFile();
    }, [filename]);

    const loadFile = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await settingsApi.getFileSettings(filename);
            // Convert object/array to formatted string
            setContent(JSON.stringify(data, null, 4));
        } catch (err) {
            setError(err.message + ". Check if Server Path is correct.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setContent(e.target.value);
        setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            // Validate JSON
            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch (jsonErr) {
                throw new Error("Invalid JSON Syntax: " + jsonErr.message);
            }

            await settingsApi.saveFileSettings(filename, parsed);
            setSuccess(`${filename} saved successfully!`);
            // format it nicely again
            setContent(JSON.stringify(parsed, null, 4));
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading {filename}...</div>;

    return (
        <div className="card">
            <h2 className="card-title">Editing: {filename}</h2>

            {error && <div className="status-badge status-offline" style={{ marginBottom: '1rem', display: 'block' }}>{error}</div>}
            {success && <div className="status-badge status-online" style={{ marginBottom: '1rem', display: 'block' }}>{success}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <textarea
                        value={content}
                        onChange={handleChange}
                        className="input-field"
                        style={{
                            minHeight: '400px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre',
                            tabSize: 4
                        }}
                    />
                    <small>Make sure to maintain valid JSON syntax.</small>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                    <button type="button" onClick={loadFile} className="btn btn-secondary">Reload File</button>
                </div>
            </form>
        </div>
    );
}

export default JsonFileEditor;
