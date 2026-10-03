import { Routes } from '@angular/router';

const rotasDeDesenvolvimento: Routes =
  typeof ngDevMode === 'undefined' || ngDevMode
    ? [{ path: 'dev', loadChildren: () => import('./features/vitrine-ui/vitrine-ui.routes') }]
    : [];

export const routes: Routes = [
  { path: 'app', loadChildren: () => import('./core/layouts/morador/morador.routes') },
  { path: 'admin', loadChildren: () => import('./core/layouts/admin/admin.routes') },
  ...rotasDeDesenvolvimento,
  { path: '', loadChildren: () => import('./core/layouts/publico/publico.routes') },
];
