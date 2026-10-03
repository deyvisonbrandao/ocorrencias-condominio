import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcaoMorador, MoradorAdmin } from '@ocorrencias/contratos';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../../../../testes/dialogo-nativo';
import { MoradoresService } from '../../services/moradores.service';
import { AcaoConcluida, ConfirmarAcao } from './confirmar-acao';

function morador(dados: Partial<MoradorAdmin> = {}): MoradorAdmin {
  return {
    id: 'm1',
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    bloco: 'B',
    apto: '302',
    status: 'PENDENTE',
    criadoEm: '2026-09-01T12:00:00Z',
    motivoRecusa: null,
    ...dados,
  };
}

function erroApi(status: number, code: string, message: string, details?: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { statusCode: status, code, message, details } });
}

describe('ConfirmarAcao', () => {
  let fixture: ComponentFixture<ConfirmarAcao>;
  let raiz: HTMLElement;
  let concluidas: AcaoConcluida[];
  let desatualizacoes: string[];
  const api = {
    executar: vi.fn<(acao: AcaoMorador, id: string) => Observable<MoradorAdmin>>(),
    recusar: vi.fn<(id: string, motivo: string) => Observable<MoradorAdmin>>(),
  };

  const dialogo = () => raiz.querySelector('dialog') as HTMLDialogElement;
  const botao = (rotulo: string) =>
    [...dialogo().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === rotulo) as
      | HTMLButtonElement
      | undefined;
  const textarea = () => dialogo().querySelector('textarea') as HTMLTextAreaElement;

  async function abrir(acao: AcaoMorador, dados: Partial<MoradorAdmin> = {}): Promise<void> {
    fixture.componentInstance.abrir({ acao, morador: morador(dados) });
    await fixture.whenStable();
  }

  async function digitarMotivo(texto: string): Promise<void> {
    textarea().value = texto;
    textarea().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function clicar(rotulo: string): Promise<void> {
    botao(rotulo)?.click();
    await fixture.whenStable();
  }

  beforeEach(() => {
    simularDialogoNativo();
    api.executar.mockReset();
    api.recusar.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: MoradoresService, useValue: api }] });
    fixture = TestBed.createComponent(ConfirmarAcao);
    raiz = fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    concluidas = [];
    desatualizacoes = [];
    fixture.componentInstance.concluiu.subscribe((evento) => concluidas.push(evento));
    fixture.componentInstance.desatualizou.subscribe((mensagem) => desatualizacoes.push(mensagem));
  });

  afterEach(() => {
    raiz.remove();
    restaurarDialogoNativo();
  });

  it('aprovar: confirmação curta em alertdialog, com foco em "Cancelar"', async () => {
    await abrir('aprovar');

    expect(dialogo().hasAttribute('open')).toBe(true);
    expect(dialogo().getAttribute('role')).toBe('alertdialog');
    expect(dialogo().querySelector('h2')?.textContent?.trim()).toBe('Aprovar o cadastro de Ana Lima?');
    expect(document.activeElement).toBe(botao('Cancelar'));
  });

  it('aprovar com sucesso: fecha e avisa quem abriu com o morador atualizado', async () => {
    api.executar.mockReturnValue(of(morador({ status: 'ATIVO' })));
    await abrir('aprovar');

    await clicar('Aprovar');

    expect(api.executar).toHaveBeenCalledWith('aprovar', 'm1');
    expect(dialogo().hasAttribute('open')).toBe(false);
    expect(concluidas).toEqual([
      { acao: 'aprovar', anterior: morador(), atualizado: morador({ status: 'ATIVO' }) },
    ]);
  });

  it('enquanto envia, o botão fica em carregamento e o "Cancelar" bloqueado', async () => {
    api.executar.mockReturnValue(NEVER);
    await abrir('inativar', { status: 'ATIVO' });

    await clicar('Inativar');
    botao('Cancelar')?.click();
    await fixture.whenStable();

    expect(dialogo().querySelector('button[aria-busy="true"]')?.textContent).toContain('Inativando…');
    expect(botao('Cancelar')?.getAttribute('aria-disabled')).toBe('true');
    expect(dialogo().hasAttribute('open')).toBe(true);
  });

  it('inativar: avisa que o acesso cai na hora e usa o botão de perigo', async () => {
    await abrir('inativar', { status: 'ATIVO' });

    expect(dialogo().getAttribute('role')).toBe('alertdialog');
    expect(dialogo().textContent).toContain('Ana Lima perde o acesso na hora. Você pode reativar depois.');
    expect(botao('Inativar')?.className).toContain('bg-perigo');
  });

  it('reativar: confirmação e chamada da ação', async () => {
    api.executar.mockReturnValue(of(morador({ status: 'ATIVO' })));
    await abrir('reativar', { status: 'INATIVO' });

    expect(dialogo().querySelector('h2')?.textContent?.trim()).toBe('Reativar Ana Lima?');
    await clicar('Reativar');

    expect(api.executar).toHaveBeenCalledWith('reativar', 'm1');
    expect(concluidas[0].acao).toBe('reativar');
  });

  it('recusar: diálogo com motivo, dica de auditoria e foco no campo', async () => {
    await abrir('recusar');

    expect(dialogo().getAttribute('role')).toBeNull();
    expect(dialogo().textContent).toContain('O motivo fica registrado na auditoria.');
    expect(document.activeElement).toBe(textarea());
  });

  it('recusar sem motivo: não envia, mostra o erro no campo e devolve o foco a ele', async () => {
    await abrir('recusar');
    await digitarMotivo('   ');

    await clicar('Recusar');

    expect(api.recusar).not.toHaveBeenCalled();
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    expect(dialogo().textContent).toContain('Informe o motivo.');
    expect(document.activeElement).toBe(textarea());
  });

  it('recusar com motivo: envia o texto aparado', async () => {
    api.recusar.mockReturnValue(of(morador({ status: 'RECUSADO', motivoRecusa: 'Não mora aqui.' })));
    await abrir('recusar');
    await digitarMotivo('  Não mora aqui.  ');

    await clicar('Recusar');

    expect(api.recusar).toHaveBeenCalledWith('m1', 'Não mora aqui.');
    expect(concluidas[0].atualizado.status).toBe('RECUSADO');
  });

  it('erro de validação do motivo vindo da API aparece no campo', async () => {
    api.recusar.mockReturnValue(
      throwError(() =>
        erroApi(400, 'VALIDACAO_FALHOU', 'Dados inválidos.', [{ campo: 'motivo', erros: ['Informe o motivo.'] }]),
      ),
    );
    await abrir('recusar');
    await digitarMotivo('x');

    await clicar('Recusar');

    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    expect(dialogo().textContent).toContain('Informe o motivo.');
    expect(dialogo().hasAttribute('open')).toBe(true);
  });

  it('409 de transição: fecha e pede para recarregar com a mensagem da regra', async () => {
    api.executar.mockReturnValue(
      throwError(() =>
        erroApi(409, 'TRANSICAO_MORADOR_INVALIDA', 'Esta ação não está mais disponível.', { statusAtual: 'ATIVO' }),
      ),
    );
    await abrir('aprovar');

    await clicar('Aprovar');

    expect(dialogo().hasAttribute('open')).toBe(false);
    expect(desatualizacoes).toEqual([
      'Esta ação não está mais disponível para este morador. Recarregue para ver o status atual.',
    ]);
    expect(concluidas).toEqual([]);
  });

  it('404: fecha e pede para recarregar', async () => {
    api.executar.mockReturnValue(
      throwError(() => erroApi(404, 'MORADOR_NAO_ENCONTRADO', 'Morador não encontrado.')),
    );
    await abrir('inativar', { status: 'ATIVO' });

    await clicar('Inativar');

    expect(desatualizacoes).toEqual(['Morador não encontrado.']);
  });

  it('sem conexão: mantém o diálogo aberto e mostra o erro dentro dele', async () => {
    api.executar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await abrir('aprovar');

    await clicar('Aprovar');

    const alerta = dialogo().querySelector('ui-alerta[role="alert"]');
    expect(alerta?.textContent).toContain('Sem conexão. Verifique a internet e tente de novo.');
    expect(dialogo().hasAttribute('open')).toBe(true);
    expect(botao('Aprovar')?.getAttribute('aria-busy')).toBeNull();
  });

  it('reabrir para outra ação limpa o erro e o motivo anteriores', async () => {
    api.recusar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await abrir('recusar');
    await digitarMotivo('Motivo qualquer');
    await clicar('Recusar');
    await clicar('Cancelar');

    await abrir('recusar', { id: 'm2', nome: 'Bruno Costa' });

    expect(textarea().value).toBe('');
    expect(dialogo().querySelector('ui-alerta')).toBeNull();
    expect(dialogo().querySelector('h2')?.textContent?.trim()).toBe('Recusar o cadastro de Bruno Costa?');
  });
});
