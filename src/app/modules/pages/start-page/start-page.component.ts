import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LevelService } from '../../../core/services/level.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-page.component.html',
  styleUrl: './start-page.component.css'
})
export class StartPageComponent {
  constructor(private router: Router, public levelService: LevelService) { }

  public startGame(level: string) {
    if(this.levelService.isLevelAvailable(level)) {
      this.router.navigate(['/game/simulator'], { queryParams: { level } });
    } else {
      alert("Этот уровень недоступен!");
    }
  }

}
