import './FilterBar.css';

export default function FilterBar({
  range = 'month',
  onRangeChange,
  subjectFilter,
  onSubjectChange,
  subjectOptions = [],
  searchTerm,
  onSearchChange,
  extraControls,
}) {
  const ranges = [
    { label: 'Today', value: 'day' },
    { label: '7 Days', value: 'week' },
    { label: '30 Days', value: 'month' },
    { label: '6 Months', value: '6month' },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-bar__group">
        <span className="filter-bar__label">Time Range</span>
        <div className="filter-bar__range-buttons">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`range-btn ${range === r.value ? 'range-btn--active' : ''}`}
              onClick={() => onRangeChange && onRangeChange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {subjectOptions.length > 0 && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Subject</span>
          <select
            className="filter-select"
            value={subjectFilter || ''}
            onChange={(e) => onSubjectChange && onSubjectChange(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjectOptions.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {onSearchChange !== undefined && (
        <div className="filter-bar__group filter-bar__search">
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search records…"
            value={searchTerm || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {extraControls && <div className="filter-bar__extra">{extraControls}</div>}
    </div>
  );
}
