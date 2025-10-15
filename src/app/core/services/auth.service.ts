import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UserService } from './user.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://car-simulator.onrender.com';
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient, private userService: UserService, private storage: StorageService) { }

  /**
   * Авторизация
   * @param email 
   * @param password
   * @returns
   */
  public login(email: string, password: string): Observable<any> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          this.userService.loadUserFromApi().subscribe();
        }
      })
    );
  }

  /**
   * Авторизация через Telegram ID
   * @param telegramId 
   * @returns 
   */
  public loginWithTelegram(telegramId: number): Observable<any> {
    return this.http.post<{ token: string; user: any }>(`${this.apiUrl}/login-telegram`, { telegram_id: telegramId }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          this.userService.setUser(res.user);
        }
      })
    );
  }

  /**
   * Выход
   */
  public async logout(): Promise<void> {
    const user = this.userService.getUser();
    const userId = user?.userId;

    localStorage.removeItem(this.TOKEN_KEY);

    if (userId != null) {
      await this.storage.removeItem(`levels_${userId}`);
    }

    localStorage.clear();
    sessionStorage.clear();
    this.userService.clearUser();
  }

  /**
   * Текущий токен
   * @returns 
   */
  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Авторизован ли пользователь 
   * @returns 
   */
  public isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
