import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  private levels: { [key: string]: boolean } = {
    'snake': true,
    'parallel-parking': false,
    'garage': false,
    'steep-grade': false
  }

  constructor() {
    this.loadLevels();
  }

  private loadLevels(): void {
    const savedLevels = localStorage.getItem("levels");
    if (savedLevels) {
      this.levels = JSON.parse(savedLevels);
    }
  }

  public isLevelAvailable(level: string): boolean {
    return this.levels[level] || false;
  }

  public completeLevel(level: string): void {
    const levelKeys = Object.keys(this.levels);
    const currentIndex = levelKeys.indexOf(level);
    if (currentIndex >= 0 && currentIndex < levelKeys.length - 1) {
      this.levels[levelKeys[currentIndex + 1]] = true;
      localStorage.setItem('levels', JSON.stringify(this.levels));
    }
  }

}
