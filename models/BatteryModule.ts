import { Cell } from './Cell';

export class BatteryModule {
  private _cells: Cell[] = [];
  private _cellsInSeries: number;
  private _cellsInParallel: number;
  private _heatingEnabled: boolean = false;

  constructor(cellsInSeries: number = 12, cellsInParallel: number = 8, initialTemperature: number = 25) {
    this._cellsInSeries = cellsInSeries;
    this._cellsInParallel = cellsInParallel;
    
    // Create cells
    for (let i = 0; i < cellsInSeries * cellsInParallel; i++) {
      this._cells.push(new Cell(0.0, 10, initialTemperature));
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

  get totalCells(): number {
    return this._cells.length;
  }

  set heatingEnabled(value: boolean) {
    this._heatingEnabled = value;
    // Apply to all cells
    this._cells.forEach(cell => {
      cell.heatingEnabled = value;
    });
  }

  get heatingEnabled(): boolean {
    return this._heatingEnabled;
  }

  get voltage(): number {
    // Module voltage is the sum of series cells
    let totalVoltage = 0;
    
    // Calculate average voltage for each parallel group
    for (let i = 0; i < this._cellsInSeries; i++) {
      let parallelGroupVoltage = 0;
      for (let j = 0; j < this._cellsInParallel; j++) {
        const cellIndex = i * this._cellsInParallel + j;
        if (cellIndex < this._cells.length) {
          parallelGroupVoltage += this._cells[cellIndex].voltage;
        }
      }
      // Average voltage of parallel cells
      totalVoltage += parallelGroupVoltage / this._cellsInParallel;
    }
    
    return totalVoltage;
  }

  get capacity(): number {
    // Module capacity is the sum of parallel cells
    return this._cells[0].capacity * this._cellsInParallel;
  }

  get averageTemperature(): number {
    return this._cells.reduce((sum, cell) => sum + cell.temperature, 0) / this._cells.length;
  }

  get averageSoc(): number {
    return this._cells.reduce((sum, cell) => sum + cell.stateOfCharge, 0) / this._cells.length;
  }

  get maxTemperature(): number {
    return Math.max(...this._cells.map(cell => cell.temperature));
  }

  get needsBalancing(): boolean {
    // Check if any cell's voltage deviates too much from average
    const avgVoltage = this._cells.reduce((sum, cell) => sum + cell.voltage, 0) / this._cells.length;
    const avgSoc = this.averageSoc;
    
    // Voltage tolerance gets much tighter as SoC increases
    let voltageTolerance;
    if (avgSoc > 0.9) {
      // Very tight tolerance near full charge
      voltageTolerance = 0.02;
    } else if (avgSoc > 0.8) {
      // Tight tolerance at high SoC
      voltageTolerance = 0.05;
    } else if (avgSoc > 0.7) {
      // Moderate tolerance at mid-high SoC
      voltageTolerance = 0.1;
    } else {
      // Relaxed tolerance at lower SoC
      voltageTolerance = 0.15;
    }
    
    return this._cells.some(cell => Math.abs(cell.voltage - avgVoltage) > voltageTolerance);
  }

  updateCharge(current: number, deltaTimeHours: number): void {
    // Current per parallel group
    const currentPerParallel = current / this._cellsInParallel;
    
    // Find the highest and lowest SoC cells
    const maxSoc = Math.max(...this._cells.map(cell => cell.stateOfCharge));
    const minSoc = Math.min(...this._cells.map(cell => cell.stateOfCharge));
    const socRange = maxSoc - minSoc;
    
    // Determine if active balancing is needed
    const needsActiveBalancing = socRange > 0.01; // Lower threshold to 1%
    
    // Get average SoC
    const avgSoc = this.averageSoc;
    
    // Update each cell with potentially different currents
    this._cells.forEach(cell => {
      let cellCurrent = currentPerParallel;
      
      // Apply active balancing by reducing current to cells with higher SoC
      if (needsActiveBalancing) {
        // Calculate relative position compared to min SoC
        const relativePosition = (cell.stateOfCharge - minSoc) / socRange;
        
        // Apply more aggressive balancing at higher SoC
        if (avgSoc > 0.8) {
          // Very aggressive balancing near full charge
          // Cells at highest SoC might get only 1% of current
          if (cell.stateOfCharge > avgSoc) {
            const currentReductionFactor = Math.max(0.01, 1 - (relativePosition * 0.99));
            cellCurrent *= currentReductionFactor;
          }
        } else if (avgSoc > 0.6) {
          // Moderate balancing in mid-high range
          if (cell.stateOfCharge > avgSoc) {
            const currentReductionFactor = Math.max(0.1, 1 - (relativePosition * 0.9));
            cellCurrent *= currentReductionFactor;
          }
        }
      }
      
      // Update the cell with the potentially reduced current
      cell.updateCharge(cellCurrent, deltaTimeHours);
    });
    
    // Perform passive balancing if needed
    if (this.needsBalancing) {
      this.balance();
    }
  }

  updateTemperature(current: number, deltaTimeHours: number, coolingPower: number): void {
    // Calculate heat generated by charging
    // I²R heating - proportional to the square of the current
    const effectiveResistance = 0.001 * 3; 
    
    // Apply a non-linear curve to heat generation to reduce impact at lower currents
    const currentFactor = Math.pow(current / 100, 1.5) * 100;
    const heatGenerated = Math.pow(currentFactor, 2) * effectiveResistance * deltaTimeHours * 0.3;
    
    // Calculate cooling effect
    const ambientTemp = 25; // Ambient temperature in °C
    const avgTemp = this._cells.reduce((sum, cell) => sum + cell.temperature, 0) / this._cells.length;
    
    // Cooling effect increases with temperature difference from ambient
    const tempDifferential = Math.max(0, avgTemp - ambientTemp);
    
    // Make cooling much more effective and responsive to the cooling power setting
    // Passive cooling (always present, even when not charging)
    const passiveCooling = tempDifferential * 0.15 * deltaTimeHours;
    
    // Active cooling (from the cooling system, scales with cooling power setting)
    // Dramatically increase the coefficient and make it exponential to create a more noticeable difference
    // between low and high cooling power settings
    const coolingCoefficient = 0.5 * Math.pow(coolingPower, 1.5); // Exponential scaling with cooling power
    const activeCooling = tempDifferential * coolingCoefficient * deltaTimeHours;
    
    // Total cooling effect
    const coolingEffect = passiveCooling + activeCooling;
    
    // Net temperature change (can be positive or negative)
    const netTempChange = heatGenerated - coolingEffect;
    
    // Update each cell's temperature
    this._cells.forEach(cell => {
      // Add some randomness to temperature distribution
      const randomFactor = 0.95 + Math.random() * 0.1;
      cell.temperature += netTempChange * randomFactor;
      
      // Ensure temperature doesn't go below ambient
      if (cell.temperature < ambientTemp && !this._heatingEnabled) {
        cell.temperature = ambientTemp;
      }
      
      // Update each cell individually with its own heating/cooling
      cell.updateTemperature(current / this._cellsInParallel, deltaTimeHours, coolingPower);
    });
  }

  private balance(): void {
    // Find average SoC
    const avgSoc = this.averageSoc;
    
    // Find min and max SoC to determine if balancing is needed
    const minSoc = Math.min(...this._cells.map(cell => cell.stateOfCharge));
    const maxSoc = Math.max(...this._cells.map(cell => cell.stateOfCharge));
    
    // Only balance if the difference is significant
    if (maxSoc - minSoc > 0.01) { // Lower threshold to 1%
      // Balance more aggressively at higher SoC
      let balancingIntensity;
      
      if (avgSoc > 0.9) {
        // Very aggressive at >90% SoC
        balancingIntensity = 0.08;
      } else if (avgSoc > 0.8) {
        // Quite aggressive at >80% SoC
        balancingIntensity = 0.05;
      } else if (avgSoc > 0.7) {
        // Moderately aggressive at >70% SoC
        balancingIntensity = 0.03;
      } else {
        // Less aggressive at lower SoC
        balancingIntensity = 0.02;
      }
      
      // Balance cells by adjusting SoC towards average
      this._cells.forEach(cell => {
        if (cell.stateOfCharge > avgSoc + 0.01) {
          // Reduce SoC of cells that are too high
          cell.stateOfCharge = cell.stateOfCharge - balancingIntensity;
        } else if (cell.stateOfCharge < avgSoc - 0.01) {
          // Increase SoC of cells that are too low (less aggressively)
          cell.stateOfCharge = cell.stateOfCharge + (balancingIntensity / 2);
        }
      });
    }
  }

  reset(initialTemperature: number = 25): void {
    this._cells.forEach(cell => cell.reset(initialTemperature));
    this._heatingEnabled = false;
  }
} 