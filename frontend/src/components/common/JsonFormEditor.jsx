import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const JsonFormEditor = ({ data, onChange }) => {
    const handleFieldChange = (path, value) => {
        const newData = JSON.parse(JSON.stringify(data));
        let current = newData;
        const parts = path.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        onChange(newData);
    };

    const formatKey = (key) => {
        // Convert camelCase or snake_case to Title Case for better readability
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^\w/, (c) => c.toUpperCase())
            .trim();
    };

    const renderValue = (value, path = "", level = 0) => {
        const type = typeof value;

        if (value === null) {
            return (
                <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                    null
                </div>
            );
        }

        if (type === 'object' && !Array.isArray(value)) {
            return (
                <div style={{
                    marginLeft: level > 0 ? '16px' : 0,
                    marginTop: '8px',
                    borderLeft: level > 0 ? '2px solid var(--border-color)' : 'none',
                    paddingLeft: level > 0 ? '16px' : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {Object.entries(value).map(([key, val]) => (
                        <div key={key} style={{
                            display: 'flex',
                            flexDirection: typeof val === 'object' ? 'column' : 'row',
                            alignItems: typeof val === 'object' ? 'flex-start' : 'center',
                            gap: typeof val === 'object' ? '4px' : '15px'
                        }}>
                            <label style={{
                                minWidth: '140px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--accent-blue)',
                                opacity: 0.9
                            }}>
                                {formatKey(key)}:
                            </label>
                            <div style={{ flex: 1, width: '100%' }}>
                                {renderValue(val, path ? `${path}.${key}` : key, level + 1)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (Array.isArray(value)) {
            return (
                <div style={{
                    marginLeft: '16px',
                    marginTop: '8px',
                    borderLeft: '2px solid var(--border-color)',
                    paddingLeft: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {value.map((val, index) => (
                        <div key={index} style={{
                            display: 'flex',
                            alignItems: typeof val === 'object' ? 'flex-start' : 'center',
                            gap: '10px'
                        }}>
                            <span style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                minWidth: '20px'
                            }}>[{index}]</span>
                            <div style={{ flex: 1, width: '100%' }}>
                                {renderValue(val, `${path}.${index}`, level + 1)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (type === 'boolean') {
            return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleFieldChange(path, e.target.checked)}
                        style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--accent-blue)'
                        }}
                    />
                </div>
            );
        }

        if (type === 'number') {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => handleFieldChange(path, parseFloat(e.target.value))}
                    style={{
                        width: '100%',
                        maxWidth: '200px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
            );
        }

        return (
            <input
                type="text"
                value={value}
                onChange={(e) => handleFieldChange(path, e.target.value)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
        );
    };

    return (
        <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            margin: '10px'
        }}>
            {renderValue(data)}
        </div>
    );
};

export default JsonFormEditor;
