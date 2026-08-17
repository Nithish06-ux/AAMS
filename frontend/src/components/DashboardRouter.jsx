import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../pages/StudentDashboard';
import DashboardPage from '../pages/DashboardPage';

export default function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'student') {
    return <StudentDashboard />;
  }

  // Placeholder fallback for teacher/admin until Section 3-5 are built
  return <DashboardPage />;
}
