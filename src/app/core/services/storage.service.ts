import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private isTelegram =
    typeof window !== 'undefined' &&
    !!window['Telegram']?.WebApp &&
    window.Telegram.WebApp.initDataUnsafe?.user != null;

  constructor() {}

  public async getItem(key: string): Promise<string | null> {
    if (this.isTelegram) {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (cloudStorage) {
        try {
          return await new Promise((resolve) => {
            cloudStorage.getItem(key, (err: any, value: string) => {
              if (err) {
                console.warn('CloudStorage getItem error:', err);
                resolve(null);
              } else {
                resolve(value ?? null);
              }
            });
          });
        } catch (e) {
          console.warn(
            'CloudStorage not supported, fallback to sessionStorage',
          );
          return sessionStorage.getItem(key);
        }
      } else {
        return sessionStorage.getItem(key);
      }
    } else {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage read error:', e);
        return null;
      }
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (this.isTelegram) {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (cloudStorage) {
        try {
          await new Promise<void>((resolve) => {
            cloudStorage.setItem(key, value, (err?: any) => {
              if (err) {
                console.warn('CloudStorage setItem error:', err);
              }
              resolve();
            });
          });
          return;
        } catch (e) {
          console.warn(
            'CloudStorage not supported, fallback to sessionStorage',
          );
          sessionStorage.setItem(key, value);
          return;
        }
      } else {
        sessionStorage.setItem(key, value);
      }
    } else {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage write error:', e);
      }
    }
  }

  public async removeItem(key: string): Promise<void> {
    if (this.isTelegram) {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (cloudStorage) {
        try {
          await new Promise<void>((resolve) => {
            cloudStorage.removeItem(key, (err?: any) => {
              if (err) {
                console.warn('CloudStorage removeItem error:', err);
              }
              resolve();
            });
          });
          return;
        } catch (e) {
          console.warn(
            'CloudStorage not supported, fallback to sessionStorage',
          );
          sessionStorage.removeItem(key);
          return;
        }
      } else {
        sessionStorage.removeItem(key);
      }
    } else {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage remove error:', e);
      }
    }
  }
}
