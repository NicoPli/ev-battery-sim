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
  private _limitingFactor: string | null = null;

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
    // Calculate the true average SoC based on the charge state of each cell
    const totalCharge = this._cells.reduce((sum, cell) => sum + cell.stateOfCharge * cell.capacity, 0);
    const totalCapacity = this._cells.reduce((sum, cell) => sum + cell.capacity, 0);
    
    // Return as percentage
    return (totalCharge / totalCapacity) * 100;
  }

  get needsBalancing(): boolean {
    return this._modules.some(module => module.needsBalancing);
  }

  calculateChargingCurrent(maxChargerCurrent: number): number {
    // Calculate all the limits
    
    // C-rate limit - increase the multiplier to allow higher charging rates
    const cRateLimit = this._maxCRate * this.totalCapacity * 2; // Multiply by 2 for more realistic power levels
    
    // Calculate maximum current based on power limit (if any)
    let powerLimit = Number.MAX_VALUE;
    if (this._maxCarPower) {
      powerLimit = (this._maxCarPower * 1000) / this.totalVoltage;
    }
    
    // Calculate SoC-based limit (charging curve tapers at high SoC)
    // This creates the characteristic charging curve where power drops at high SoC
    let socLimit = Number.MAX_VALUE;
    const avgSoc = this.averageSoc / 100; // Convert to 0-1 scale
    if (avgSoc > 0.7) {
      // Apply exponential taper starting at 70% SoC
      // At 80% -> ~70% of max current
      // At 90% -> ~40% of max current
      // At 95% -> ~20% of max current
      const socFactor = Math.exp(-8 * (avgSoc - 0.7));
      socLimit = maxChargerCurrent * Math.min(1, socFactor);
    }
    
    // Calculate temperature limit - make it more gradual with earlier onset
    let temperatureLimit = Number.MAX_VALUE;
    if (this.maxTemperature > 40) {
      // Create a more gradual reduction curve
      // Make the temperature threshold higher when cooling power is higher
      const coolingAdjustment = (this._coolingPower - 5) * 0.5;
      const adjustedThreshold = 40 + coolingAdjustment;
      
      if (this.maxTemperature > adjustedThreshold) {
        const reductionFactor = Math.max(0, 1 - (this.maxTemperature - adjustedThreshold) / 25);
        temperatureLimit = maxChargerCurrent * reductionFactor;
      }
    }
    
    // Calculate balancing limit - make it more significant
    let balancingLimit = Number.MAX_VALUE;
    if (this.needsBalancing) {
      // Make balancing limit more restrictive at higher SoC
      const balancingFactor = this.averageSoc > 80 ? 0.5 : 0.8;
      balancingLimit = maxChargerCurrent * balancingFactor;
    }
    
    // Return minimum of all limits
    const limitedCurrent = Math.min(
      maxChargerCurrent,
      cRateLimit,
      powerLimit,
      temperatureLimit,
      balancingLimit,
      socLimit
    );
    
    // Store the limiting factor for display
    this._limitingFactor = this.determineLimitingFactor(
      limitedCurrent, 
      maxChargerCurrent, 
      cRateLimit, 
      powerLimit, 
      temperatureLimit, 
      balancingLimit,
      socLimit
    );
    
    return limitedCurrent;
  }

  // Add a new method to determine the limiting factor
  private determineLimitingFactor(
    limitedCurrent: number,
    chargerMax: number,
    cRateLimit: number,
    powerLimit: number,
    tempLimit: number,
    balancingLimit: number,
    socLimit: number
  ): string {
    const epsilon = 0.1; // Small tolerance for floating point comparison
    
    if (Math.abs(limitedCurrent - chargerMax) < epsilon) return "Charger maximum";
    if (Math.abs(limitedCurrent - cRateLimit) < epsilon) return "C-rate limit";
    if (Math.abs(limitedCurrent - powerLimit) < epsilon) return "Car power limit";
    if (Math.abs(limitedCurrent - tempLimit) < epsilon) return "Temperature limit";
    if (Math.abs(limitedCurrent - balancingLimit) < epsilon) return "Cell balancing";
    if (Math.abs(limitedCurrent - socLimit) < epsilon) return "SoC limit";
    
    return "Unknown limit";
  }

  // Add a getter for the limiting factor
  get limitingFactor(): string {
    return this._limitingFactor || "Not charging";
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

  get minCellVoltage(): number {
    return Math.min(...this._cells.map(cell => cell.voltage));
  }

  get maxCellVoltage(): number {
    return Math.max(...this._cells.map(cell => cell.voltage));
  }

  get voltageDifference(): number {
    return this.maxCellVoltage - this.minCellVoltage;
  }

  // Add a public getter for systemVoltage
  get systemVoltage(): number {
    return this._systemVoltage;
  }
} 