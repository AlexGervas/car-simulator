import { Routes } from '@angular/router';
import { StartPageComponent } from './modules/start-page/start-page.component';
import { SimulatorComponent } from './modules/simulator/simulator.component';
import { NotFoundComponent } from './modules/not-found/not-found.component';

export const routes: Routes = [
    { path: '', component: StartPageComponent },
    { path: 'game', component: SimulatorComponent },
    { path: '**', component: NotFoundComponent }
];
