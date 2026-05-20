import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import MammographyList from './pages/MammographyList';
import Dashboard from './pages/Dashboard';
import Metas from './pages/Metas';
import UserList from './pages/UserList';
import Settings from './pages/Settings';
import PositiveCases from './pages/PositiveCases';
import Sidebar from './components/Sidebar';
import { AnimatePresence, motion } from 'framer-motion';

function PrivateRoute({ children }) {
  const { session, loading, user, signOut } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Cargando...</p>
      </div>
    </div>
  );
  
  if (!session) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <Sidebar {...{ user, onLogout: signOut } as any} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/mamografias"
          element={
            <PrivateRoute>
              <MammographyList />
            </PrivateRoute>
          }
        />
        <Route
          path="/metas"
          element={
            <PrivateRoute>
              <Metas />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <PrivateRoute>
              <UserList />
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/casos-positivos"
          element={
            <PrivateRoute>
              <PositiveCases />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;