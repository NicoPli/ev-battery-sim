import React from 'react';
import { ChargingSimulation } from '../models/ChargingSimulation';

type SimulationStatsProps = {
  simulation: ChargingSimulation;
};

const SimulationStats: React.FC<SimulationStatsProps> = ({ simulation }) => {
  // Skip rendering if simulation or batteryPack is not available
  if (!simulation || !simulation.batteryPack) {
    return <div className="bg-white p-6 rounded-lg shadow-md">Loading simulation data...</div>;
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatPower = (power: number): string => {
    return power.toFixed(1);
  };
  
  const formatTemperature = (temp: number): string => {
    return temp.toFixed(1);
  };
  
  const formatVoltage = (voltage: number | undefined): string => {
    return voltage !== undefined ? voltage.toFixed(2) : "N/A";
  };
  
  // Rest of the component with safe property access
  const batteryPack = simulation.batteryPack;
  
  // Get the latest data point with null check
  const latestDataPoint = simulation.dataPoints && simulation.dataPoints.length > 0 
    ? simulation.dataPoints[simulation.dataPoints.length - 1] 
    : null;
  
  // Calculate current power
  const currentPower = latestDataPoint ? latestDataPoint.power : 0;
  
  // Calculate current in Amps
  const currentAmps = latestDataPoint ? latestDataPoint.current : 0;
  
  // Calculate average temperature
  const avgTemperature = batteryPack.averageTemperature;
  
  // Calculate max temperature
  const maxTemperature = batteryPack.maxTemperature;
  
  // Calculate battery size in kWh
  const batteryCapacity = batteryPack.totalCapacity; // Ah
  const systemVoltage = batteryPack._systemVoltage; // 400V or 800V
  const batterySizeKWh = (batteryCapacity * systemVoltage) / 1000;
  
  // Calculate total number of cells
  const totalCells = batteryPack.cells ? batteryPack.cells.length : 0;
  
  // Calculate cells in series
  const cellsInSeries = batteryPack._systemVoltage === 400 ? 108 : 216;
  
  // Calculate cells in parallel
  const cellsInParallel = Math.floor(totalCells / cellsInSeries);
  
  // Determine the current limiting factor
  const getLimitingFactor = () => {
    if (!simulation.isRunning) return "Not charging";
    return batteryPack.limitingFactor || "Unknown";
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Simulation Statistics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Elapsed Time</p>
          <p className="text-2xl font-bold">{formatTime(simulation.elapsedTime)}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">State of Charge</p>
          <p className="text-2xl font-bold">{simulation.batteryPack.averageSoc.toFixed(1)}%</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Battery Size</p>
          <p className="text-2xl font-bold">{batterySizeKWh.toFixed(1)} kWh</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Battery Voltage</p>
          <p className="text-2xl font-bold">{simulation.batteryPack.totalVoltage.toFixed(1)} V</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Current Power</p>
          <p className="text-2xl font-bold">{formatPower(currentPower)} kW</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Current</p>
          <p className="text-2xl font-bold">{currentAmps.toFixed(1)} A</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Avg Temperature</p>
          <p className="text-2xl font-bold">{formatTemperature(avgTemperature)} °C</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Max Temperature</p>
          <p className={`text-2xl font-bold ${
            maxTemperature > 45 ? 'text-red-500' : ''
          }`}>
            {formatTemperature(maxTemperature)} °C
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Battery Configuration</p>
          <p className="text-lg font-bold">{cellsInSeries}S{cellsInParallel}P ({totalCells} cells)</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Charging Limited By</p>
          <p className="text-xl font-bold">{getLimitingFactor()}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Cell Voltage Range</p>
          <p className="text-lg font-bold">
            {batteryPack && batteryPack.minCellVoltage !== undefined 
              ? formatVoltage(batteryPack.minCellVoltage) 
              : "N/A"} - 
            {batteryPack && batteryPack.maxCellVoltage !== undefined 
              ? formatVoltage(batteryPack.maxCellVoltage) 
              : "N/A"} V
            {batteryPack && batteryPack.voltageDifference !== undefined && (
              <span className="text-sm text-gray-500 ml-1">
                (Δ{formatVoltage(batteryPack.voltageDifference)} V)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimulationStats; 