import './AttendanceTable.css';

export default function AttendanceTable({
  records = [],
  loading = false,
  emptyText = 'No attendance records found.',
  renderActions,
  showStudentInfo = false,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <span className="status-badge status-badge--present">Present</span>;
      case 'teacher_confirmed':
        return <span className="status-badge status-badge--confirmed">Teacher Confirmed</span>;
      case 'manual_review':
        return <span className="status-badge status-badge--review">Manual Review</span>;
      case 'absent':
        return <span className="status-badge status-badge--absent">Absent</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="table-container">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            {showStudentInfo && <th>Student</th>}
            <th>Subject</th>
            <th>Period</th>
            <th>Status</th>
            <th>Confidence</th>
            {renderActions && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={showStudentInfo ? (renderActions ? 7 : 6) : renderActions ? 6 : 5} className="table-empty">
                <span className="spinner" /> Loading records…
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={showStudentInfo ? (renderActions ? 7 : 6) : renderActions ? 6 : 5} className="table-empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            records.map((rec) => (
              <tr key={rec._id || rec.id}>
                <td className="cell-date">{formatDate(rec.markedAt || rec.createdAt || rec.date)}</td>
                {showStudentInfo && (
                  <td>
                    <div className="cell-student">
                      <span className="student-name">{rec.studentName || rec.studentId?.name || 'Student'}</span>
                      <span className="student-roll">{rec.rollNo || rec.studentId?.rollNo || ''}</span>
                    </div>
                  </td>
                )}
                <td className="cell-subject">{rec.subject || rec.sessionId?.subject || 'N/A'}</td>
                <td>{rec.period || rec.sessionId?.period || 'N/A'}</td>
                <td>{getStatusBadge(rec.status)}</td>
                <td>
                  {rec.confidenceScore !== undefined ? (
                    <span
                      className={`confidence-tag ${
                        rec.confidenceScore >= 0.8
                          ? 'confidence-high'
                          : rec.confidenceScore >= 0.6
                          ? 'confidence-med'
                          : 'confidence-low'
                      }`}
                    >
                      {(rec.confidenceScore * 100).toFixed(0)}%
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                {renderActions && <td>{renderActions(rec)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
