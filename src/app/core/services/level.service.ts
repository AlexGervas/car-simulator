import { Injectable } from '@angular/core';
import { DialogService } from './dialog.service';
import { ApiService } from './api.service';
import { TelegramService } from './telegram.service';
import { User } from '../models/user';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  private user: User | any;
  public readonly levelOrder: string[] = ['snake', 'parallel-parking', 'garage', 'steep-grade'];

  private levels: { [key: string]: boolean } = {
    'snake': true,
    'parallel-parking': false,
    'garage': false,
    'steep-grade': false
  }

  private levelsSubject = new BehaviorSubject<{ [key: string]: boolean }>(this.levels);
  public levels$ = this.levelsSubject.asObservable();
  public levelsLoaded = false;


  constructor(private dialogService: DialogService, private api: ApiService, private telegramService: TelegramService) {
    this.user = this.telegramService.getTelegramUser();
    this.loadLevels();
  }

  public getNextLevel(level: string): string | null {
    const currentIndex = this.levelOrder.indexOf(level);
    if (currentIndex >= 0 && currentIndex < this.levelOrder.length - 1) {
      return this.levelOrder[currentIndex + 1];
    }
    return null;
  }

  public loadLevels(): void {
    if (this.user) {
      const userId = this.user.userId;
      this.api.getLevelsFromServer(userId).subscribe({
        next: (levels) => {
          this.levelOrder.forEach((level) => {
            this.levels[level] = !!levels[level];
          });
          this.levelsSubject.next({ ...this.levels });
          this.levelsLoaded = true;
        },
        error: (err) => {
          console.error('Error loading levels:', err);
          this.levelsLoaded = true;
        }
      });
    }
  }

  public isLevelAvailable(level: string): boolean {
    return this.levels[level] || false;
  }

  public isNextLevelAvailable(level: string): boolean {
    const currentIndex = this.levelOrder.indexOf(level);
    if (currentIndex >= 0 && currentIndex < this.levelOrder.length - 1) {
      const nextLevel = this.levelOrder[currentIndex + 1];
      return this.levels[nextLevel] || false;
    }
    return false;
  }

}
