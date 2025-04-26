import { Routes } from '@angular/router';
import { StartPageComponent } from './modules/pages/start-page/start-page.component';
import { SimulatorComponent } from './modules/pages/simulator/simulator.component';
import { NotFoundComponent } from './modules/pages/not-found/not-found.component';
import { ModelViewerComponent } from './modules/pages/model-viewer/model-viewer.component';
import { HomePageComponent } from './modules/pages/home-page/home-page.component';

export const routes: Routes = [
    { path: '', component: HomePageComponent },
    { path: 'game', component: StartPageComponent },
    { path: 'game/simulator', component: SimulatorComponent },
    { path: 'model-viewer', component: ModelViewerComponent },
    { path: '**', component: NotFoundComponent }
];
