import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './TrendChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart({
  title = 'Attendance Trend',
  labels = [],
  data = [],
  percentageData = [],
  loading = false,
}) {
  const chartData = {
    labels: labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: percentageData.length > 0 ? percentageData : (data.length > 0 ? data : [85, 90, 88, 94, 92, 89]),
        borderColor: '#3b82f6',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
        borderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3b4',
          font: {
            family: 'Inter',
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: '#111627',
        titleColor: '#f0f2f5',
        bodyColor: '#3b82f6',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#5a6275',
          font: { family: 'Inter', size: 10 },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#5a6275',
          font: { family: 'Inter', size: 10 },
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="trend-chart-card">
      <div className="trend-chart-header">
        <span className="trend-chart-title">{title}</span>
      </div>
      <div className="trend-chart-body">
        {loading ? (
          <div className="chart-loading">
            <span className="spinner" /> Loading chart data…
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}
