import React, { useEffect, useRef, useState } from 'react';
import { SimulationDataPoint } from '../models/ChargingSimulation';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

interface ChargingChartProps {
  dataPoints: SimulationDataPoint[];
}

const ChargingChart: React.FC<ChargingChartProps> = ({ dataPoints }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  // Use a counter to force re-renders
  const [updateCounter, setUpdateCounter] = useState(0);

  // Set up an interval to force chart updates
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setUpdateCounter(prev => prev + 1);
    }, 500); // Update every 500ms
    
    return () => clearInterval(updateInterval);
  }, []);

  // Create or update chart when dataPoints or updateCounter changes
  useEffect(() => {
    // Register Chart.js components
    Chart.register(...registerables);
    
    // Process data to show one point per percentage
    const percentageData: (SimulationDataPoint | null)[] = Array(101).fill(null);
    
    dataPoints.forEach(point => {
      const percentIndex = Math.round(point.soc);
      if (percentIndex >= 0 && percentIndex <= 100) {
        if (!percentageData[percentIndex] || point.time > percentageData[percentIndex]!.time) {
          percentageData[percentIndex] = point;
        }
      }
    });
    
    // Prepare data for the chart
    const labels = Array.from({ length: 101 }, (_, i) => `${i}%`);
    const powerData = percentageData.map(point => point ? point.power : null);
    const tempData = percentageData.map(point => point ? point.temperature : null);
    
    // Initialize or update chart
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        // Always destroy and recreate the chart to ensure it updates properly
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        
        // Create new chart
        const config: ChartConfiguration = {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Power (kW)',
                data: powerData,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                yAxisID: 'y',
                spanGaps: true
              },
              {
                label: 'Temperature (°C)',
                data: tempData,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                yAxisID: 'y1',
                spanGaps: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
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
                },
                beginAtZero: true
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                  display: true,
                  text: 'Temperature (°C)'
                },
                min: -10,
                max: 65,
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
    
    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [dataPoints, updateCounter]); // Re-run when dataPoints or updateCounter changes

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