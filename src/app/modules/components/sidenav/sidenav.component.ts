import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [MatListModule],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.css'
})
export class SidenavComponent {
  constructor(private router: Router) { }

  navigateToHome() {
    this.router.navigate(['/']);
  }

  startGame(level: string) {
    this.router.navigate(['/game'], { queryParams: { level } });
  }
}
