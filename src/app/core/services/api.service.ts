import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
