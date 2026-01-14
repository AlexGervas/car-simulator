import { Routes } from '@angular/router';
import { StartPageComponent } from './modules/pages/start-page/start-page.component';
import { SimulatorComponent } from './modules/pages/simulator/simulator.component';
import { NotFoundComponent } from './modules/pages/not-found/not-found.component';
import { ModelViewerComponent } from './modules/pages/model-viewer/model-viewer.component';
import { HomePageComponent } from './modules/pages/home-page/home-page.component';
import { LoginComponent } from './modules/auth/pages/login/login.component';
import { authGuard } from './core/services/auth.guard';
import { RegistrationComponent } from './modules/auth/pages/registration/registration.component';
import { telegramGuard } from './core/services/telegram.guard';

export const routes: Routes = [
  { path: '', canActivate: [telegramGuard], component: HomePageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registration', component: RegistrationComponent },
  {
    path: '',

    canActivateChild: [authGuard],
    children: [
      { path: 'home', component: HomePageComponent },
      { path: 'game', component: StartPageComponent },
      { path: 'game/simulator', component: SimulatorComponent },
      { path: 'model-viewer', component: ModelViewerComponent },
    ],
  },
  { path: '**', component: NotFoundComponent },
];
