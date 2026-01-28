import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Critical: Check setup first, await it fully
                await checkSetup();

                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('token');

                if (storedUser && token) {
                    setUser(JSON.parse(storedUser));
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                // Only stop loading after everything is done
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const checkSetup = async () => {
        try {
            const response = await axios.get(`${API_URL}/auth/setup-needed`);
            setNeedsSetup(response.data.needed);
        } catch (error) {
            console.error('Failed to check setup status:', error);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { user: username, password });
            const { token, user: userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setUser(userData);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error logging in'
            };
        }
    };

    const setup = async (setupData) => {
        try {
            await axios.post(`${API_URL}/auth/setup`, setupData);
            setNeedsSetup(false);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Error during setup'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const value = {
        user,
        loading,
        needsSetup,
        login,
        setup,
        logout,
        checkSetup
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);