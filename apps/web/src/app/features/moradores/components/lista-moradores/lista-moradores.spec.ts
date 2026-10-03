import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoradorAdmin } from '@ocorrencias/contratos';
import { ListaMoradores, PedidoAcao } from './lista-moradores';

function morador(dados: Partial<MoradorAdmin> = {}): MoradorAdmin {
  return {
    id: 'm1',
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    bloco: 'B',
    apto: '302',
    status: 'PENDENTE',
    criadoEm: '2020-09-01T12:00:00Z',
    motivoRecusa: null,
    ...dados,
  };
}

describe('ListaMoradores', () => {
  let fixture: ComponentFixture<ListaMoradores>;
  let raiz: HTMLElement;
  let pedidos: PedidoAcao[];

  async function renderizar(itens: MoradorAdmin[], mostraStatus = false): Promise<void> {
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('legenda', 'Cadastros pendentes');
    fixture.componentRef.setInput('mostraStatus', mostraStatus);
    await fixture.whenStable();
  }

  const cartao = (id = 'm1') => raiz.querySelector(`ul [data-morador="${id}"]`) as HTMLElement;
  const linha = (id = 'm1') => raiz.querySelector(`tbody [data-morador="${id}"]`) as HTMLElement;
  const botoes = (dentro: HTMLElement) =>
    [...dentro.querySelectorAll<HTMLButtonElement>('button')].map((b) => b.textContent?.replace(/\s+/g, ' ').trim());
  const botao = (dentro: HTMLElement, inicio: string) =>
    [...dentro.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.trim().startsWith(inicio),
    ) as HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListaMoradores);
    raiz = fixture.nativeElement as HTMLElement;
    pedidos = [];
    fixture.componentInstance.acao.subscribe((pedido) => pedidos.push(pedido));
  });

  it('mostra nome, unidade, telefone formatado com link tel: e a data do cadastro', async () => {
    await renderizar([morador()]);

    const item = cartao();
    const telefone = item.querySelector('a') as HTMLAnchorElement;
    const data = item.querySelector('time') as HTMLTimeElement;

    expect(item.querySelector('h2')?.textContent?.trim()).toBe('Ana Lima');
    expect(item.textContent).toContain('Bloco B, apto 302');
    expect(telefone.textContent?.trim()).toBe('(11) 91234-5678');
    expect(telefone.getAttribute('href')).toBe('tel:+5511912345678');
    expect(data.getAttribute('datetime')).toBe('2020-09-01T12:00:00Z');
    expect(data.textContent?.trim()).toBe('01/09/2020');
    expect(data.getAttribute('title')).toBe('01/09/2020 às 09:00');
  });

  it('a tabela tem legenda, cabeçalhos de coluna e o nome como cabeçalho da linha', async () => {
    await renderizar([morador()]);

    const cabecalhos = [...raiz.querySelectorAll('thead th')].map((th) => th.textContent?.trim());

    expect(raiz.querySelector('caption')?.textContent?.trim()).toBe('Cadastros pendentes');
    expect(cabecalhos).toEqual(['Morador', 'Unidade', 'Telefone', 'Cadastro', 'Ações']);
    expect(linha().querySelector('th[scope="row"]')?.textContent).toContain('Ana Lima');
  });

  it('pendente: "Aprovar" e "Recusar" com o nome para o leitor de tela', async () => {
    await renderizar([morador()]);

    expect(botoes(cartao())).toEqual(['Aprovar Ana Lima', 'Recusar Ana Lima']);
    expect(botoes(linha())).toEqual(['Aprovar Ana Lima', 'Recusar Ana Lima']);

    botao(cartao(), 'Aprovar').click();
    botao(linha(), 'Recusar').click();

    expect(pedidos.map((p) => [p.acao, p.morador.id])).toEqual([
      ['aprovar', 'm1'],
      ['recusar', 'm1'],
    ]);
  });

  it('ativo: só o menu "Mais ações", que oferece "Inativar"', async () => {
    await renderizar([morador({ status: 'ATIVO' })]);

    const menu = cartao().querySelector('button[aria-label="Mais ações para Ana Lima"]') as HTMLButtonElement;
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(botao(cartao(), 'Aprovar')).toBeUndefined();

    menu.click();
    await fixture.whenStable();
    botao(cartao(), 'Inativar').click();

    expect(pedidos).toEqual([{ acao: 'inativar', morador: morador({ status: 'ATIVO' }) }]);
  });

  it('inativo: "Reativar" e o badge de status quando a aba pede', async () => {
    await renderizar([morador({ status: 'INATIVO' })], true);

    expect(botoes(cartao())).toEqual(['Reativar Ana Lima']);
    expect(cartao().querySelector('ui-badge-status-usuario')?.textContent?.trim()).toBe('Inativo');
    expect([...raiz.querySelectorAll('thead th')].map((th) => th.textContent?.trim())).toContain('Situação');

    botao(linha(), 'Reativar').click();
    expect(pedidos[0].acao).toBe('reativar');
  });

  it('recusado: só leitura, com o motivo e o badge', async () => {
    await renderizar([morador({ status: 'RECUSADO', motivoRecusa: 'Apartamento não existe.' })], true);

    expect(botoes(cartao())).toEqual([]);
    expect(botoes(linha())).toEqual([]);
    expect(cartao().textContent).toContain('Motivo da recusa: Apartamento não existe.');
    expect(linha().textContent).toContain('Motivo da recusa: Apartamento não existe.');
    expect(cartao().querySelector('ui-badge-status-usuario')?.textContent?.trim()).toBe('Recusado');
  });

  it('sem o pedido da aba, não mostra o badge de status', async () => {
    await renderizar([morador()]);

    expect(raiz.querySelector('ui-badge-status-usuario')).toBeNull();
  });

  it('sem bloco nem apto, a tabela mostra traço e o card omite a linha', async () => {
    await renderizar([morador({ bloco: null, apto: null })]);

    expect(cartao().querySelectorAll('p')[0].textContent).not.toContain('Bloco');
    expect(linha().querySelectorAll('td')[0].textContent?.trim()).toBe('—');
  });

  it('focarItem leva o foco ao nome do morador pedido', async () => {
    await renderizar([morador(), morador({ id: 'm2', nome: 'Bruno Costa' })]);
    document.body.appendChild(raiz);

    const achou = fixture.componentInstance.focarItem('m2');

    expect(achou).toBe(true);
    expect(document.activeElement?.textContent?.trim()).toBe('Bruno Costa');
    expect(fixture.componentInstance.focarItem('inexistente')).toBe(false);
    raiz.remove();
  });
});
