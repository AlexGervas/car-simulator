import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

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

  private isLoggedOut = false;

  constructor(private api: ApiService, private userService: UserService, private storage: StorageService, private auth: AuthService) {
    this.userService.user$.subscribe(user => {
      if (user && !this.isLoggedOut) {
        this.loadLevels(user.userId);
      }
    });

    const token = this.auth.getToken();

    if (token) {
      this.api.getCurrentUser().subscribe({
        next: user => {
          if (!this.isLoggedOut) {
            this.loadLevels(user.userId);
          }
        },
        error: () => console.warn('Failed to load the user at the start of LevelService')
      });
    }
  }

  public getNextLevel(level: string): string | null {
    const currentIndex = this.levelOrder.indexOf(level);
    return (currentIndex >= 0 && currentIndex < this.levelOrder.length - 1) ? this.levelOrder[currentIndex + 1] : null
  }

  /**
   * Loading levels from CloudStorage/localStorage and api
   * @param userId 
   */
  public async loadLevels(userId: number): Promise<void> {
    if (this.isLoggedOut) return; 

    try {
      const cached = await this.storage.getItem(`levels_${userId}`);
      if (cached) {
        this.levels = JSON.parse(cached);
        this.levelsSubject.next({ ...this.levels });
      }

      this.api.getLevelsFromServer(userId).subscribe({
        next: async (levels) => {
          this.levelOrder.forEach((level) => {
            this.levels[level] = !!levels[level];
          });
          this.levelsSubject.next({ ...this.levels });
          await this.storage.setItem(`levels_${userId}`, JSON.stringify(this.levels));
          this.levelsLoaded = true;
        },
        error: (err) => {
          console.error('Error loading levels:', err);
          this.levelsLoaded = true;
        }
      });
    } catch (e) {
      console.error('Unexpected error loading levels:', e);
      this.levelsLoaded = true;
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
