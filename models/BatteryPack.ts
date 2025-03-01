import { BatteryModule } from './BatteryModule';

export class BatteryPack {
  private _modules: BatteryModule[] = [];
  private _systemVoltage: number;
  private _maxCRate: number;
  private _coolingPower: number;
  private _maxCarPower: number | null;
  private _cells: any[] = [];
  private _seriesModules: number = 1;
  private _parallelStrings: number = 1;

  constructor(
    moduleCount: number = 4,
    systemVoltage: number = 400,
    maxCRate: number = 2,
    coolingPower: number = 1,
    maxCarPower: number | null = null
  ) {
    this._systemVoltage = systemVoltage;
    this._maxCRate = maxCRate;
    this._coolingPower = coolingPower;
    this._maxCarPower = maxCarPower;
    
    // For a 400V system with cells at ~3.7V nominal:
    // 400V ÷ 3.7V ≈ 108 cells in series
    // For an 800V system:
    // 800V ÷ 3.7V ≈ 216 cells in series
    
    // Configure modules based on system voltage
    const cellsPerModule = 12; // Each module has 12 cells in series
    const cellsInSeries = systemVoltage === 400 ? 108 : 216;
    const modulesInSeries = Math.ceil(cellsInSeries / cellsPerModule);
    
    // Calculate how many parallel strings we can have
    const parallelStrings = Math.max(1, Math.floor(moduleCount / modulesInSeries));
    
    // For 800V, we need to double the cells in parallel to maintain the same energy capacity
    const cellsInParallel = systemVoltage === 400 ? 8 : 8; // Same for both voltages
    
    // Create the modules in the correct configuration
    for (let p = 0; p < parallelStrings; p++) {
      for (let s = 0; s < modulesInSeries; s++) {
        if (this._modules.length < moduleCount) {
          this._modules.push(new BatteryModule(cellsPerModule, cellsInParallel));
        }
      }
    }
    
    // Add any remaining modules to maintain the requested module count
    while (this._modules.length < moduleCount) {
      this._modules.push(new BatteryModule(cellsPerModule, cellsInParallel));
    }
    
    // Store the configuration for voltage calculation
    this._seriesModules = modulesInSeries;
    this._parallelStrings = parallelStrings;
    
    // Flatten cells for easier access
    this._cells = this._modules.flatMap(module => module.cells);
  }

  get modules(): BatteryModule[] {
    return this._modules;
  }

  get cells(): any[] {
    return this._cells;
  }

  get totalVoltage(): number {
    // For simplicity, let's calculate the voltage directly based on the system voltage
    // and the current state of charge
    
    // Get the average cell voltage across all cells
    const avgCellVoltage = this._cells.reduce((sum, cell) => sum + cell.voltage, 0) / this._cells.length;
    
    // Calculate how many cells we need in series to achieve the system voltage
    const cellsInSeries = this._systemVoltage === 400 ? 108 : 216;
    
    // Return the voltage based on cells in series
    return avgCellVoltage * cellsInSeries;
  }

  get totalCapacity(): number {
    // Get the capacity of a single module
    const moduleCapacity = this._modules[0].capacity;
    
    // Calculate effective parallel strings
    const effectiveParallelStrings = this._modules.length / this._seriesModules;
    
    // Return the total capacity
    return moduleCapacity * effectiveParallelStrings;
  }

  get averageTemperature(): number {
    return this._cells.reduce((sum, cell) => sum + cell.temperature, 0) / this._cells.length;
  }

  get maxTemperature(): number {
    return Math.max(...this._cells.map(cell => cell.temperature));
  }

  get averageSoc(): number {
    return this._cells.reduce((sum, cell) => sum + cell.stateOfCharge, 0) / this._cells.length * 100;
  }

  get needsBalancing(): boolean {
    return this._modules.some(module => module.needsBalancing);
  }

  calculateChargingCurrent(chargerMaxCurrent: number): number {
    // Calculate maximum current based on C-rate
    const cRateLimit = this._maxCRate * this.totalCapacity;
    
    // Calculate maximum current based on power limit (if any)
    let powerLimit = Number.MAX_VALUE;
    if (this._maxCarPower) {
      powerLimit = (this._maxCarPower * 1000) / this.totalVoltage;
    }
    
    // Calculate temperature limit
    let temperatureLimit = Number.MAX_VALUE;
    if (this.maxTemperature > 45) {
      // Start reducing current at 45°C
      const reductionFactor = Math.max(0, 1 - (this.maxTemperature - 45) / 10);
      temperatureLimit = chargerMaxCurrent * reductionFactor;
    }
    
    // Calculate balancing limit
    let balancingLimit = Number.MAX_VALUE;
    if (this.needsBalancing) {
      balancingLimit = chargerMaxCurrent * 0.8; // Reduce to 80% if balancing needed
    }
    
    // Return minimum of all limits
    return Math.min(
      chargerMaxCurrent,
      cRateLimit,
      powerLimit,
      temperatureLimit,
      balancingLimit
    );
  }

  updateCharge(current: number, deltaTimeHours: number): void {
    this._modules.forEach(module => {
      module.updateCharge(current, deltaTimeHours);
    });
  }

  updateTemperature(current: number, deltaTimeHours: number): void {
    this._modules.forEach(module => {
      module.updateTemperature(current, deltaTimeHours, this._coolingPower);
    });
  }

  reset(): void {
    this._modules.forEach(module => module.reset());
  }
} 