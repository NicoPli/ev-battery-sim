'use client';

import React, { useState, useEffect, useRef } from 'react';
import SimulationControls, { SimulationConfig } from '../components/SimulationControls';
import BatteryVisualizer from '../components/BatteryVisualizer';
import ChargingChart from '../components/ChargingChart';
import { BatteryPack } from '../models/BatteryPack';
import { ChargingSimulation } from '../models/ChargingSimulation';
import LanguageSelector from '../components/LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';
import Link from 'next/link';

export default function Home() {
  const [simulation, setSimulation] = useState<ChargingSimulation | null>(null);
  const [timeAcceleration, setTimeAcceleration] = useState(10);
  
  // Use a ref to store the actual simulation instance
  const simulationRef = useRef<ChargingSimulation | null>(null);
  
  // Initialize simulation with default values
  useEffect(() => {
    const defaultConfig: SimulationConfig = {
      systemVoltage: 400,
      chargerType: 'Supercharger',
      maxCRate: 2,
      coolingPower: 1,
      batterySize: 80,
      maxCarPower: null,
      initialTemperature: 25,
      batteryHeatingEnabled: true,
      endPercentage: 100
    };
    
    const batteryPack = new BatteryPack({
      batteryCapacityKWh: defaultConfig.batterySize,
      systemVoltage: defaultConfig.systemVoltage,
      maxCRate: defaultConfig.maxCRate,
      coolingPower: defaultConfig.coolingPower,
      maxCarPower: defaultConfig.maxCarPower,
      initialTemperature:defaultConfig.initialTemperature,
      batteryHeatingEnabled: defaultConfig.batteryHeatingEnabled
    });
    
    const sim = new ChargingSimulation(batteryPack, defaultConfig.chargerType);
    sim.setTimeAcceleration(timeAcceleration);
    sim.setEndPercentage(defaultConfig.endPercentage);
    
    simulationRef.current = sim;
    setSimulation(sim);
  }, []);
  
  // Force re-render every second to update UI
  useEffect(() => {
    const interval = setInterval(() => {
      // If we have a simulation and it's running, force update the chart data
      if (simulationRef.current) {
        // Create a shallow copy of the simulation to force a re-render
        const updatedSimulation = Object.assign(
          Object.create(Object.getPrototypeOf(simulationRef.current)),
          simulationRef.current
        );
        setSimulation(updatedSimulation);
      }
    }, 100); // Update more frequently (every 100ms)
    
    return () => clearInterval(interval);
  }, []);
  
  const handleConfigChange = (config: SimulationConfig) => {
    if (!simulationRef.current) return;
    
    // Stop simulation if running
    if (simulationRef.current.isRunning) {
      simulationRef.current.stop();
    }
    
    // Create new battery pack with updated config
    const batteryPack = new BatteryPack({
      batteryCapacityKWh: config.batterySize,
      systemVoltage: config.systemVoltage,
      maxCRate: config.maxCRate,
      coolingPower: config.coolingPower,
      maxCarPower: config.maxCarPower,
      initialTemperature: config.initialTemperature,
      batteryHeatingEnabled: config.batteryHeatingEnabled,
    });
    
    // Create new simulation with updated battery pack
    const newSimulation = new ChargingSimulation(batteryPack, config.chargerType);
    newSimulation.setTimeAcceleration(timeAcceleration);
    newSimulation.setEndPercentage(config.endPercentage);
    
    // Update both the ref and the state
    simulationRef.current = newSimulation;
    setSimulation(newSimulation);
  };
  
  const handleTimeAccelerationChange = (acceleration: number) => {
    if (!simulationRef.current) return;
    
    setTimeAcceleration(acceleration);
    simulationRef.current.setTimeAcceleration(acceleration);
  };
  
  const handleStart = () => {
    if (!simulationRef.current) return;
    simulationRef.current.start();
  };
  
  const handleStop = () => {
    if (!simulationRef.current) return;
    simulationRef.current.stop();
  };
  
  const handleReset = () => {
    if (!simulationRef.current) return;
    simulationRef.current.reset();
  };

  // Determine the current limiting factor
  const getLimitingFactor = () => {
    if (!simulationRef.current) return;
    if (!simulationRef.current.isRunning) return "Not charging";
    return simulationRef.current.batteryPack.limitingFactor || "Unknown";
  };

  const formatVoltage = (voltage: number | undefined): string => {
    return voltage !== undefined ? voltage.toFixed(2) : "N/A";
  };
  
  const { t } = useLanguage();
  
  if (!simulation) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Extract key stats for the top section
  const batteryPack = simulation.batteryPack;
  const latestDataPoint = simulation.dataPoints && simulation.dataPoints.length > 0 
    ? simulation.dataPoints[simulation.dataPoints.length - 1] 
    : null;
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <LanguageSelector />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="mb-6">
          <SimulationControls
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
            onConfigChange={handleConfigChange}
            isRunning={simulation?.isRunning || false}
            timeAcceleration={timeAcceleration}
            onTimeAccelerationChange={handleTimeAccelerationChange}
          />
          </div>
          <div className="mt-4 bg-gray-100 py-2 px-4 rounded-md">
            {t.footer.aiServices}: <Link href="https://www.inspyra.ai" target="_blank" className="text-blue-500 hover:text-blue-700">inspyra.ai</Link>
          </div>
          <div className="text-sm mt-4">
          <span className="float-right">Made by <Link href="https://www.youtube.com/@NicoPliquettDE" target="_blank" className="text-blue-500 hover:text-blue-700">Nico Pliquett</Link> and AI: <Link href="https://github.com/NicoPli/ev-battery-sim" target="_blank" className="text-blue-500 hover:text-blue-700">GitHub</Link></span>
            <Link href="https://www.inspyra.ai/impressum" target="_blank" className="text-blue-500 hover:text-blue-700">Impressum</Link>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="mb-6">
          {/* Key Stats Section */}
          <div className="p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm">{t.stats.elapsedTime}</p>
                <p className="text-2xl font-bold">
                  {formatTime(simulation.elapsedTime)}
                </p>
              </div>
              
              <div>
                <p className="text-sm">{t.stats.stateOfCharge}</p>
                <p className="text-2xl font-bold">
                  {batteryPack.averageSoc.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm">{t.stats.currentPower}</p>
                <p className="text-2xl font-bold">
                  {latestDataPoint ? latestDataPoint.power.toFixed(1) : "0"} kW
                </p>
              </div>
              
              <div>
                <p className="text-sm">{t.stats.temperature}</p>
                <p className="text-2xl font-bold">
                  {batteryPack.averageTemperature.toFixed(1)}°C
                  <span className="text-sm ml-1">
                    ({t.stats.max}: {batteryPack.maxTemperature.toFixed(1)}°C)
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm">{t.stats.chargingLimitedBy}</p>
                <p className="text-2xl font-bold">
                  {getLimitingFactor()}
                </p>
              </div>

              <div>
                <p className="text-sm">{t.stats.batteryVoltage}</p>
                <p className="text-2xl font-bold">
                  {batteryPack.totalVoltage.toFixed(1)} V
                </p>
              </div>

              <div>
                <p className="text-sm">{t.stats.current}</p>
                <p className="text-2xl font-bold">
                  {latestDataPoint ? latestDataPoint.current.toFixed(1) : "0"} A
                </p>
              </div>

              <div>
                <p className="text-sm">{t.stats.cellVoltageRange}</p>
                <p className="text-2xl font-bold">
                {batteryPack && batteryPack.minCellVoltage !== undefined 
              ? formatVoltage(batteryPack.minCellVoltage) 
              : "N/A"} - 
            {batteryPack && batteryPack.maxCellVoltage !== undefined 
              ? formatVoltage(batteryPack.maxCellVoltage) 
              : "N/A"} V
            {batteryPack && batteryPack.voltageDifference !== undefined && (
              <span className="text-sm ml-1">
                (Δ{formatVoltage(batteryPack.voltageDifference)} V)
              </span>
            )}
                </p>
              </div>
            </div>
          </div>
          
          {/* Chart Section */}
          {simulation && simulation.dataPoints && simulation.dataPoints.length > 0 && (
            <ChargingChart dataPoints={simulation.dataPoints} />
          )}
          </div>
          
          {simulation && simulation.batteryPack && (
            <BatteryVisualizer
              batteryPack={simulation.batteryPack}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
