import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { focarTituloAoNavegar } from './core/navegacao/foco-na-navegacao';
import { RegiaoToast } from './shared/ui/toast/regiao-toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RegiaoToast],
  template: `
    <router-outlet />
    <ui-regiao-toast />
  `,
})
export class App {
  constructor() {
    focarTituloAoNavegar();
  }
}
