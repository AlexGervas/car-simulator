import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://car-simulator.onrender.com';
  }

  /**
   *  Создание пользователя (Telegram или Web)
   * @param user 
   * @returns 
   */
  public createUser(user: User): Observable<User> {
    return this.http.post<any>(`${this.apiUrl}/create-user`, user).pipe(
      map((res: any) => ({
        userId: res.id ?? 0,
        isTelegram: user.isTelegram,
        username: res.username ?? user.username,
        userfirstname: user.userfirstname,
        userlastname: user.userlastname,
        email: user.email,
        password_plain: ''
      }))
    );
  }

  /**
   * Получение текущего пользователя по токену
   * @returns 
   */
  public getCurrentUser(): Observable<User> {
    const token = localStorage.getItem('auth_token');
    return this.http.get<User>(`${this.apiUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  /**
   * Получение текущего прогресса уровней пользователя
   * @param userId
   * @returns
   */
  public getLevelsFromServer(userId: number): Observable<{ [key: string]: boolean }> {
    return this.http.get<{ user_id: string; levels: { level: string; status: boolean }[] }>(`${this.apiUrl}/levels/${userId}`).pipe(
      map((response: { levels: { level: string | number; status: boolean; }[]; }) => {
        const levelMap: { [key: string]: boolean } = {};
        response.levels.forEach((lvl: { level: string | number; status: boolean; }) => {
          levelMap[lvl.level] = lvl.status;
        });
        return levelMap;
      })
    );
  }

  /**
   * Изменение прогресса при выполнении уровня
   * @param userId 
   * @param currentLevel 
   * @returns 
   */
  public completeLevel(userId: number, currentLevel: string): Observable<any> {
    const body = {
      userId: userId,
      currentLevel: currentLevel
    };
    return this.http.post<any>(`${this.apiUrl}/complete-level`, body);
  }

}
