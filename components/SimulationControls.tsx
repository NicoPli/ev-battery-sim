import React, { useState, useEffect } from 'react';
import { Cell } from '../models/Cell';

export type SimulationConfig = {
  systemVoltage: number;
  chargerType: 'Supercharger' | 'Standard CCS';
  maxCRate: number;
  coolingPower: number;
  moduleCount: number;
  maxCarPower: number | null;
  initialTemperature: number;
  batteryHeatingEnabled: boolean;
};

interface SimulationControlsProps {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onConfigChange: (config: SimulationConfig) => void;
  isRunning: boolean;
  timeAcceleration: number;
  onTimeAccelerationChange: (acceleration: number) => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  onStart,
  onStop,
  onReset,
  onConfigChange,
  isRunning,
  timeAcceleration,
  onTimeAccelerationChange
}) => {
  const [systemVoltage, setSystemVoltage] = useState<number>(400);
  const [chargerType, setChargerType] = useState<'Supercharger' | 'Standard CCS'>('Supercharger');
  const [maxCRate, setMaxCRate] = useState<number>(2);
  const [coolingPower, setCoolingPower] = useState<number>(5);
  const [batterySize, setBatterySize] = useState<number>(80); // Store battery size in kWh
  const [maxCarPower, setMaxCarPower] = useState<number | null>(null);
  const [initialTemperature, setInitialTemperature] = useState<number>(25);
  const [batteryHeatingEnabled, setBatteryHeatingEnabled] = useState<boolean>(false);
  
  // Get cell properties dynamically
  const [cellProps, setCellProps] = useState({
    voltage: 3.7,
    capacity: 10
  });
  
  useEffect(() => {
    // Create a sample cell to get its properties
    const sampleCell = new Cell();
    setCellProps({
      voltage: sampleCell.voltage, // This will use the getter
      capacity: sampleCell.capacity
    });
  }, []);
  
  // Auto-enable battery heating when temperature is low
  useEffect(() => {
    if (initialTemperature < 15) {
      setBatteryHeatingEnabled(true);
    }
  }, [initialTemperature]);
  
  // Calculate module count based on battery size and voltage
  const calculateModuleCount = (capacityKWh: number, voltage: number) => {
    // Use dynamically fetched cell properties
    const cellVoltage = cellProps.voltage;
    const cellCapacity = cellProps.capacity;
    const cellsPerModule = voltage === 400 ? 108 : 216;
    
    // Calculate total energy in Wh
    const totalWh = capacityKWh * 1000;
    
    // Calculate how many modules we need
    const moduleEnergy = cellsPerModule * cellVoltage * cellCapacity; // Wh per module
    const moduleCount = Math.round(totalWh / moduleEnergy);
    
    return Math.max(4, Math.min(32, moduleCount)); // Clamp between 4 and 32 modules
  };
  
  // Get the current module count based on selected battery size and voltage
  const moduleCount = calculateModuleCount(batterySize, systemVoltage);
  
  // Battery size options in kWh
  const batterySizeOptions = [40, 60, 80, 100, 120, 150, 200];
  
  // Handle voltage change - keep the same kWh but recalculate modules
  const handleVoltageChange = (newVoltage: number) => {
    setSystemVoltage(newVoltage);
    // No need to change batterySize, moduleCount will be recalculated
  };
  
  // Handle start button click - apply settings and start simulation
  const handleStart = () => {
    // Apply current settings
    onConfigChange({
      systemVoltage,
      chargerType,
      maxCRate,
      coolingPower,
      moduleCount, // Use calculated module count
      maxCarPower,
      initialTemperature,
      batteryHeatingEnabled
    });
    
    // Start the simulation
    onStart();
  };
  
  // Add this effect to update the configuration whenever temperature or heating changes
  useEffect(() => {
    // Update the configuration when temperature or heating changes
    onConfigChange({
      systemVoltage,
      chargerType,
      maxCRate,
      coolingPower,
      moduleCount,
      maxCarPower,
      initialTemperature,
      batteryHeatingEnabled
    });
  }, [initialTemperature, batteryHeatingEnabled]);
  
  // Also update the handleTemperatureChange function
  const handleTemperatureChange = (value: number) => {
    setInitialTemperature(value);
    // Reset the simulation with the new temperature
    onReset();
  };
  
  return (
    <div className="p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Simulation Controls</h2>
      
      {/* Control buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={isRunning ? onStop : handleStart}
          className={`px-4 py-2 rounded ${
            isRunning
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reset
        </button>
      </div>
      
      {/* Time Acceleration control */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">
          Time Acceleration: {timeAcceleration}x
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={timeAcceleration}
          onChange={(e) => onTimeAccelerationChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      <h3 className="text-lg font-medium mb-3">Battery Configuration</h3>
      
      {/* System Voltage */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          System Voltage
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleVoltageChange(400)}
            className={`flex-1 px-3 py-1 rounded ${
              systemVoltage === 400
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            400V
          </button>
          <button
            onClick={() => handleVoltageChange(800)}
            className={`flex-1 px-3 py-1 rounded ${
              systemVoltage === 800
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            800V
          </button>
        </div>
      </div>
      
      {/* Charger Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Charger Type
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setChargerType('Supercharger')}
            className={`flex-1 px-3 py-1 rounded ${
              chargerType === 'Supercharger'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            Supercharger
          </button>
          <button
            onClick={() => setChargerType('Standard CCS')}
            className={`flex-1 px-3 py-1 rounded ${
              chargerType === 'Standard CCS'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            Standard CCS
          </button>
        </div>
      </div>
      
      {/* Battery Size dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Battery Size ({batterySize} kWh, {moduleCount} modules)
        </label>
        <select 
          className="w-full p-2 border border-gray-300 rounded"
          value={batterySize}
          onChange={(e) => setBatterySize(Number(e.target.value))}
        >
          {batterySizeOptions.map(size => (
            <option key={size} value={size}>
              {size} kWh
            </option>
          ))}
        </select>
      </div>
      
      {/* Max C-Rate */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Max C-Rate: {maxCRate}C
        </label>
        <input
          type="range"
          min="1"
          max="6"
          step="0.1"
          value={maxCRate}
          onChange={(e) => setMaxCRate(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Cooling Power */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Cooling Power: {coolingPower}x
        </label>
        <input
          type="range"
          min="0.1"
          max="20"
          step="0.1"
          value={coolingPower}
          onChange={(e) => setCoolingPower(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Initial Temperature */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Initial Temperature: {initialTemperature}°C
          {initialTemperature < 15 && (
            <span className="ml-2 text-amber-500 font-medium">
              (Cold battery - charging limited)
            </span>
          )}
        </label>
        <input
          type="range"
          min="-10"
          max="25"
          step="1"
          value={initialTemperature}
          onChange={(e) => handleTemperatureChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Battery Heating Option */}
      {initialTemperature < 15 && (
        <div className="mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="batteryHeating"
              checked={batteryHeatingEnabled}
              onChange={(e) => setBatteryHeatingEnabled(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="batteryHeating" className="text-sm font-medium">
              Enable Battery Heating
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Heating helps warm the battery for faster charging in cold conditions
          </p>
        </div>
      )}
      
      {/* Max Car Power */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Max Car Power (kW): {maxCarPower === null ? 'Unlimited' : maxCarPower}
        </label>
        <input
          type="range"
          min="50"
          max="350"
          step="10"
          value={maxCarPower === null ? 350 : maxCarPower}
          onChange={(e) => {
            const value = Number(e.target.value);
            setMaxCarPower(value >= 350 ? null : value);
          }}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default SimulationControls; 