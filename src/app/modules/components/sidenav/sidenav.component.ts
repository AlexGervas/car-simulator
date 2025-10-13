import { Component, Input } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { MatIcon } from "@angular/material/icon";
import { AuthService } from '../../../core/services/auth.service';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [MatListModule, MatIcon],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.css'
})
export class SidenavComponent {
  @Input() sidenav!: MatSidenav;

  constructor(private router: Router, private auth: AuthService) { }

  async navigateToHome() {
    await this.router.navigate(['/home']);
    await this.sidenav?.close();
  }

  async navigateToLevelsPage() {
    await this.router.navigate(['/game']);
    await this.sidenav?.close();
  }

  async logout() {
    await this.sidenav?.close();
    this.auth.logout();
    await this.router.navigate(['/login']);
  }

}
