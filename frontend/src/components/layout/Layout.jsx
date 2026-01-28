import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import ServerAuthDialog from '../ServerAuthDialog';
import { useServerStatus } from '../../hooks/useServerStatus';
import socketService from '../../services/socket';
import './Layout.css';

function Layout() {
  const { status, stats } = useServerStatus();
  const [authData, setAuthData] = useState(null);

  useEffect(() => {
    const handleAuthRequest = (data) => {
      console.log('[Layout] Auth request received:', data);
      setAuthData(data);
    };

    socketService.on('authRequest', handleAuthRequest);
    return () => socketService.off('authRequest', handleAuthRequest);
  }, []);

  return (
    <div className="layout-root">
      <div className="layout-body">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />

      {authData && status === 'online' && !stats.authFileExists && (
        <ServerAuthDialog
          authData={authData}
          onClose={() => setAuthData(null)}
        />
      )}
    </div>
  );
}

export default Layout;
