import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { User, UserPlus, UserMinus, Shield, ShieldAlert, Edit2, Trash2, Power, PowerOff, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import './UsersPage.css';

function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        password: '',
        role: 'collaborator'
    });
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();
    const { showAlert, showConfirm } = useDialog();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await userAPI.list();
            if (Array.isArray(response.data)) {
                setUsers(response.data);
            } else {
                console.error('Invalid users response format:', response.data);
                setUsers([]);
                setError('Invalid server response format');
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching users:', err);
            setLoading(false);
            setError('Failed to load users');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (editingUser) {
                await userAPI.update(editingUser.id, formData);
            } else {
                await userAPI.create(formData);
            }
            closeModal();
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Error saving user');
        }
    };

    const handleDelete = async (id) => {
        if (id === currentUser.id) {
            await showAlert('You cannot delete yourself', 'Error');
            return;
        }

        const confirmed = await showConfirm(
            'Are you sure you want to delete this user? This action cannot be undone.',
            'Delete User'
        );

        if (!confirmed) return;

        try {
            await userAPI.delete(id);
            fetchUsers();
        } catch (err) {
            await showAlert('Error deleting user', 'Error');
        }
    };

    const handleToggleActive = async (id) => {
        if (id === currentUser.id) {
            await showAlert('You cannot deactivate yourself', 'Error');
            return;
        }

        try {
            await userAPI.toggleActive(id);
            fetchUsers();
        } catch (err) {
            await showAlert('Error changing status', 'Error');
        }
    };

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                user: user.user,
                password: '',
                role: user.role
            });
        } else {
            setEditingUser(null);
            setFormData({ user: '', password: '', role: 'collaborator' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setError('');
    };

    if (loading) return <div className="page-loading">Loading users...</div>;

    if (currentUser.role !== 'admin') {
        return (
            <div className="users-page fade-in">
                <div className="page-header">
                    <h1 className="page-title">Access Denied</h1>
                </div>
                <div className="card">
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <ShieldAlert size={48} color="var(--danger-color)" style={{ marginBottom: '1rem' }} />
                        <p>You do not have permission to view or manage users.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="users-page fade-in">
            <div className="page-header">
                <h1 className="page-title">User Management</h1>
                {currentUser.role === 'admin' && (
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <UserPlus size={18} />
                        Add User
                    </button>
                )}
            </div>

            <div className="card">
                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th>Last Login</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                <User size={16} />
                                            </div>
                                            <span>{u.user}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`role-badge role-${u.role}`}>
                                            {u.role === 'admin' ? <Shield size={14} /> : <ShieldAlert size={14} />}
                                            {u.role === 'admin' ? 'Primary Admin' : 'Collaborator'}
                                        </span>
                                    </td>
                                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>{u.loginDate ? new Date(u.loginDate).toLocaleString() : 'Never'}</td>
                                    <td>
                                        <span className={`status-badge ${u.active ? 'status-online' : 'status-offline'}`}>
                                            {u.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button className="action-btn" onClick={() => openModal(u)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className={`action-btn ${u.active ? 'btn-deactivate' : 'btn-activate'}`}
                                            onClick={() => handleToggleActive(u.id)}
                                            title={u.active ? 'Deactivate' : 'Activate'}
                                            disabled={u.id === currentUser.id}
                                        >
                                            {u.active ? <PowerOff size={16} /> : <Power size={16} />}
                                        </button>
                                        <button
                                            className="action-btn btn-delete"
                                            onClick={() => handleDelete(u.id)}
                                            title="Delete"
                                            disabled={u.id === currentUser.id}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <h2 className="card-title">
                            {editingUser ? 'Edit User' : 'New User'}
                        </h2>

                        <form onSubmit={handleSubmit} className="user-form">
                            {error && <div className="login-error"><ShieldAlert size={18} /> {error}</div>}

                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={formData.user}
                                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                                    required
                                    disabled={editingUser && editingUser.role === 'admin' && editingUser.id === currentUser.id}
                                />
                            </div>

                            <div className="form-group">
                                <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required={!editingUser}
                                    placeholder="********"
                                />
                            </div>

                            <div className="form-group">
                                <label>User Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    disabled={editingUser && editingUser.id === currentUser.id}
                                >
                                    <option value="collaborator">Collaborator</option>
                                    <option value="admin">Primary Admin</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    <X size={18} /> Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Check size={18} /> {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UsersPage;