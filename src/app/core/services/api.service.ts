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
