import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConeStateService {
  private coneFallen: boolean = false;

  public setConeFallen(value: boolean): void {
    this.coneFallen = value;
  }

  public isConeFallen(): boolean {
    return this.coneFallen;
  }

  public resetConeState(): void {
    this.coneFallen = false;
  }
  
}
