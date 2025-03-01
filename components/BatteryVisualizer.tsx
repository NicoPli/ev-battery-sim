import React, { useState } from 'react';
import { BatteryPack } from '../models/BatteryPack';

interface BatteryVisualizerProps {
  batteryPack: BatteryPack | null;
}

interface BatteryCell {
  temperature?: number;
  stateOfCharge?: number;
  heatingEnabled?: boolean;
}

const BatteryVisualizer: React.FC<BatteryVisualizerProps> = ({ batteryPack }) => {
  const [viewMode, setViewMode] = useState<'temperature' | 'voltage'>('temperature');

  // More robust check for batteryPack and its properties
  if (!batteryPack) {
    return <div className="p-6 rounded-lg shadow-md">Loading battery data...</div>;
  }

  // Safely access modules with optional chaining
  const modules = batteryPack?.modules || [];
  
  if (modules.length === 0) {
    return <div className="p-6 rounded-lg shadow-md">No battery modules available</div>;
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
    // Red (low) to green (high) gradient for voltage/SoC
    if (soc < 10) return 'bg-red-700';
    if (soc < 20) return 'bg-red-500';
    if (soc < 40) return 'bg-orange-400';
    if (soc < 60) return 'bg-yellow-300';
    if (soc < 80) return 'bg-green-300';
    return 'bg-green-500';
  };
  
  // Calculate the number of modules to display per row
  const modulesPerRow = Math.min(6, modules.length);
  
  // Group modules into rows
  const moduleRows: Array<Array<typeof modules[0]>> = [];
  const modulesCopy = [...modules];
  
  while (modulesCopy.length > 0) {
    moduleRows.push(modulesCopy.splice(0, modulesPerRow));
  }
  
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'temperature' ? 'voltage' : 'temperature');
  };

  // Check if battery heating is enabled
  const isHeatingEnabled = batteryPack.batteryHeatingEnabled;

  return (
    <div className="p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">Battery Visualization</h2>
        <button
          onClick={toggleViewMode} 
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
        >
          Switch to {viewMode === 'temperature' ? 'Voltage' : 'Temperature'} View
        </button>
      </div>
      <p className="text-sm mb-4">
        Showing {viewMode === 'temperature' ? 'temperature' : 'state of charge'} distribution
        {isHeatingEnabled && (
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"></path>
            </svg>
            Battery Heating Active
          </span>
        )}
      </p>
      
      <div className="flex flex-col gap-4">
        {moduleRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 justify-center">
            {row.map((module, moduleIndex) => {
              const actualIndex = rowIndex * modulesPerRow + moduleIndex;
              
              // Get cells from the module with null check
              const cells = module?.cells || [];
              
              // Calculate cells per row within a module
              const cellsPerRow = Math.ceil(Math.sqrt(cells.length));
              
              return (
                <div 
                  key={moduleIndex} 
                  className={`border border-gray-300 p-1 rounded ${isHeatingEnabled ? 'bg-amber-50' : ''}`}
                  title={`Module ${actualIndex + 1}`}
                >
                  <div className="grid gap-0.5" style={{ 
                    gridTemplateColumns: `repeat(${cellsPerRow || 1}, minmax(0, 1fr))` 
                  }}>
                    {cells.map((cell: BatteryCell, cellIndex: number) => (
                      <div
                        key={cellIndex}
                        className={`w-2 h-2 rounded-sm ${
                          viewMode === 'temperature'
                            ? getTemperatureColor(cell?.temperature || 25)
                            : getVoltageColor((cell?.stateOfCharge || 0) * 100)
                        }`}
                        title={`Cell ${cellIndex + 1}: ${
                          viewMode === 'temperature'
                            ? `${(cell?.temperature || 25).toFixed(1)}°C`
                            : `${((cell?.stateOfCharge || 0) * 100).toFixed(1)}%`
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Legend</h3>
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
                <div className="w-4 h-4 bg-orange-400 rounded mr-1"></div>
                <span className="text-xs">20-40%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-300 rounded mr-1"></div>
                <span className="text-xs">40-60%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-300 rounded mr-1"></div>
                <span className="text-xs">60-80%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-1"></div>
                <span className="text-xs">&gt;80%</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatteryVisualizer; 