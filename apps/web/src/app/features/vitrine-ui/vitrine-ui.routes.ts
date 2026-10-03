import { Routes } from '@angular/router';
import { ShellPublico } from '../../core/layouts/publico/shell-publico';
import { VitrineUi } from './vitrine-ui';

export default [
  {
    path: '',
    component: ShellPublico,
    children: [{ path: 'ui', title: 'Vitrine de componentes', component: VitrineUi }],
  },
] satisfies Routes;
