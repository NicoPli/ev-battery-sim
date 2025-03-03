import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export type SimulationConfig = {
  systemVoltage: number;
  chargerType: 'Supercharger' | 'Standard CCS';
  maxCRate: number;
  coolingPower: number;
  batterySize: number;
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
  const { t } = useLanguage();
  const [systemVoltage, setSystemVoltage] = useState<number>(400);
  const [chargerType, setChargerType] = useState<'Supercharger' | 'Standard CCS'>('Supercharger');
  const [maxCRate, setMaxCRate] = useState<number>(2);
  const [coolingPower, setCoolingPower] = useState<number>(5);
  const [batterySize, setBatterySize] = useState<number>(80); // Store battery size in kWh
  const [maxCarPower, setMaxCarPower] = useState<number | null>(null);
  const [initialTemperature, setInitialTemperature] = useState<number>(25);
  const [batteryHeatingEnabled, setBatteryHeatingEnabled] = useState<boolean>(false);
  
  // Auto-enable battery heating when temperature is low, but only once
  useEffect(() => {
    if (initialTemperature < 15 && !batteryHeatingEnabled) {
      setBatteryHeatingEnabled(true);
      
      // Apply the configuration change
      applyConfigChanges({ batteryHeatingEnabled: true });
    } else if (initialTemperature >= 15 && batteryHeatingEnabled) {
      // Auto-disable heating when temperature is not low
      setBatteryHeatingEnabled(false);
      
      // Apply the configuration change
      applyConfigChanges({ batteryHeatingEnabled: false });
    }
  }, [initialTemperature]);
  
  // Battery size options in kWh
  const batterySizeOptions = [40, 60, 80, 100, 120, 150, 200];
  
  // Apply configuration changes immediately
  const applyConfigChanges = (config: Partial<SimulationConfig>) => {
    const newConfig: SimulationConfig = {
      systemVoltage,
      chargerType,
      maxCRate,
      coolingPower,
      batterySize,
      maxCarPower,
      initialTemperature,
      batteryHeatingEnabled,
      ...config
    };
    
    onConfigChange(newConfig);
    
    // Reset simulation if not running to apply changes immediately
    if (!isRunning) {
      onReset();
    }
  };
  
  // Handle voltage change
  const handleVoltageChange = (newVoltage: number) => {
    setSystemVoltage(newVoltage);
    applyConfigChanges({ systemVoltage: newVoltage });
  };
  
  // Handle charger type change
  const handleChargerTypeChange = (newType: 'Supercharger' | 'Standard CCS') => {
    setChargerType(newType);
    applyConfigChanges({ chargerType: newType });
  };
  
  // Handle battery size change
  const handleBatterySizeChange = (newSize: number) => {
    setBatterySize(newSize);
    applyConfigChanges({ batterySize: newSize });
  };
  
  // Handle C-rate change
  const handleCRateChange = (newRate: number) => {
    setMaxCRate(newRate);
    applyConfigChanges({ maxCRate: newRate });
  };
  
  // Handle cooling power change
  const handleCoolingPowerChange = (newPower: number) => {
    setCoolingPower(newPower);
    applyConfigChanges({ coolingPower: newPower });
  };
  
  // Handle temperature change
  const handleTemperatureChange = (newTemp: number) => {
    setInitialTemperature(newTemp);
    applyConfigChanges({ initialTemperature: newTemp });
  };
  
  // Handle battery heating change
  const handleHeatingChange = (enabled: boolean) => {
    setBatteryHeatingEnabled(enabled);
    applyConfigChanges({ batteryHeatingEnabled: enabled });
  };
  
  // Handle max car power change
  const handleMaxCarPowerChange = (value: number) => {
    const newPower = value >= 350 ? null : value;
    setMaxCarPower(newPower);
    applyConfigChanges({ maxCarPower: newPower });
  };
  
  return (
    <div className="p-6 rounded-lg shadow-md">
      
      {/* Control buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={isRunning ? onStop : onStart}
          className={`px-4 py-2 text-white rounded ${
            isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isRunning ? t.controls.stop : t.controls.start}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {t.controls.reset}
        </button>
      </div>
      
      {/* Time Acceleration control */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">
          {t.controls.timeAcceleration}: {timeAcceleration}x
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
      
      <h3 className="text-lg font-medium mb-3">{t.battery.configuration}</h3>
      
      {/* System Voltage */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {t.battery.systemVoltage}
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
          {t.battery.chargerType}
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleChargerTypeChange('Supercharger')}
            className={`flex-1 px-3 py-1 rounded ${
              chargerType === 'Supercharger'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            Supercharger
          </button>
          <button
            onClick={() => handleChargerTypeChange('Standard CCS')}
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
          {t.battery.batterySize}
        </label>
        <select 
          className="w-full p-2 border border-gray-300 rounded"
          value={batterySize}
          onChange={(e) => handleBatterySizeChange(Number(e.target.value))}
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
          {t.battery.maxCRate}: {maxCRate}C
        </label>
        <input
          type="range"
          min="1"
          max="6"
          step="0.1"
          value={maxCRate}
          onChange={(e) => handleCRateChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Cooling Power */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {t.battery.coolingPower}: {coolingPower}x
        </label>
        <input
          type="range"
          min="0.1"
          max="50"
          step="0.5"
          value={coolingPower}
          onChange={(e) => handleCoolingPowerChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Initial Temperature */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {t.battery.initialTemperature}: {initialTemperature}°C
          {initialTemperature < 15 && (
            <span className="ml-2 text-amber-500 font-medium">
              ({t.battery.coldBattery})
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
              onChange={(e) => handleHeatingChange(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="batteryHeating" className="text-sm font-medium">
              {t.battery.enableHeating}
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {t.battery.heatingHelps}
          </p>
        </div>
      )}
      
      {/* Max Car Power */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          {t.battery.maxCarPower}: {maxCarPower === null ? t.battery.unlimited : maxCarPower}
        </label>
        <input
          type="range"
          min="50"
          max="350"
          step="10"
          value={maxCarPower === null ? 350 : maxCarPower}
          onChange={(e) => handleMaxCarPowerChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default SimulationControls; 