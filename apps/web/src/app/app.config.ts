import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { routes } from './app.routes';
import { apiInterceptor } from './core/http/api.interceptor';
import { erroHttpInterceptor } from './core/http/erro-http.interceptor';
import { TituloDaPagina } from './core/navegacao/titulo-da-pagina';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: TituloDaPagina },
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, erroHttpInterceptor])),
  ],
};
