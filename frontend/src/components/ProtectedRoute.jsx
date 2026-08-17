import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route that requires authentication.
 * Optionally restricts to specific roles via allowedRoles prop.
 *
 * Usage:
 *   <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *   <Route element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
