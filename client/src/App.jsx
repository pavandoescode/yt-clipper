import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SavedClips from './pages/SavedClips';
import History from './pages/History';
import LiveStreams from './pages/LiveStreams';
import LivestreamDetails from './pages/LivestreamDetails';
import LivestreamAnalyze from './pages/LivestreamAnalyze';
import Profile from './pages/Profile';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-card" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    return user ? <Navigate to="/" /> : children;
}

function AppContent() {
    const { user } = useAuth();

    return (
        <>
            {user && <Header />}
            <Routes>
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/saved" element={<PrivateRoute><SavedClips /></PrivateRoute>} />
                <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
                <Route path="/livestreams" element={<PrivateRoute><LiveStreams /></PrivateRoute>} />
                <Route path="/livestream/:id" element={<PrivateRoute><LivestreamDetails /></PrivateRoute>} />
                <Route path="/analyze/:videoId" element={<PrivateRoute><LivestreamAnalyze /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SidebarProvider>
                    <AppContent />
                </SidebarProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

