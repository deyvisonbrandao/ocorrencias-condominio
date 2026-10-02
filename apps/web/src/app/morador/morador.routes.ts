import { Routes } from '@angular/router';
import { Pilha } from '../core/navegacao/rota-atual';
import { PaginaProvisoria } from '../shared/pagina-provisoria/pagina-provisoria';
import { ShellMorador } from './shell-morador';

const VOLTAR_PARA_OCORRENCIAS: Pilha = {
  voltarPara: '/app/ocorrencias',
  rotuloVoltar: 'Voltar para ocorrências',
  icone: 'voltar',
};

const CANCELAR_NOVA: Pilha = {
  voltarPara: '/app/ocorrencias',
  rotuloVoltar: 'Cancelar e voltar',
  icone: 'fechar',
};

export default [
  {
    path: '',
    component: ShellMorador,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ocorrencias' },
      {
        path: 'ocorrencias',
        title: 'Ocorrências do condomínio',
        component: PaginaProvisoria,
        data: { issue: 14 },
      },
      { path: 'minhas', title: 'Minhas ocorrências', component: PaginaProvisoria, data: { issue: 13 } },
      { path: 'perfil', title: 'Perfil', component: PaginaProvisoria, data: { issue: 9 } },
      {
        path: 'nova',
        title: 'Nova ocorrência',
        component: PaginaProvisoria,
        data: { issue: 12, pilha: CANCELAR_NOVA },
      },
      {
        path: 'ocorrencias/:id',
        title: (rota) => `Ocorrência #${rota.paramMap.get('id') ?? ''}`,
        component: PaginaProvisoria,
        data: { issue: 13, pilha: VOLTAR_PARA_OCORRENCIAS },
      },
    ],
  },
] satisfies Routes;
