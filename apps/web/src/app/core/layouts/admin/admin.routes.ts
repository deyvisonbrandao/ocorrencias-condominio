import { Routes } from '@angular/router';
import { Pilha } from '../../services/rota-atual';
import { PaginaProvisoria } from '../../../shared/components/pagina-provisoria/pagina-provisoria';
import { ShellAdmin } from './shell-admin';

const VOLTAR_PARA_FILA: Pilha = {
  voltarPara: '/admin/ocorrencias',
  rotuloVoltar: 'Voltar para ocorrências',
  icone: 'voltar',
};

export default [
  {
    path: '',
    component: ShellAdmin,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      {
        path: 'painel',
        title: 'Painel',
        loadComponent: () => import('../../../features/painel/painel').then((m) => m.Painel),
      },
      { path: 'ocorrencias', title: 'Ocorrências', component: PaginaProvisoria, data: { issue: 15 } },
      {
        path: 'ocorrencias/nova',
        title: 'Nova ocorrência',
        component: PaginaProvisoria,
        data: { issue: 16, pilha: VOLTAR_PARA_FILA },
      },
      {
        path: 'ocorrencias/:id',
        title: (rota) => `Ocorrência #${rota.paramMap.get('id') ?? ''}`,
        component: PaginaProvisoria,
        data: { issue: 15, pilha: VOLTAR_PARA_FILA },
      },
      { path: 'moradores', title: 'Moradores', component: PaginaProvisoria, data: { issue: 8 } },
      { path: 'equipe', title: 'Equipe', component: PaginaProvisoria, data: { issue: 10 } },
      { path: 'condominio', title: 'Condomínio', component: PaginaProvisoria, data: { issue: 11 } },
    ],
  },
] satisfies Routes;
