import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  constructor(private router: Router) {}

  public openStartGame(): void {
    this.router.navigate(['game']);
  }

  public openModelViewer(): void {
    this.router.navigate(['model-viewer']);
  }

  public openSettings(): void {
    alert('Coming soon!');
  }
}
