import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-start-page',
  standalone: true,
  imports: [],
  templateUrl: './start-page.component.html',
  styleUrl: './start-page.component.css'
})
export class StartPageComponent {
  constructor(private router: Router) { }

  public startGame(level: string) {
    this.router.navigate(['/game'], { queryParams: { level } });
  }

}
