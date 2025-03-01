import { Cell } from './Cell';

export class BatteryModule {
  private _cells: Cell[] = [];
  private _cellsInSeries: number;
  private _cellsInParallel: number;

  constructor(cellsInSeries: number = 12, cellsInParallel: number = 8) {
    this._cellsInSeries = cellsInSeries;
    this._cellsInParallel = cellsInParallel;
    
    // Create cells
    for (let i = 0; i < cellsInSeries * cellsInParallel; i++) {
      this._cells.push(new Cell());
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
    return this._cells.some(cell => Math.abs(cell.voltage - avgVoltage) > 0.1);
  }

  updateCharge(current: number, deltaTimeHours: number): void {
    // Current per parallel group
    const currentPerParallel = current / this._cellsInParallel;
    
    // Update each cell
    this._cells.forEach(cell => {
      cell.updateCharge(currentPerParallel, deltaTimeHours);
    });
    
    // Perform balancing if needed
    if (this.needsBalancing) {
      this.balance();
    }
  }

  updateTemperature(current: number, deltaTimeHours: number, cooling: number): void {
    // Current per parallel group
    const currentPerParallel = current / this._cellsInParallel;
    
    // Update each cell
    this._cells.forEach(cell => {
      cell.updateTemperature(currentPerParallel, deltaTimeHours, cooling);
    });
  }

  private balance(): void {
    // Find average SoC
    const avgSoc = this.averageSoc;
    
    // Balance cells by adjusting SoC towards average
    this._cells.forEach(cell => {
      if (cell.stateOfCharge > avgSoc + 0.05) {
        // Reduce SoC of cells that are too high
        cell.stateOfCharge = cell.stateOfCharge - 0.01;
      }
    });
  }

  reset(): void {
    this._cells.forEach(cell => cell.reset());
  }
} 