import React, { useEffect, useRef } from 'react';
import { SimulationDataPoint } from '../models/ChargingSimulation';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

interface ChargingChartProps {
  dataPoints: SimulationDataPoint[];
}

const ChargingChart: React.FC<ChargingChartProps> = ({ dataPoints }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    // Register Chart.js components
    Chart.register(...registerables);
    
    // Initialize chart
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        // Destroy previous chart if it exists
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        // Create new chart
        const config: ChartConfiguration = {
          type: 'line',
          data: {
            labels: dataPoints.map(point => point.soc.toFixed(1) + '%'),
            datasets: [
              {
                label: 'Power (kW)',
                data: dataPoints.map(point => point.power),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                yAxisID: 'y'
              },
              {
                label: 'Temperature (°C)',
                data: dataPoints.map(point => point.temperature),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                yAxisID: 'y1'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                title: {
                  display: true,
                  text: 'State of Charge (%)'
                }
              },
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                  display: true,
                  text: 'Power (kW)'
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                  display: true,
                  text: 'Temperature (°C)'
                },
                grid: {
                  drawOnChartArea: false
                }
              }
            }
          }
        };
        
        chartInstance.current = new Chart(ctx, config);
      }
    }
    
    // Update chart when dataPoints change
    if (chartInstance.current && dataPoints.length > 0) {
      chartInstance.current.data.labels = dataPoints.map(point => point.soc.toFixed(1) + '%');
      chartInstance.current.data.datasets[0].data = dataPoints.map(point => point.power);
      chartInstance.current.data.datasets[1].data = dataPoints.map(point => point.temperature);
      chartInstance.current.update();
    }
    
    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [dataPoints]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Charging Curve</h2>
      <div className="w-full h-80">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default ChargingChart; 