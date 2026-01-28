import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/types';
import { TelegramService } from './telegram.service';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public readonly user$ = this.userSubject.asObservable();

  constructor(
    private telegramService: TelegramService,
    private api: ApiService
  ) {}

  public init(): void {
    const tgUser = this.telegramService.getTelegramUser();
    if (tgUser) {
      this.userSubject.next({ ...tgUser, isTelegram: true });
      return;
    }

    const token = localStorage.getItem('auth_token');

    if (token) {
      this.api.getCurrentUser().subscribe({
        next: (user) => {
          this.userSubject.next({ ...user, isTelegram: false });
        },
        error: (err) => {
          console.warn('Couldnt upload user by token', err);
        },
      });
    }
  }

  public loadUserFromApi(): Observable<User> {
    return this.api
      .getCurrentUser()
      .pipe(
        tap((user) => this.userSubject.next({ ...user, isTelegram: false }))
      );
  }

  public getUser(): User | null {
    return this.userSubject.value;
  }

  public setUser(user: User): void {
    this.userSubject.next(user);
  }

  public clearUser(): void {
    this.userSubject.next(null);
  }
}
