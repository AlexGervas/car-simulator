import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LevelService } from '../../../core/services/level.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-page.component.html',
  styleUrl: './start-page.component.css',
})
export class StartPageComponent implements OnInit, OnDestroy {
  public levelBtns: {
    name: string;
    available: boolean;
    icon: string;
    tooltip: string;
  }[] = [];
  private sub: Subscription = new Subscription();

  constructor(
    private router: Router,
    public levelService: LevelService,
  ) {}

  ngOnInit() {
    this.sub = this.levelService.levels$.subscribe((levels) => {
      this.levelBtns = this.levelService.levelOrder.map((levelName) => ({
        name: levelName,
        available: levels[levelName] || false,
        icon: this.getIconForLevel(levelName),
        tooltip: this.getTooltipForLevel(levelName),
      }));
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private getIconForLevel(level: string): string {
    switch (level) {
      case 'snake':
        return 'svg/snake.svg';
      case 'parallel-parking':
        return 'svg/parallel_parking.svg';
      case 'garage':
        return 'svg/garage_with_red_car.svg';
      case 'steep-grade':
        return 'svg/steep_grade.svg';
      default:
        return '';
    }
  }

  private getTooltipForLevel(level: string): string {
    switch (level) {
      case 'snake':
        return 'Play Snake Level';
      case 'parallel-parking':
        return 'Practice Parallel Parking';
      case 'garage':
        return 'Practice Garage Parking';
      case 'steep-grade':
        return 'Steep Grade Level';
      default:
        return '';
    }
  }

  public startGame(level: string) {
    if (this.levelService.isLevelAvailable(level)) {
      this.router.navigate(['/game/simulator'], { queryParams: { level } });
    } else {
      alert('Этот уровень недоступен!');
    }
  }
}
