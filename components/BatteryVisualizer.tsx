import React, { useState } from 'react';
import { BatteryPack } from '../models/BatteryPack';
import { useLanguage } from '../contexts/LanguageContext';

interface BatteryVisualizerProps {
  batteryPack: BatteryPack | null;
}

interface BatteryCell {
  temperature?: number;
  stateOfCharge?: number;
  heatingEnabled?: boolean;
  wasBalanced?: boolean;
}

const BatteryVisualizer: React.FC<BatteryVisualizerProps> = ({ batteryPack }) => {
  const [viewMode, setViewMode] = useState<'temperature' | 'voltage'>('temperature');
  const { t } = useLanguage();

  // More robust check for batteryPack and its properties
  if (!batteryPack) {
    return <div className="p-6 rounded-lg shadow-md">Loading battery data...</div>;
  }

  // Safely access cells
  const cells = batteryPack?.cells || [];
  
  if (cells.length === 0) {
    return <div className="p-6 rounded-lg shadow-md">No battery cells available</div>;
  }

  const getTemperatureColor = (temp: number): string => {
    // Blue (cold) to red (hot) gradient
    if (temp < 0) return 'bg-blue-800';
    if (temp < 10) return 'bg-blue-600';
    if (temp < 25) return 'bg-blue-500';
    if (temp < 30) return 'bg-blue-300';
    if (temp < 35) return 'bg-green-300';
    if (temp < 40) return 'bg-yellow-300';
    if (temp < 45) return 'bg-orange-400';
    if (temp < 50) return 'bg-red-500';
    return 'bg-red-700';
  };
  
  const getVoltageColor = (soc: number): string => {
    if (soc < 10) return 'bg-red-700';
    if (soc < 20) return 'bg-red-500'; 
    if (soc < 30) return 'bg-red-300';
    if (soc < 40) return 'bg-orange-400';
    if (soc < 50) return 'bg-orange-300';
    if (soc < 60) return 'bg-yellow-300';
    if (soc < 70) return 'bg-yellow-200';
    if (soc < 80) return 'bg-green-300';
    if (soc < 90) return 'bg-green-400';
    return 'bg-green-500';
  };
  
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'temperature' ? 'voltage' : 'temperature');
  };

  // Check if battery heating is enabled
  const isHeatingEnabled = batteryPack.batteryHeatingEnabled;
  
  // Get the number of cells in series and parallel
  const cellsInSeries = batteryPack.cellsInSeries;
  const cellsInParallel = batteryPack.cellsInParallel;
  
  // Create a 2D array to represent the battery layout
  // Each row represents a parallel string, each column a cell in series
  const cellRows: Array<Array<BatteryCell>> = [];
  
  for (let p = 0; p < cellsInParallel; p++) {
    const row: BatteryCell[] = [];
    for (let s = 0; s < cellsInSeries; s++) {
      const cellIndex = s + (p * cellsInSeries);
      if (cellIndex < cells.length) {
        row.push(cells[cellIndex]);
      }
    }
    cellRows.push(row);
  }

  return (
    <div className="p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{t.visualization.batteryVisualization}</h2>
        <button
          onClick={toggleViewMode} 
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
        >
          {t.visualization.switchTo} {viewMode === 'temperature' ? t.visualization.voltage : t.visualization.temperature}
        </button>
      </div>
      <p className="text-sm mb-4">
        {t.visualization.showing} {viewMode === 'temperature' ? t.visualization.temperature : t.visualization.voltage} {t.visualization.distribution}
        {isHeatingEnabled && (
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path>
            </svg>
            {t.visualization.batteryHeatingActive}
          </span>
        )}
      </p>
      
      <div className="mb-2 text-sm">
        <span className="font-medium">{t.visualization.configuration}: </span>
        {cellsInSeries}S{cellsInParallel}P ({cells.length} cells)
        <span className="ml-2 font-medium">{t.visualization.capacity}: </span>
        {batteryPack.energyCapacityKWh.toFixed(1)} kWh
        <span className="ml-2 font-medium">{t.visualization.cellsBalanced}: </span>
        {batteryPack.cellsBalanced}
      </div>
      
      <div className="border border-gray-200 rounded">
        <div className={`p-2 ${isHeatingEnabled ? 'bg-amber-50' : ''}`}>
          {cellRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex mb-0.5 whitespace-nowrap">
              {row.map((cell, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`w-1.5 h-4 mx-px ${
                    viewMode === 'temperature'
                      ? getTemperatureColor(cell?.temperature || 25)
                      : getVoltageColor((cell?.stateOfCharge || 0) * 100)
                  } ${cell?.wasBalanced ? 'border-t-4 border-black' : ''}`}
                  title={`Cell R${rowIndex+1}C${cellIndex+1}: ${
                    viewMode === 'temperature'
                      ? `${(cell?.temperature || 25).toFixed(1)}°C`
                      : `${((cell?.stateOfCharge || 0) * 100).toFixed(1)}%`
                  }`}
                />
              ))}
              <span className="ml-2 text-xs text-gray-500">{t.visualization.string} {(rowIndex + 1).toString().padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">{t.visualization.legend}</h3>
        <div className="flex gap-2 flex-wrap">
          {viewMode === 'temperature' ? (
            <>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-800 rounded mr-1"></div>
                <span className="text-xs">&lt;0°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded mr-1"></div>
                <span className="text-xs">0-10°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-1"></div>
                <span className="text-xs">10-25°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-300 rounded mr-1"></div>
                <span className="text-xs">25-30°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-300 rounded mr-1"></div>
                <span className="text-xs">30-35°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-300 rounded mr-1"></div>
                <span className="text-xs">35-40°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-400 rounded mr-1"></div>
                <span className="text-xs">40-45°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-1"></div>
                <span className="text-xs">45-50°C</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-700 rounded mr-1"></div>
                <span className="text-xs">&gt;50°C</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-700 rounded mr-1"></div>
                <span className="text-xs">&lt;10%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-1"></div>
                <span className="text-xs">10-20%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-300 rounded mr-1"></div>
                <span className="text-xs">20-30%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-400 rounded mr-1"></div>
                <span className="text-xs">30-40%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-300 rounded mr-1"></div>
                <span className="text-xs">40-50%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-300 rounded mr-1"></div>
                <span className="text-xs">50-60%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-200 rounded mr-1"></div>
                <span className="text-xs">60-70%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-300 rounded mr-1"></div>
                <span className="text-xs">70-80%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-400 rounded mr-1"></div>
                <span className="text-xs">80-90%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-1"></div>
                <span className="text-xs">&gt;90%</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryVisualizer; 