export class Cell {
  private _temperature: number = 25; // Ambient temperature in Celsius
  private _ambientTemperature: number = 25; // Ambient temperature in Celsius
  private _stateOfCharge: number = 0.0; // 10% initial charge
  private _capacity: number = 10; // Ah
  private _internalResistance: number = 0.01; // Ohms
  private _maxVoltage: number = 4.2; // V
  private _minVoltage: number = 3.4; // V
  private _nominalVoltage: number = 3.7; // V
  private _randomFactor: number = Math.random();
  private _chargingEfficiency: number = 1.0; // Base charging efficiency
  private _charge: number = 0; // Internal charge storage
  private _heatingEnabled: boolean = false; // Battery heating status
  private _wasBalanced: boolean = false;

  constructor(initialSoc: number = 0.0, initialTemperature: number = 25) {
    // Add randomness to initial state of charge (±5%)
    this._stateOfCharge = initialSoc * (0.95 + Math.random() * 0.1);
    
    // Initialize charge based on state of charge
    this._charge = this._stateOfCharge * this._capacity;
    
    // Add randomness to internal resistance (±20%)
    this._internalResistance = this._internalResistance * (0.8 + Math.random() * 0.4);
    
    // Set initial temperature
    this._temperature = initialTemperature;
    this._ambientTemperature = initialTemperature;
  }

  get temperature(): number {
    return this._temperature;
  }

  set temperature(value: number) {
    this._temperature = value;
  }

  get stateOfCharge(): number {
    return this._stateOfCharge;
  }

  set stateOfCharge(value: number) {
    this._stateOfCharge = Math.max(0, Math.min(1, value));
  }

  get voltage(): number {
    return this._minVoltage + (this._maxVoltage - this._minVoltage) * this._stateOfCharge;
  }

  get capacity(): number {
    return this._capacity;
  }

  get randomFactor(): number {
    return this._randomFactor;
  }

  set heatingEnabled(value: boolean) {
    this._heatingEnabled = value;
  }

  set wasBalanced(value: boolean) {
    this._wasBalanced = value;
  }

  get heatingEnabled(): boolean {
    return this._heatingEnabled;
  }

  get wasBalanced(): boolean {
    return this._wasBalanced;
  }

  get energy(): number {
    return this._capacity * this._nominalVoltage;
  }

  updateCharge(current: number, deltaTimeHours: number): void {
    // Apply temperature-based charging limitation
    let effectiveCurrent = current;
    
    // Each cell has a significantly different charging efficiency
    // This creates more pronounced imbalance over time
    const chargingEfficiency = this._chargingEfficiency * (0.95 + this._randomFactor * 0.10);
    
    // Calculate charge added (in Ah)
    const chargeAdded = effectiveCurrent * chargingEfficiency;
    
    // Calculate new charge level
    const newCharge = this._charge + chargeAdded * deltaTimeHours;
    
    // Limit to capacity
    this._charge = Math.min(newCharge, this._capacity);
    
    // Update state of charge
    this._stateOfCharge = this._charge / this._capacity;
    
    // Ensure SoC doesn't exceed 1.0 (100%)
    if (this._stateOfCharge > 1.0) {
      this._stateOfCharge = 1.0;
      this._charge = this._capacity;
    }
  }

  updateTemperature(current: number, deltaTimeHours: number, cooling: number): void {
    const tempChange = {
      tempRise: 0,
      heatingPower: 0,
      coolingEffect: 0,
      ambientEffect: 0
    }

    // Only generate heat if there's current flowing
    if (current > 0.1) {
      // Calculate heat generated by charging (I²R)
      const effectiveResistance = this._internalResistance * 50;

      // More reasonable current effect
      const heatGenerated = Math.pow(current, 2) * effectiveResistance;
      
      // Apply random factor to heating with moderate variation
      const effectiveHeat = heatGenerated * ( (0.95 + this._randomFactor * 0.1) + 0.2);
      
      // Temperature rise (simplified model)
      tempChange.tempRise = effectiveHeat * 0.7;
    }
    
    // Battery heating effect (if enabled)
    if (this._heatingEnabled) {
      // Apply heating effect - stronger when battery is colder
      tempChange.heatingPower = 50;
    } else {
      // Cooling effect (proportional to temperature difference from ambient)
      tempChange.coolingEffect = cooling * -1 * (this._temperature - this._ambientTemperature);

      // Ambient temperature effect (always happens)
      const ambientDiff = this._ambientTemperature - this._temperature;
      tempChange.ambientEffect = 0.05 * ambientDiff;
    }

    // Apply all temperature effects
    const totalTempChange = tempChange.tempRise + 
                          tempChange.heatingPower + 
                          tempChange.coolingEffect + 
                          tempChange.ambientEffect;
    
    this._temperature += totalTempChange  * deltaTimeHours;

    //console.log('tempChange', tempChange,totalTempChange);
    
    // Add occasional small random variations
    if (Math.random() < 0.005) { // 0.5% chance per update
      this._temperature += (Math.random() - 0.5) * 0.5; // +/- 0.25 degrees randomly
    }
  }

  reset(initialTemperature: number = 25): void {
    this._temperature = initialTemperature;
    this._stateOfCharge = 0.1;
    this._heatingEnabled = false;
  }

  private updateVoltage(): void {
    // This method is called after SoC changes to update internal state
    // No need to do anything as voltage is calculated dynamically from SoC
  }
} 