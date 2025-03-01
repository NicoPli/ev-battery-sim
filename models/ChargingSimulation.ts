import { BatteryPack } from './BatteryPack';

export type ChargerType = 'Supercharger' | 'Standard CCS';
export type SimulationDataPoint = {
  time: number;
  soc: number;
  power: number;
  current: number;
  voltage: number;
  temperature: number;
};

export class ChargingSimulation {
  private _batteryPack: BatteryPack;
  private _dataPoints: SimulationDataPoint[] = [];
  private _isRunning: boolean = false;
  private _elapsedTime: number = 0;
  private _timeStep: number = 1; // 1 second per step
  private _timeAcceleration: number = 1;
  private _chargerType: ChargerType;
  private _chargerMaxCurrent: number;
  private _lastUpdateTime: number = 0;

  constructor(batteryPack: BatteryPack, chargerType: ChargerType = 'Supercharger') {
    this._batteryPack = batteryPack;
    this._chargerType = chargerType;
    this._chargerMaxCurrent = chargerType === 'Supercharger' ? 625 : 500;
    
    // Add initial data point
    this.addDataPoint(0);
  }

  get batteryPack(): BatteryPack {
    return this._batteryPack;
  }

  get chargerType(): ChargerType {
    return this._chargerType;
  }

  get chargerMaxCurrent(): number {
    return this._chargerMaxCurrent;
  }

  get elapsedTime(): number {
    return this._elapsedTime;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get timeAcceleration(): number {
    return this._timeAcceleration;
  }

  get dataPoints(): SimulationDataPoint[] {
    return this._dataPoints;
  }

  setTimeAcceleration(acceleration: number): void {
    this._timeAcceleration = acceleration;
    
    // If simulation is running, restart it with new acceleration
    if (this._isRunning) {
      this.stop();
      this.start();
    }
  }

  start(): void {
    if (this._isRunning) return;
    
    this._isRunning = true;
    this._lastUpdateTime = Date.now();
    
    // Start simulation loop
    this.simulationLoop();
  }

  stop(): void {
    if (!this._isRunning) return;
    
    this._isRunning = false;
  }

  reset(): void {
    this.stop();
    this._elapsedTime = 0;
    this._dataPoints = [];
    this._batteryPack.reset();
  }

  private simulationLoop(): void {
    if (!this._isRunning) return;
    
    // Calculate time since last update
    const now = Date.now();
    const deltaTime = (now - this._lastUpdateTime) / 1000; // Convert to seconds
    this._lastUpdateTime = now;
    
    // Apply time acceleration
    const acceleratedDeltaTime = deltaTime * this._timeAcceleration;
    
    // Run multiple steps if needed
    const stepsToRun = Math.max(1, Math.floor(acceleratedDeltaTime / this._timeStep));
    for (let i = 0; i < stepsToRun; i++) {
      this.step();
      
      // Stop if battery is fully charged
      if (this._batteryPack.averageSoc >= 99.9) {
        this._isRunning = false;
        break;
      }
    }
    
    // Schedule next update if still running
    if (this._isRunning) {
      requestAnimationFrame(() => this.simulationLoop());
    }
  }

  private step(): void {
    // Calculate time step in hours
    const deltaTimeHours = this._timeStep / 3600;
    
    // Calculate current based on all constraints
    const current = this._batteryPack.calculateChargingCurrent(this._chargerMaxCurrent);
    
    // Update battery state
    this._batteryPack.updateCharge(current, deltaTimeHours);
    this._batteryPack.updateTemperature(current, deltaTimeHours);
    
    // Calculate power in kW
    const voltage = this._batteryPack.totalVoltage;
    const power = (voltage * current) / 1000;
    
    // Record data point
    this._dataPoints.push({
      time: this._elapsedTime,
      soc: this._batteryPack.averageSoc,
      power,
      current,
      voltage,
      temperature: this._batteryPack.averageTemperature
    });
    
    // Update elapsed time
    this._elapsedTime += this._timeStep;
    
    // Ensure we don't accumulate too many data points
    if (this._dataPoints.length > 1000) {
      this._dataPoints = this._dataPoints.filter((_, i) => i % 2 === 0);
    }
  }

  private addDataPoint(current: number): void {
    // Calculate power
    const voltage = this._batteryPack.totalVoltage;
    const power = (voltage * current) / 1000; // Convert to kW
    
    // Add data point
    this._dataPoints.push({
      time: this._elapsedTime,
      soc: this._batteryPack.averageSoc,
      power,
      current,
      voltage,
      temperature: this._batteryPack.averageTemperature
    });
    
    // Limit the number of data points to prevent memory issues
    if (this._dataPoints.length > 1000) {
      // Keep only every other point when we get too many
      this._dataPoints = this._dataPoints.filter((_, index) => index % 2 === 0);
    }
  }
} 