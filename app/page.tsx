'use client';

import React, { useState, useEffect, useRef } from 'react';
import SimulationControls, { SimulationConfig } from '../components/SimulationControls';
import BatteryVisualizer from '../components/BatteryVisualizer';
import ChargingChart from '../components/ChargingChart';
import SimulationStats from '../components/SimulationStats';
import { BatteryPack } from '../models/BatteryPack';
import { ChargingSimulation } from '../models/ChargingSimulation';

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
      moduleCount: 24,
      maxCarPower: null,
      initialTemperature: 25,
      batteryHeatingEnabled: true
    };
    
    const batteryPack = new BatteryPack(
      defaultConfig.moduleCount,
      defaultConfig.systemVoltage,
      defaultConfig.maxCRate,
      defaultConfig.coolingPower,
      defaultConfig.maxCarPower,
      defaultConfig.initialTemperature,
      defaultConfig.batteryHeatingEnabled
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
      config.maxCarPower,
      config.initialTemperature,
      config.batteryHeatingEnabled
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

          <div className="">
          {simulation && <SimulationStats simulation={simulation} />}
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="mb-6">
          {/* Key Stats Section */}
          <div className="p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm">Elapsed Time</p>
                <p className="text-2xl font-bold">
                  {formatTime(simulation.elapsedTime)}
                </p>
              </div>
              
              <div>
                <p className="text-sm">State of Charge</p>
                <p className="text-2xl font-bold">
                  {batteryPack.averageSoc.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm">Current Power</p>
                <p className="text-2xl font-bold">
                  {latestDataPoint ? latestDataPoint.power.toFixed(1) : "0"} kW
                </p>
              </div>
              
              <div>
                <p className="text-sm">Temperature</p>
                <p className="text-2xl font-bold">
                  {batteryPack.averageTemperature.toFixed(1)}°C
                  <span className="text-sm ml-1">
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
