import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import FilterBar from '../components/FilterBar';
import AttendanceTable from '../components/AttendanceTable';
import TrendChart from '../components/TrendChart';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState('month');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');

  // Sample data for Section 1 preview
  const sampleRecords = [
    {
      _id: 'rec_1',
      markedAt: new Date().toISOString(),
      studentName: user?.name || 'Alice Smith',
      rollNo: 'CS-2024-001',
      subject: 'Computer Networks',
      period: 'P1',
      status: 'present',
      confidenceScore: 0.95,
    },
    {
      _id: 'rec_2',
      markedAt: new Date(Date.now() - 86400000).toISOString(),
      studentName: user?.name || 'Alice Smith',
      rollNo: 'CS-2024-001',
      subject: 'Data Structures',
      period: 'P2',
      status: 'teacher_confirmed',
      confidenceScore: 0.88,
    },
    {
      _id: 'rec_3',
      markedAt: new Date(Date.now() - 172800000).toISOString(),
      studentName: user?.name || 'Alice Smith',
      rollNo: 'CS-2024-001',
      subject: 'Operating Systems',
      period: 'P3',
      status: 'absent',
      confidenceScore: 0.0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="welcome-banner">
        <h2>Welcome back, {user?.name} 👋</h2>
        <p>Logged in as <strong>{user?.role}</strong> — System components ready.</p>
      </div>

      <FilterBar
        range={range}
        onRangeChange={setRange}
        subjectFilter={subject}
        onSubjectChange={setSubject}
        subjectOptions={['Computer Networks', 'Data Structures', 'Operating Systems']}
        searchTerm={search}
        onSearchChange={setSearch}
      />

      <TrendChart title="Overall Attendance Trend" labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']} percentageData={[85, 92, 88, 95, 90, 94]} />

      <AttendanceTable records={sampleRecords} showStudentInfo={user?.role !== 'student'} />
    </DashboardLayout>
  );
}
