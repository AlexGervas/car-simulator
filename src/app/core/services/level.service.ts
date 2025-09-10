import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  public readonly levelOrder: string[] = ['snake', 'parallel-parking', 'garage', 'steep-grade'];

  private levels: { [key: string]: boolean } = {
    'snake': true,
    'parallel-parking': false,
    'garage': false,
    'steep-grade': false
  };

  private levelsSubject = new BehaviorSubject<{ [key: string]: boolean }>(this.levels);
  public readonly levels$ = this.levelsSubject.asObservable();
  public levelsLoaded = false;


  constructor(private api: ApiService, private userService: UserService) {
    this.userService.user$.subscribe(user => {
      if (user) {
        this.loadLevels(user.userId);
      }
    });
  }

  public getNextLevel(level: string): string | null {
    const currentIndex = this.levelOrder.indexOf(level);
    if (currentIndex >= 0 && currentIndex < this.levelOrder.length - 1) {
      return this.levelOrder[currentIndex + 1];
    }
    return null;
  }

  public loadLevels(userId: number): void {
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
