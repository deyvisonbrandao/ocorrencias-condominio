import { Routes } from '@angular/router';

const rotasDeDesenvolvimento: Routes =
  typeof ngDevMode === 'undefined' || ngDevMode
    ? [{ path: 'dev', loadChildren: () => import('./dev/dev.routes') }]
    : [];

export const routes: Routes = [
  { path: 'app', loadChildren: () => import('./morador/morador.routes') },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes') },
  ...rotasDeDesenvolvimento,
  { path: '', loadChildren: () => import('./publico/publico.routes') },
];
