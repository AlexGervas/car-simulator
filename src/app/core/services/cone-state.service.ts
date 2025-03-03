import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConeStateService {
  private coneStates: boolean[] = [];

  constructor() {
    this.coneStates = new Array(5).fill(false);
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
