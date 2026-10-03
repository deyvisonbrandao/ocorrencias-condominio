import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { focarTituloERolarAoNavegar } from './core/services/foco-na-navegacao';
import { RegiaoToast } from './shared/components/toast/regiao-toast';

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
    focarTituloERolarAoNavegar();
  }
}
