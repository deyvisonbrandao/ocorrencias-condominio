import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { restaurarDialogoNativo, simularDialogoNativo } from '../../../testes/dialogo-nativo';
import { SessaoService } from '../../core/services/sessao.service';
import { Perfil } from './perfil';

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;
  let raiz: HTMLElement;
  const sessao = {
    saindo: signal(false),
    erroAoSair: signal<string | null>(null),
    sair: vi.fn(),
    descartarErroAoSair: vi.fn(),
  };

  const dialogo = () => raiz.querySelector('dialog') as HTMLDialogElement;
  const botao = (dentro: ParentNode, rotulo: string) =>
    [...dentro.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === rotulo,
    ) as HTMLButtonElement;

  async function abrirConfirmacao(): Promise<void> {
    botao(raiz, 'Sair').click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    simularDialogoNativo();
    sessao.saindo.set(false);
    sessao.erroAoSair.set(null);
    sessao.sair.mockReset();
    sessao.descartarErroAoSair.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: SessaoService, useValue: sessao }] });
    fixture = TestBed.createComponent(Perfil);
    raiz = fixture.nativeElement as HTMLElement;
    document.body.appendChild(raiz);
    await fixture.whenStable();
  });

  afterEach(() => {
    raiz.remove();
    restaurarDialogoNativo();
  });

  it('"Sair" pede confirmação, com foco em "Cancelar", sem sair ainda', async () => {
    await abrirConfirmacao();

    expect(dialogo().hasAttribute('open')).toBe(true);
    expect(dialogo().getAttribute('role')).toBe('alertdialog');
    expect(document.activeElement).toBe(botao(dialogo(), 'Cancelar'));
    expect(sessao.sair).not.toHaveBeenCalled();
  });

  it('confirmar encerra a sessão', async () => {
    await abrirConfirmacao();

    botao(dialogo(), 'Sair').click();

    expect(sessao.sair).toHaveBeenCalledTimes(1);
  });

  it('cancelar fecha sem sair e descarta erro anterior', async () => {
    await abrirConfirmacao();

    botao(dialogo(), 'Cancelar').click();
    await fixture.whenStable();

    expect(dialogo().hasAttribute('open')).toBe(false);
    expect(sessao.sair).not.toHaveBeenCalled();
    expect(sessao.descartarErroAoSair).toHaveBeenCalled();
  });

  it('falha ao sair: mostra o erro dentro da confirmação', async () => {
    await abrirConfirmacao();
    sessao.erroAoSair.set('Sem conexão. Verifique a internet e tente de novo.');
    await fixture.whenStable();

    expect(dialogo().querySelector('ui-alerta[role="alert"]')?.textContent).toContain('Sem conexão');
  });
});
