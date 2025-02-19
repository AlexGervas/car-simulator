import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SimulatorComponent } from './modules/simulator/simulator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SimulatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'car-simulator';
}
