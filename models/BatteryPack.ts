import { Cell } from './Cell';

interface BatteryPackOptions {
  batteryCapacityKWh?: number;
  systemVoltage?: number;
  maxCRate?: number;
  coolingPower?: number;
  maxCarPower?: number | null;
  initialTemperature?: number;
  batteryHeatingEnabled?: boolean;
}

const DEFAULT_OPTIONS = {
  limitingFactor: null,
  initialTemperature: 25,
  batteryHeatingEnabled: false,
  balancingIntensity: 0,
  avgSoc: 0,
  cellsBalanced: 0,
}

export class BatteryPack {
  private _cells: Cell[] = [];
  private _systemVoltage: number;
  private _maxCRate: number;
  private _coolingPower: number;
  private _maxCarPower: number | null;
  private _limitingFactor: string | null = null;
  private _initialTemperature: number = DEFAULT_OPTIONS.initialTemperature;
  private _batteryHeatingEnabled: boolean = DEFAULT_OPTIONS.batteryHeatingEnabled;
  private _cellsInSeries: number;
  private _cellsInParallel: number;
  private _balancingIntensity: number = DEFAULT_OPTIONS.balancingIntensity;
  private _avgSoc: number = DEFAULT_OPTIONS.avgSoc;
  private _cellsBalanced: number = DEFAULT_OPTIONS.cellsBalanced;

  constructor({
    batteryCapacityKWh = 80,
    systemVoltage = 400,
    maxCRate = 2,
    coolingPower = 1,
    maxCarPower = null,
    initialTemperature = DEFAULT_OPTIONS.initialTemperature,
    batteryHeatingEnabled = DEFAULT_OPTIONS.batteryHeatingEnabled,
  }: BatteryPackOptions) {
    this._systemVoltage = systemVoltage;
    this._maxCRate = maxCRate;
    this._coolingPower = coolingPower;
    this._maxCarPower = maxCarPower;
    this._initialTemperature = initialTemperature;
    this._batteryHeatingEnabled = false;
    
    const cellsInSeries400 = 108;
    const cellsInSeries800 = 216; 

    // Calculate cells in series based on voltage
    this._cellsInSeries = systemVoltage === 400 ? cellsInSeries400 : cellsInSeries800;
    
    // Create a sample cell to get its properties
    const sampleCell = new Cell();
    const cellEnergy = sampleCell.energy;
    
    // Calculate total energy in Wh
    const totalWh = batteryCapacityKWh * 1000;
    
    // Calculate total cells needed
    const totalCellsNeeded = totalWh / cellEnergy;

    let cellsInParallel800 = Math.floor(totalCellsNeeded / cellsInSeries800);

    // Make sure cellsInParallel is always a multiple of 2 for easier visualization
    // and to ensure it works well with both 400V and 800V
    if (cellsInParallel800 % 2 !== 0) {
      cellsInParallel800++;
    }
    
    if (systemVoltage === 400) {
      this._cellsInParallel = cellsInParallel800*2;
    } else {
      this._cellsInParallel = cellsInParallel800;
    }
    
    // Create all cells with heating disabled initially
    const totalCells = this._cellsInSeries * this._cellsInParallel;
    for (let i = 0; i < totalCells; i++) {
      const cell = new Cell(0.0, initialTemperature);
      cell.heatingEnabled = false; // Explicitly disable heating
      this._cells.push(cell);
    }

    // Only enable heating if explicitly requested
    if (batteryHeatingEnabled) {
      this.enableHeating();
    }
  }

  get cells(): Cell[] {
    return this._cells;
  }

  get cellsInSeries(): number {
    return this._cellsInSeries;
  }

  get cellsInParallel(): number {
    return this._cellsInParallel;
  }

  get initialTemperature(): number {
    return this._initialTemperature;
  }

  get batteryHeatingEnabled(): boolean {
    return this._batteryHeatingEnabled;
  }

  enableHeating(): void {
    this._batteryHeatingEnabled = true;
    this._cells.forEach(cell => {
      cell.heatingEnabled = true;
    });
  }

  disableHeating(): void {
    this._batteryHeatingEnabled = false;
    this._cells.forEach(cell => {
      cell.heatingEnabled = false;
    });
  }

