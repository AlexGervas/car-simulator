import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = 'https://car-simulator.onrender.com';

  constructor(private http: HttpClient) { }

  /**
   * Прогресс выполнения уровня
   * @param user 
   * @param level 
   * @param status 
   * @returns 
   */
  public reportLevelCompletion(user: User, level: string, status: boolean): Observable<User> {
    const body = {
      userId: user.userId,
      level: level,
      status: status
    };
    return this.http.post<User>(`${this.apiUrl}/progress`, body);
  }

}
