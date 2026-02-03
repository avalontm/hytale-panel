import { createContext, useContext, useState, useCallback, useMemo } from 'react';
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

    const handleConfirm = useCallback(() => {
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
    }, [inputValue]);

    const handleCancel = useCallback(() => {
        setDialogState(prev => {
            if (prev.resolve) {
                if (prev.type === 'prompt') {
                    prev.resolve(null);
                } else {
                    prev.resolve(false);
                }
            }
            return { ...prev, isOpen: false };
        });
    }, []);

    const contextValue = useMemo(() => ({
        showDialog, showAlert, showConfirm, showPrompt
    }), [showDialog, showAlert, showConfirm, showPrompt]);

    return (
        <DialogContext.Provider value={contextValue}>
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
