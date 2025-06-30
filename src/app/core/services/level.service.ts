import { Injectable } from '@angular/core';
import { DialogService } from './dialog.service';

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

  constructor(private dialogService: DialogService) {
    this.loadLevels();
  }

  public getNextLevel(level: string): string | null {
    const levelKeys = Object.keys(this.levels);
    const currentIndex = levelKeys.indexOf(level);
    if (currentIndex >= 0 && currentIndex < levelKeys.length - 1) {
      return levelKeys[currentIndex + 1];
    }
    return null;
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

    if (currentIndex === levelKeys.length - 1 && this.allLevelsCompleted()) {
      this.dialogService.openDialog('Поздравляем', 'Вы прошли обучение и выполнили все задания!', false);
    }
  }

  private allLevelsCompleted(): boolean {
    return Object.values(this.levels).every(completed => completed);
  }

  public isNextLevelAvailable(level: string): boolean {
    const levelKeys = Object.keys(this.levels);
    const currentIndex = levelKeys.indexOf(level);
    if (currentIndex >= 0 && currentIndex < levelKeys.length - 1) {
      const nextLevel = levelKeys[currentIndex + 1];
      return this.isLevelAvailable(nextLevel);
    }
    return false;
  }

}
