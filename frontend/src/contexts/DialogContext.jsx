import { createContext, useContext, useState, useCallback } from 'react';
import Dialog from '../components/common/Dialog';

const DialogContext = createContext(null);

export function useDialog() {
    return useContext(DialogContext);
}

export function DialogProvider({ children }) {
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        inputPlaceholder: '',
        inputValue: '',
        resolve: null
    });

    const [inputValue, setInputValue] = useState('');

    const showDialog = useCallback((options) => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                ...options,
                resolve
            });
            setInputValue(options.defaultValue || '');
        });
    }, []);

    const showAlert = useCallback((message, title = 'Alert') => {
        return showDialog({ title, message, type: 'alert' });
    }, [showDialog]);

    const showConfirm = useCallback((message, title = 'Confirm') => {
        return showDialog({ title, message, type: 'confirm' });
    }, [showDialog]);

    const showPrompt = useCallback((message, defaultValue = '', title = 'Input') => {
        return showDialog({ title, message, type: 'prompt', defaultValue });
    }, [showDialog]);

    const handleConfirm = () => {
        setDialogState(prev => {
            if (prev.resolve) {
                if (prev.type === 'prompt') {
                    prev.resolve(inputValue);
                } else {
                    prev.resolve(true);
                }
            }
            return { ...prev, isOpen: false };
        });
    };

    const handleCancel = () => {
        setDialogState(prev => {
            if (prev.resolve) {
                if (prev.type === 'prompt') {
                    // Start of Selection
                    prev.resolve(null);
                } else {
                    prev.resolve(false);
                }
            }
            return { ...prev, isOpen: false };
        });
    };

    return (
        <DialogContext.Provider value={{ showDialog, showAlert, showConfirm, showPrompt }}>
            {children}
            <Dialog
                isOpen={dialogState.isOpen}
                title={dialogState.title}
                message={dialogState.message}
                type={dialogState.type}
                inputPlaceholder={dialogState.inputPlaceholder}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </DialogContext.Provider>
    );
}
