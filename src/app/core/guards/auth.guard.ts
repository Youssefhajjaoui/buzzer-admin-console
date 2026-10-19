import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.accessToken()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.user()) {
    return true;
  }

  return auth.loadMe().pipe(
    map(() => true),
    catchError(() => {
      auth.clearSession();
      return of(router.createUrlTree(['/login']));
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.accessToken()) {
    return true;
  }

  if (auth.user()) {
    return router.createUrlTree(['/dashboard']);
  }

  return auth.loadMe().pipe(
    map(() => router.createUrlTree(['/dashboard'])),
    catchError(() => {
      auth.clearSession();
      return of(true);
    }),
  );
};
