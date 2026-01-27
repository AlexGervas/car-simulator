import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const telegramGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const tgData = window?.Telegram?.WebApp?.initDataUnsafe;
  const telegramId = tgData?.user?.id;

  if (!telegramId) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  return auth.loginWithTelegram(telegramId).pipe(
    map(() => router.createUrlTree(['/home'])),
    catchError(() => of(router.createUrlTree(['/registration'])))
  );
};