  get totalVoltage(): number {
    // Calculate average voltage for each series group
    let totalVoltage = 0;
    
    for (let s = 0; s < this._cellsInSeries; s++) {
      let parallelGroupVoltage = 0;
      
      for (let p = 0; p < this._cellsInParallel; p++) {
        const cellIndex = s + (p * this._cellsInSeries);
        if (cellIndex < this._cells.length) {
          parallelGroupVoltage += this._cells[cellIndex].voltage;
        }
      }
      
      // Average voltage of parallel cells
      totalVoltage += parallelGroupVoltage / this._cellsInParallel;
    }
    
    return totalVoltage;
  }

  get totalCapacity(): number {
    // Capacity is determined by cells
    return this._cells[0].capacity * this._cells.length;
  }

  get totalEnergy(): number {
    // Energy = Voltage * Capacity
    return (this._cells[0].energy * this._cells.length);
  }

  get averageTemperature(): number {
    return this._cells.reduce((sum, cell) => sum + cell.temperature, 0) / this._cells.length;
  }

  get maxTemperature(): number {
    return Math.max(...this._cells.map(cell => cell.temperature));
  }

  get averageSoc(): number {
    return this._avgSoc;
  }

  get cellsBalanced(): number {
    return this._cellsBalanced;
  }

  calculateAvgValues(): void {
    this.calculateAvgSoc();
    this.countCellsBalanced();
  }

  calculateAvgSoc(): number {
    // Calculate the true average SoC based on the total energy content
    let totalEnergy = 0;
    let totalCapacity = 0;
    
    for (let i = 0; i < this._cells.length; i++) {
      const cell = this._cells[i];
      totalEnergy += cell.stateOfCharge * cell.capacity * cell.voltage;
      totalCapacity += cell.capacity * cell.voltage;
    }
    
    const avgSoc = totalEnergy / totalCapacity;
    this._avgSoc = avgSoc * 100;
    return this._avgSoc;
  }

  countCellsBalanced(): number {
    const cellsBalanced = this._cells.filter(cell => cell.wasBalanced).length;
    this._cellsBalanced = cellsBalanced;
    return this._cellsBalanced;
  }

  calculateChargingCurrent(maxChargerCurrent: number): number {
    // Calculate all the limits
    
    // C-rate limit - 1C means the battery will be fully charged in 1 hour
    // For example, if battery capacity is 100 kWh and C-rate is 1, max power is 100 kW
    const cRateLimit = (this._maxCRate * this.energyCapacityKWh * 1000) / this.totalVoltage;
    
    // Calculate maximum current based on power limit (if any)
    let powerLimit = Number.MAX_VALUE;
    if (this._maxCarPower) {
      powerLimit = (this._maxCarPower * 1000) / this.totalVoltage;
    }
    
    // Calculate temperature limit - make it more gradual with earlier onset
    let temperatureLimit = Number.MAX_VALUE;
    
    // Add cold temperature limit
    let coldTemperatureLimit = Number.MAX_VALUE;
    if (this.averageTemperature < 20) {
      // Make the cold temperature limit more severe
      const tempFactor = Math.max(0.02, Math.pow((Math.max(0,this.averageTemperature) + 5) / 20, 2));

      // Apply a more dramatic curve to make the effect more noticeable
      //const adjustedFactor = Math.pow(tempFactor, 1.5);
      //coldTemperatureLimit = maxChargerCurrent * adjustedFactor;
      coldTemperatureLimit = maxChargerCurrent * tempFactor;
    } else {
      if(this._batteryHeatingEnabled) {
        this.disableHeating();
      }
    }
    
    // Hot temperature limit
    if (this.maxTemperature > 40) {
      // Create a more gradual reduction curve
      const adjustedThreshold = 40
      
      if (this.maxTemperature > adjustedThreshold) {
        const reductionFactor = Math.max(0, 1 - (this.maxTemperature - adjustedThreshold) / 25);
        temperatureLimit = maxChargerCurrent * reductionFactor;
      }
    }

    // Todo: Realistically SoC-Limit and Balancing are the same

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
    
    // Calculate balancing limit - make it more significant
    let balancingLimit = Number.MAX_VALUE;
    if (this._balancingIntensity > 0) {
      // Make balancing limit more restrictive at higher SoC
      balancingLimit = maxChargerCurrent * (1-this._balancingIntensity * 50);
    }
    
    // Return minimum of all limits
    const limitedCurrent = Math.min(
      maxChargerCurrent,
      cRateLimit,
      powerLimit,
      temperatureLimit,
      coldTemperatureLimit,
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
      coldTemperatureLimit,
      balancingLimit,
      socLimit
    );
    
    return limitedCurrent;
  }

