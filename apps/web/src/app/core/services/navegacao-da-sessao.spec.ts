import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Papel, UsuarioSessao } from '@ocorrencias/contratos';
import { destinoAposLogin, rotaDoLogin, rotaInterna } from './navegacao-da-sessao';

function usuario(papel: Papel, senhaTemporaria = false): UsuarioSessao {
  return {
    nome: 'Ana Lima',
    telefone: '+5511912345678',
    papel,
    status: 'ATIVO',
    senhaTemporaria,
    condominio: { nome: 'Jardim', slug: 'jardim' },
  };
}

describe('navegação da sessão', () => {
  describe('destinoAposLogin', () => {
    it.each<[Papel, string]>([
      ['SINDICO', '/admin/painel'],
      ['SUBSINDICO', '/admin/painel'],
      ['MORADOR', '/app/ocorrencias'],
    ])('sem voltar, %s vai para %s', (papel, destino) => {
      expect(destinoAposLogin(usuario(papel), null)).toBe(destino);
    });

    it('voltar interno da área do papel tem prioridade', () => {
      expect(destinoAposLogin(usuario('SINDICO'), '/admin/ocorrencias?visao=atrasadas')).toBe(
        '/admin/ocorrencias?visao=atrasadas',
      );
      expect(destinoAposLogin(usuario('MORADOR'), '/app/minhas')).toBe('/app/minhas');
    });

    it.each([
      '//evil.com/admin',
      'https://evil.com/admin',
      'javascript:alert(1)',
      '/\\evil.com',
      '/admin/painel\n',
      'admin/painel',
      '/administrador',
      '/app/ocorrencias',
      '/c/outro/entrar',
    ])('ignora voltar "%s" inválido ou de outra área', (voltar) => {
      expect(destinoAposLogin(usuario('SINDICO'), voltar)).toBe('/admin/painel');
    });

    it('senha temporária vai para a troca de senha, mesmo com voltar válido', () => {
      expect(destinoAposLogin(usuario('MORADOR', true), '/app/minhas')).toBe('/trocar-senha');
    });
  });

  it.each([
    ['/admin', true],
    ['/app/ocorrencias/57', true],
    ['//x', false],
    ['http://x', false],
    ['', false],
  ])('rotaInterna("%s") = %s', (url, esperado) => {
    expect(rotaInterna(url)).toBe(esperado);
  });

  describe('rotaDoLogin', () => {
    let router: Router;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      router = TestBed.inject(Router);
    });

    it('leva ao login do condomínio com o voltar na query', () => {
      expect(router.serializeUrl(rotaDoLogin(router, 'jardim', '/admin/painel'))).toBe(
        '/c/jardim/entrar?voltar=%2Fadmin%2Fpainel',
      );
    });

    it('sem voltar, não põe query', () => {
      expect(router.serializeUrl(rotaDoLogin(router, 'jardim'))).toBe('/c/jardim/entrar');
    });

    it('sem condomínio conhecido, cai na landing', () => {
      expect(router.serializeUrl(rotaDoLogin(router, null, '/admin/painel'))).toBe('/');
    });
  });
});
