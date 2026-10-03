import { Routes } from '@angular/router';
import { loginSemSessao } from '../../guards/sessao.guards';
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
      {
        path: 'c/:slug',
        title: 'Condomínio',
        loadComponent: () =>
          import('../../../features/pagina-do-condominio/pagina-do-condominio').then(
            (m) => m.PaginaDoCondominio,
          ),
      },
      {
        path: 'c/:slug/cadastro',
        title: 'Criar conta',
        loadComponent: () =>
          import('../../../features/cadastro-morador/cadastro-morador').then(
            (m) => m.CadastroMorador,
          ),
      },
      {
        path: 'c/:slug/entrar',
        title: 'Entrar',
        canActivate: [loginSemSessao],
        loadComponent: () => import('../../../features/entrar/entrar').then((m) => m.Entrar),
      },
      {
        path: 'c/:slug/aguardando-aprovacao',
        title: 'Cadastro enviado',
        loadComponent: () =>
          import('../../../features/aguardando-aprovacao/aguardando-aprovacao').then(
            (m) => m.AguardandoAprovacao,
          ),
      },
      { path: 'termos', title: 'Termos de uso', component: PaginaProvisoria, data: { issue: 25 } },
      {
        path: 'privacidade',
        title: 'Política de privacidade',
        component: PaginaProvisoria,
        data: { issue: 25 },
      },
      {
        path: 'trocar-senha',
        title: 'Crie sua nova senha',
        component: PaginaProvisoria,
        data: { issue: 9 },
      },
      {
        path: 'sessao-indisponivel',
        title: 'Não foi possível abrir a página',
        loadComponent: () =>
          import('../../../features/sessao-indisponivel/sessao-indisponivel').then(
            (m) => m.SessaoIndisponivel,
          ),
      },
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
