import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConeStateService {
  private coneStates: boolean[] = [];

  constructor() {}

  public initializeConeStates(count: number): void {
    this.coneStates = new Array(count).fill(false);
  }

  public clearConeStates(): void {
    this.coneStates = [];
  }

  public setConeFallen(index: number): void {
    this.coneStates[index] = true;
  }

  public isConeFallen(index: number): boolean {
    return this.coneStates[index];
  }

  public resetConeState(): void {
    this.coneStates.fill(false);
  }
}
