import { Routes } from '@angular/router';
import { PaginaProvisoria } from '../../../shared/components/pagina-provisoria/pagina-provisoria';
import { ShellPublico } from './shell-publico';

export default [
  {
    path: '',
    component: ShellPublico,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../../../features/landing/landing').then((m) => m.Landing),
      },
      {
        path: 'cadastrar-condominio',
        title: 'Cadastre seu condomínio',
        loadComponent: () =>
          import('../../../features/cadastro-condominio/cadastro-condominio').then(
            (m) => m.CadastroCondominio,
          ),
      },
      { path: 'c/:slug', title: 'Condomínio', component: PaginaProvisoria, data: { issue: 7 } },
      { path: 'c/:slug/cadastro', title: 'Criar conta', component: PaginaProvisoria, data: { issue: 7 } },
      { path: 'c/:slug/entrar', title: 'Entrar', component: PaginaProvisoria, data: { issue: 6 } },
      {
        path: 'c/:slug/aguardando-aprovacao',
        title: 'Cadastro enviado',
        component: PaginaProvisoria,
        data: { issue: 7 },
      },
      { path: 'trocar-senha', title: 'Crie sua nova senha', component: PaginaProvisoria, data: { issue: 9 } },
      {
        path: '**',
        title: 'Página não encontrada',
        loadComponent: () =>
          import('../../../features/nao-encontrada/pagina-nao-encontrada').then(
            (m) => m.PaginaNaoEncontrada,
          ),
      },
    ],
  },
] satisfies Routes;
