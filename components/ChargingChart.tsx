import React from 'react';
import { Line } from 'react-chartjs-2';
import { SimulationDataPoint } from '../models/ChargingSimulation';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChargingChartProps {
  dataPoints: SimulationDataPoint[];
}

const ChargingChart: React.FC<ChargingChartProps> = ({ dataPoints }) => {
  const { t } = useLanguage();
  
  // Sort data points by SoC for a smooth curve
  const sortedDataPoints = [...dataPoints].sort((a, b) => a.soc - b.soc);
  
  // Create SoC labels for x-axis (every 1%)
  const socLabels = [];
  for (let i = 0; i <= 100; i += 1) {
    socLabels.push(i);
  }
  
  // Group data points by SoC ranges (every 1%)
  const groupedData: { [key: number]: SimulationDataPoint[] } = {};
  
  sortedDataPoints.forEach(point => {
    const socKey = Math.round(point.soc);
    if (!groupedData[socKey]) {
      groupedData[socKey] = [];
    }
    groupedData[socKey].push(point);
  });
  
  // Calculate average values for each SoC percentage
  const averagedData: SimulationDataPoint[] = [];
  
  for (let soc = 0; soc <= 100; soc++) {
    if (groupedData[soc] && groupedData[soc].length > 0) {
      const points = groupedData[soc];
      const avgPower = points.reduce((sum, p) => sum + p.power, 0) / points.length;
      const avgTemp = points.reduce((sum, p) => sum + p.temperature, 0) / points.length;
      const heatingEnabled = points.some(p => p.heatingEnabled);
      
      averagedData.push({
        soc,
        power: avgPower,
        temperature: avgTemp,
        current: 0, // Not used
        time: 0, // Not relevant for this view
        voltage: 0, // Not relevant for this view
        heatingEnabled
      });
    }
  }
  
  const data = {
    labels: socLabels,
    datasets: [
      {
        label: `${t.stats.currentPower} (kW)`,
        data: socLabels.map(soc => {
          const closest = averagedData.find(p => Math.round(p.soc) === soc);
          return closest ? closest.power : null;
        }),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
        tension: 0.3,
      },
      {
        label: `${t.stats.temperature} (°C)`,
        data: socLabels.map(soc => {
          const closest = averagedData.find(p => Math.round(p.soc) === soc);
          return closest ? closest.temperature : null;
        }),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
        tension: 0.3,
      }
    ],
  };
  
  const options: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    animation: false,
    animations: {
      colors: false,
      x: false,
      y: false
    },
    transitions: {
      active: {
        animation: {
          duration: 0
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: t.title,
      },
      tooltip: {
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const item = items[0];
            return `${t.stats.stateOfCharge}: ${item.label}%`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `${t.stats.stateOfCharge} (%)`,
        },
        ticks: {
          // Only show every 5% on the axis to avoid crowding
          callback: function(value, index) {
            return index % 5 === 0 ? this.getLabelForValue(index) : '';
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: `${t.stats.currentPower} (kW)`,
        },
        min: 0,
        max: 500, // Fixed scale for power
        grid: {
          drawOnChartArea: true,
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: `${t.stats.temperature} (°C)`,
        },
        min: -10, // Fixed scale for temperature
        max: 60,  // Fixed scale for temperature
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="p-6 rounded-lg shadow-md">
      <Line options={options} data={data} />
    </div>
  );
};

export default ChargingChart; 