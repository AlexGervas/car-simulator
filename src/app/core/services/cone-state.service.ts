import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConeStateService {
  private coneStates: boolean[] = [];

  constructor() { }

  public initializeConeStates(count: number): void {
    this.coneStates = new Array(count).fill(false);
    console.log(666, 'Cone states initialized:', this.coneStates);
  }

  public clearConeStates(): void {
    this.coneStates = [];
    console.log('Cone states cleared');
  }

  public setConeFallen(index: number): void {
    this.coneStates[index] = true;
  }

  public isConeFallen(index: number): boolean {
    return this.coneStates[index];
  }

  public resetConeState(): void {
    this.coneStates.fill(false);
    console.log(55, 'Cone states reset:', this.coneStates);
  }
}
