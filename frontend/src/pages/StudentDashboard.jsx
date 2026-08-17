import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import FilterBar from '../components/FilterBar';
import AttendanceTable from '../components/AttendanceTable';
import TrendChart from '../components/TrendChart';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [range, setRange] = useState('month');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    records: [],
    subjectSummary: [],
    todaySummary: [],
  });
  const [error, setError] = useState('');

  // Flag Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [claimReason, setClaimReason] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [flagFeedback, setFlagFeedback] = useState({ type: '', text: '' });

  const fetchAttendance = useCallback(async () => {
    if (!user?.id || !token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/students/${user.id}/attendance?range=${range}&subject=${encodeURIComponent(subject)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load attendance');

      setData({
        records: json.records || [],
        subjectSummary: json.subjectSummary || [],
        todaySummary: json.todaySummary || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, token, range, subject]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleOpenFlagModal = (record) => {
    setSelectedRecord(record);
    setClaimReason('');
    setFlagFeedback({ type: '', text: '' });
  };

  const handleCloseFlagModal = () => {
    setSelectedRecord(null);
    setClaimReason('');
  };

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!claimReason.trim() || !selectedRecord) return;

    setSubmittingFlag(true);
    setFlagFeedback({ type: '', text: '' });

    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attendanceRecordId: selectedRecord._id,
          claim: claimReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to submit flag');

      setFlagFeedback({ type: 'success', text: 'Flag submitted successfully!' });
      setTimeout(() => {
        handleCloseFlagModal();
        fetchAttendance();
      }, 1400);
    } catch (err) {
      setFlagFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmittingFlag(false);
    }
  };

  const filteredRecords = data.records.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (r.subject && r.subject.toLowerCase().includes(term)) ||
      (r.period && r.period.toLowerCase().includes(term)) ||
      (r.status && r.status.toLowerCase().includes(term))
    );
  });

  const subjectOptions = data.subjectSummary.map((s) => s.subject);

  // Prepare chart data
  const chartLabels = data.subjectSummary.map((s) => s.subject);
  const chartValues = data.subjectSummary.map((s) => s.percentage);

  return (
    <DashboardLayout activeTab="My Attendance">
      <div className="student-dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Student Attendance Dashboard</h1>
            <p className="dashboard-subtitle">Read-only view of your attendance records and statistics</p>
          </div>
        </div>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        {/* ── Today's Summary Card ───────────────────── */}
        <section className="summary-section">
          <h3 className="section-heading">Today&apos;s Status</h3>
          <div className="today-grid">
            {data.todaySummary.length === 0 ? (
              <div className="today-card today-card--empty">No classes scheduled/marked today yet.</div>
            ) : (
              data.todaySummary.map((item) => (
                <div key={item._id} className="today-card">
                  <div className="today-card__subject">{item.subject}</div>
                  <div className="today-card__period">Period: {item.period}</div>
                  <div className="today-card__status">
                    <span className={`status-badge status-badge--${item.status}`}>{item.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Subject Percentage & Warning Thresholds ── */}
        <section className="subject-stats-section">
          <h3 className="section-heading">Attendance Percentage by Subject</h3>
          <div className="subject-cards-grid">
            {data.subjectSummary.length === 0 ? (
              <div className="subject-card-empty">No subject data available.</div>
            ) : (
              data.subjectSummary.map((sub) => (
                <div
                  key={sub.subject}
                  className={`subject-card ${sub.belowThreshold ? 'subject-card--warning' : ''}`}
                >
                  <div className="subject-card__header">
                    <span className="subject-name">{sub.subject}</span>
                    {sub.belowThreshold && (
                      <span className="warning-pill">⚠️ Below 75% Min</span>
                    )}
                  </div>
                  <div className="subject-card__percentage">{sub.percentage}%</div>
                  <div className="subject-card__footer">
                    {sub.attendedClasses} / {sub.totalClasses} classes attended
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Trend Visualizer ─────────────────────── */}
        {chartLabels.length > 0 && (
          <TrendChart
            title="Per-Subject Attendance Rate (%)"
            labels={chartLabels}
            percentageData={chartValues}
            loading={loading}
          />
        )}

        {/* ── Historical Attendance Table ────────────── */}
        <section className="history-section">
          <h3 className="section-heading">Attendance History</h3>
          <FilterBar
            range={range}
            onRangeChange={setRange}
            subjectFilter={subject}
            onSubjectChange={setSubject}
            subjectOptions={subjectOptions}
            searchTerm={search}
            onSearchChange={setSearch}
          />

          <AttendanceTable
            records={filteredRecords}
            loading={loading}
            showStudentInfo={false}
            renderActions={(rec) =>
              rec.status === 'absent' ? (
                <button
                  type="button"
                  className="btn-flag"
                  onClick={() => handleOpenFlagModal(rec)}
                  title="Report an issue or dispute this absence"
                >
                  🚩 Raise a Flag
                </button>
              ) : (
                <span className="text-muted-read">—</span>
              )
            }
          />
        </section>
      </div>

      {/* ── Raise a Flag Modal ─────────────────────── */}
      {selectedRecord && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Raise Attendance Flag</h3>
              <button className="modal-close" onClick={handleCloseFlagModal}>
                ×
              </button>
            </div>

            <p className="modal-desc">
              Report an issue regarding your marked <strong>absent</strong> status for{' '}
              <strong>{selectedRecord.subject}</strong> (Period {selectedRecord.period}).
            </p>

            {flagFeedback.text && (
              <div className={`auth-alert auth-alert--${flagFeedback.type}`}>
                {flagFeedback.text}
              </div>
            )}

            <form onSubmit={handleSubmitFlag}>
              <div className="form-group">
                <label className="form-label" htmlFor="claimReason">
                  Reason / Explanation for Teacher Review:
                </label>
                <textarea
                  id="claimReason"
                  className="form-textarea"
                  rows={4}
                  placeholder="E.g., I was present in class but seated near the back, or I was at medical leave..."
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleCloseFlagModal}
                  disabled={submittingFlag}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submittingFlag || !claimReason.trim()}
                >
                  {submittingFlag ? <span className="spinner" /> : null}
                  {submittingFlag ? 'Submitting…' : 'Submit Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
