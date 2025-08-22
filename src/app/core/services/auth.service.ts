import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://car-simulator.onrender.com';
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) { }

  /**
   * Авторизация
   * @param email 
   * @param password 
   * @returns 
   */
  public login(email: string, password: string): any {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res: { token: string; }) => {
        if (res.token) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
        }
      })
    );
  }

  /**
   * Выход
   */
  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
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
