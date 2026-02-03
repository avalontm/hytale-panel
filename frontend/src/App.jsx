import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ConsolePage from './pages/ConsolePage';
import SettingsPage from './pages/SettingsPage';
import FilesPage from './pages/FilesPage';
import PluginsPage from './pages/PluginsPage';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import NotFoundPage from './pages/NotFoundPage';
import UniversesPage from './pages/UniversesPage';
import AboutPage from './pages/AboutPage';
import PlayersPage from './pages/PlayersPage';
import ScrollToTop from './components/common/ScrollToTop';
import { DialogProvider } from './contexts/DialogContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/global.css';

function AppRoutes() {
  const { user, needsSetup, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      {/* Fallback if priority 1 fails for some reason, though it shouldn't */}
      <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/" replace />} />

      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="console" element={<ConsolePage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="universes" element={<UniversesPage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;
