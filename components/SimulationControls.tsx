import React, { useState } from 'react';

export type SimulationConfig = {
  systemVoltage: number;
  chargerType: 'Supercharger' | 'Standard CCS';
  maxCRate: number;
  coolingPower: number;
  moduleCount: number;
  maxCarPower: number | null;
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
  const [coolingPower, setCoolingPower] = useState<number>(1);
  const [moduleCount, setModuleCount] = useState<number>(24);
  const [maxCarPower, setMaxCarPower] = useState<number | null>(null);
  
  // Handle start button click - apply settings and start simulation
  const handleStart = () => {
    // Apply current settings
    onConfigChange({
      systemVoltage,
      chargerType,
      maxCRate,
      coolingPower,
      moduleCount,
      maxCarPower
    });
    
    // Start the simulation
    onStart();
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Simulation Controls</h2>
      
      {/* Control buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`px-4 py-2 rounded ${
            isRunning
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          Start
        </button>
        <button
          onClick={onStop}
          disabled={!isRunning}
          className={`px-4 py-2 rounded ${
            !isRunning
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          Stop
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System Voltage
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSystemVoltage(400)}
            className={`flex-1 px-3 py-1 rounded ${
              systemVoltage === 400
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            400V
          </button>
          <button
            onClick={() => setSystemVoltage(800)}
            className={`flex-1 px-3 py-1 rounded ${
              systemVoltage === 800
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            800V
          </button>
        </div>
      </div>
      
      {/* Charger Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Charger Type
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setChargerType('Supercharger')}
            className={`flex-1 px-3 py-1 rounded ${
              chargerType === 'Supercharger'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Supercharger
          </button>
          <button
            onClick={() => setChargerType('Standard CCS')}
            className={`flex-1 px-3 py-1 rounded ${
              chargerType === 'Standard CCS'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Standard CCS
          </button>
        </div>
      </div>
      
      {/* Max C-Rate */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cooling Power: {coolingPower}x
        </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={coolingPower}
          onChange={(e) => setCoolingPower(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Module Count */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Module Count: {moduleCount}
        </label>
        <input
          type="range"
          min="4"
          max="32"
          step="4"
          value={moduleCount}
          onChange={(e) => setModuleCount(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Max Car Power */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
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