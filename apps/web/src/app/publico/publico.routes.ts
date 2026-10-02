import { Routes } from '@angular/router';
import { PaginaProvisoria } from '../shared/pagina-provisoria/pagina-provisoria';
import { Landing } from './landing/landing';
import { PaginaNaoEncontrada } from './pagina-nao-encontrada/pagina-nao-encontrada';
import { ShellPublico } from './shell-publico';

export default [
  {
    path: '',
    component: ShellPublico,
    children: [
      { path: '', pathMatch: 'full', component: Landing },
      {
        path: 'cadastrar-condominio',
        title: 'Cadastre seu condomínio',
        component: PaginaProvisoria,
        data: { issue: 5 },
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
      { path: '**', title: 'Página não encontrada', component: PaginaNaoEncontrada },
    ],
  },
] satisfies Routes;
