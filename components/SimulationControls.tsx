import React, { useState } from 'react';

export type SimulationConfig = {
  systemVoltage: number;
  chargerType: 'Supercharger' | 'Standard CCS';
  maxCRate: number;
  coolingPower: number;
  moduleCount: number;
  maxCarPower: number | null;
};

type SimulationControlsProps = {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onConfigChange: (config: SimulationConfig) => void;
  isRunning: boolean;
  timeAcceleration: number;
  onTimeAccelerationChange: (acceleration: number) => void;
};

const SimulationControls: React.FC<SimulationControlsProps> = ({
  onStart,
  onStop,
  onReset,
  onConfigChange,
  isRunning,
  timeAcceleration,
  onTimeAccelerationChange
}) => {
  const [config, setConfig] = useState<SimulationConfig>({
    systemVoltage: 400,
    chargerType: 'Supercharger',
    maxCRate: 2,
    coolingPower: 1,
    moduleCount: 24,
    maxCarPower: null
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        parsedValue = 0;
      }
    } else if (name === 'maxCarPower') {
      parsedValue = value === '' ? null : parseFloat(value);
      if (parsedValue !== null && isNaN(parsedValue)) {
        parsedValue = null;
      }
    }
    
    setConfig({
      ...config,
      [name]: parsedValue
    });
  };
  
  const handleApplySettings = () => {
    onConfigChange(config);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Simulation Controls</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Voltage
          </label>
          <select
            name="systemVoltage"
            value={config.systemVoltage}
            onChange={handleInputChange}
            disabled={isRunning}
            className="w-full p-2 border rounded"
          >
            <option value={400}>400V</option>
            <option value={800}>800V</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Charger Type
          </label>
          <select
            name="chargerType"
            value={config.chargerType}
            onChange={handleInputChange}
            disabled={isRunning}
            className="w-full p-2 border rounded"
          >
            <option value="Supercharger">Supercharger (625A)</option>
            <option value="Standard CCS">Standard CCS (500A)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max C-Rate
          </label>
          <input
            type="number"
            name="maxCRate"
            value={config.maxCRate}
            onChange={handleInputChange}
            disabled={isRunning}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cooling Power (0-5)
          </label>
          <input
            type="number"
            name="coolingPower"
            value={config.coolingPower}
            onChange={handleInputChange}
            disabled={isRunning}
            min={0}
            max={5}
            step={0.1}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Modules
          </label>
          <input
            type="number"
            name="moduleCount"
            value={config.moduleCount}
            onChange={handleInputChange}
            disabled={isRunning}
            min={1}
            max={36}
            step={1}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Car Power (kW, optional)
          </label>
          <input
            type="number"
            name="maxCarPower"
            value={config.maxCarPower === null ? '' : config.maxCarPower}
            onChange={handleInputChange}
            disabled={isRunning}
            min={10}
            placeholder="No limit"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <div className="mb-6">
        <button
          onClick={handleApplySettings}
          disabled={isRunning}
          className={`px-4 py-2 rounded ${
            isRunning
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Apply Settings
        </button>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Time Acceleration: {timeAcceleration}x
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={timeAcceleration}
          onChange={(e) => onTimeAccelerationChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      
      <div className="flex space-x-4">
        {!isRunning ? (
          <button
            onClick={onStart}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Stop
          </button>
        )}
        
        <button
          onClick={onReset}
          disabled={isRunning}
          className={`px-4 py-2 rounded ${
            isRunning
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-yellow-500 text-white hover:bg-yellow-600'
          }`}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default SimulationControls; 