import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  isMobile(): boolean {
    return window.innerWidth <= 1024;
  }
}