  private determineLimitingFactor(
    limitedCurrent: number,
    chargerMax: number,
    cRateLimit: number,
    powerLimit: number,
    tempLimit: number,
    coldTempLimit: number,
    balancingLimit: number,
    socLimit: number
  ): string {
    const epsilon = 0.1; // Small tolerance for floating point comparison
    
    if (Math.abs(limitedCurrent - chargerMax) < epsilon) return "Charger";
    if (Math.abs(limitedCurrent - cRateLimit) < epsilon) return "C-rate";
    if (Math.abs(limitedCurrent - powerLimit) < epsilon) return "Car";
    if (Math.abs(limitedCurrent - tempLimit) < epsilon) return "Temperature (hot)";
    if (Math.abs(limitedCurrent - coldTempLimit) < epsilon) return "Temperature (cold)";
    if (Math.abs(limitedCurrent - balancingLimit) < epsilon) return "Cell balancing";
    if (Math.abs(limitedCurrent - socLimit) < epsilon) return "SoC";
    
    return "Unknown limit";
  }

  get limitingFactor(): string {
    return this._limitingFactor || "Not charging";
  }

  updateCharge(current: number, deltaTimeHours: number): void {
    // Distribute current among parallel cells
    const currentPerParallelGroup = (current) / this._cellsInParallel;
    
    // Update each cell
    for (let p = 0; p < this._cellsInParallel; p++) {
      for (let s = 0; s < this._cellsInSeries; s++) {
        const cellIndex = s + (p * this._cellsInSeries);
        if (cellIndex < this._cells.length) {
          this._cells[cellIndex].updateCharge(currentPerParallelGroup, deltaTimeHours);
        }
      }
    }
    
    this.updateTemperature(current, deltaTimeHours);
    // Perform cell balancing
    this.balanceCells();
  }

  updateTemperature(current: number, deltaTimeHours: number): void {
    // Distribute current among parallel cells
    const currentPerParallelGroup = (current) / this._cellsInParallel;

    // Update each cell's temperature
    for (let p = 0; p < this._cellsInParallel; p++) {
      for (let s = 0; s < this._cellsInSeries; s++) {
        const cellIndex = s + (p * this._cellsInSeries);
        if (cellIndex < this._cells.length) {
          this._cells[cellIndex].updateTemperature(currentPerParallelGroup, deltaTimeHours, this._coolingPower);
        }
      }
    }
  }

  private balanceCells(): void {
    // Find min and max SoC to determine if balancing is needed
    const minSoc = Math.min(...this._cells.map(cell => cell.stateOfCharge));
    const maxSoc = Math.max(...this._cells.map(cell => cell.stateOfCharge));

    const limit = 0.1 - this.averageSoc / 1000;

    // Only balance if the difference is significant
    if (maxSoc - minSoc > limit) {
      // Balance more aggressively at higher SoC
      this._balancingIntensity = 0.002 * this._avgSoc * (maxSoc - minSoc);

      // Balance cells by adjusting SoC towards average
      this._cells.forEach(cell => {
        if (cell.stateOfCharge * 100 > this._avgSoc + limit) {
          // Reduce SoC of cells that are too high
          cell.stateOfCharge = cell.stateOfCharge - this._balancingIntensity;
          cell.wasBalanced = true;
        } else {
          cell.wasBalanced = false;
        }
      });

    } else {
      this._balancingIntensity = 0;
    }
  }

  reset(): void {
    // Reset all cells to initial state
    this._cells.forEach(cell => {
      cell.reset(this._initialTemperature);
    });
    
    this._limitingFactor = DEFAULT_OPTIONS.limitingFactor;
    this._balancingIntensity = DEFAULT_OPTIONS.balancingIntensity;
    this._avgSoc = DEFAULT_OPTIONS.avgSoc;
    this._cellsBalanced = DEFAULT_OPTIONS.cellsBalanced;
    
    // Apply heating setting after reset
    if (this._batteryHeatingEnabled) {
      this.enableHeating();
    } else {
      this.disableHeating();
    }
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

  get systemVoltage(): number {
    return this._systemVoltage;
  }

  get energyCapacityKWh(): number {
    // Calculate total energy capacity in kWh
    const cellEnergy = this._cells[0]?.energy || 0; // Energy per cell in Wh
    const totalCells = this._cells.length;
    const totalEnergyWh = cellEnergy * totalCells;
    
    return totalEnergyWh / 1000; // Convert Wh to kWh
  }
} 