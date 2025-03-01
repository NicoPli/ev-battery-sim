'use client';

import React, { useState, useEffect, useRef } from 'react';
import SimulationControls, { SimulationConfig } from '../components/SimulationControls';
import BatteryVisualizer from '../components/BatteryVisualizer';
import ChargingChart from '../components/ChargingChart';
import SimulationStats from '../components/SimulationStats';
import { BatteryPack } from '../models/BatteryPack';
import { ChargingSimulation } from '../models/ChargingSimulation';

export default function Home() {
  const [viewMode, setViewMode] = useState<'temperature' | 'voltage'>('temperature');
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
      moduleCount: 24,
      maxCarPower: null
    };
    
    const batteryPack = new BatteryPack(
      defaultConfig.moduleCount,
      defaultConfig.systemVoltage,
      defaultConfig.maxCRate,
      defaultConfig.coolingPower,
      defaultConfig.maxCarPower
    );
    
    const sim = new ChargingSimulation(batteryPack, defaultConfig.chargerType);
    sim.setTimeAcceleration(timeAcceleration);
    
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
    const batteryPack = new BatteryPack(
      config.moduleCount,
      config.systemVoltage, 
      config.maxCRate,
      config.coolingPower,
      config.maxCarPower
    );
    
    // Create new simulation with updated battery pack
    const newSimulation = new ChargingSimulation(batteryPack, config.chargerType);
    newSimulation.setTimeAcceleration(timeAcceleration);
    
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
  
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'temperature' ? 'voltage' : 'temperature');
  };
  
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
      <h1 className="text-3xl font-bold mb-6">EV Battery Charging Simulator</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
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
        
        <div className="lg:col-span-2">
          {/* Key Stats Section */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Elapsed Time</p>
                <p className="text-2xl font-bold">
                  {formatTime(simulation.elapsedTime)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">State of Charge</p>
                <p className="text-2xl font-bold">
                  {batteryPack.averageSoc.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Current Power</p>
                <p className="text-2xl font-bold">
                  {latestDataPoint ? latestDataPoint.power.toFixed(1) : "0"} kW
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Temperature</p>
                <p className="text-2xl font-bold">
                  {batteryPack.averageTemperature.toFixed(1)}°C
                  <span className="text-sm text-gray-500 ml-1">
                    (Max: {batteryPack.maxTemperature.toFixed(1)}°C)
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Chart Section */}
          {simulation && simulation.dataPoints && simulation.dataPoints.length > 0 && (
            <ChargingChart dataPoints={simulation.dataPoints} />
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-1">
          {simulation && <SimulationStats simulation={simulation} />}
        </div>
        
        <div className="lg:col-span-2">
          <div className="flex justify-end mb-2">
            <button
              onClick={toggleViewMode}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Switch to {viewMode === 'temperature' ? 'Voltage' : 'Temperature'} View
            </button>
          </div>
          
          {simulation && simulation.batteryPack && (
            <BatteryVisualizer
              batteryPack={simulation.batteryPack}
              viewMode={viewMode}
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
