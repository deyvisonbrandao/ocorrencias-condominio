import {
  normalizarApto,
  normalizarBloco,
  REGRAS_APTO,
  REGRAS_BLOCO,
} from '@ocorrencias/contratos';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  AptoObrigatorio,
  BlocoObrigatorio,
  CelularBr,
  EmailOpcional,
  MENSAGEM_APTO,
  MENSAGEM_BLOCO,
  MENSAGEM_CELULAR,
  MENSAGEM_EMAIL,
  MENSAGEM_SENHA,
  SenhaNova,
  TextoObrigatorio,
} from './campos-pessoa.js';

class Pessoa {
  @TextoObrigatorio(5, 'Informe seu nome.')
  nome!: string;

  @CelularBr()
  telefone!: string;

  @EmailOpcional()
  email?: string;

  @SenhaNova()
  senha!: string;
}

function validar(dados: Record<string, unknown>) {
  const pessoa = plainToInstance(Pessoa, dados);
  const erros = Object.fromEntries(
    validateSync(pessoa).map((e) => [
      e.property,
      Object.values(e.constraints ?? {}),
    ]),
  );
  return { pessoa, erros };
}

describe('validadores de campos de pessoa', () => {
  it('normaliza nome, celular e e-mail', () => {
    const { pessoa, erros } = validar({
      nome: '  Ana ',
      telefone: '(11) 91234-5678',
      email: ' Ana@Exemplo.COM ',
      senha: '12345678',
    });

    expect(erros).toEqual({});
    expect(pessoa).toMatchObject({
      nome: 'Ana',
      telefone: '+5511912345678',
      email: 'ana@exemplo.com',
    });
  });

  it('trata e-mail vazio como ausente', () => {
    const { pessoa, erros } = validar({
      nome: 'Ana',
      telefone: '11912345678',
      email: '   ',
      senha: '12345678',
    });

    expect(erros).toEqual({});
    expect(pessoa.email).toBeUndefined();
  });

  it('usa as mensagens da especificação de UI', () => {
    const { erros } = validar({
      nome: '   ',
      telefone: '(11) 3123-4567',
      email: 'ana@',
      senha: '1234567',
    });

    expect(erros['nome']).toContain('Informe seu nome.');
    expect(erros['telefone']).toEqual([MENSAGEM_CELULAR]);
    expect(erros['email']).toContain(MENSAGEM_EMAIL);
    expect(erros['senha']).toContain(MENSAGEM_SENHA);
  });

  it.each(['+5523912345678', '+5539912345678', '(23) 91234-5678'])(
    'recusa celular com DDD inexistente, em qualquer formato: %s',
    (telefone) => {
      expect(
        validar({ nome: 'Ana', telefone, senha: '12345678' }).erros['telefone'],
      ).toEqual([MENSAGEM_CELULAR]);
    },
  );

  it('limita o tamanho do texto', () => {
    expect(
      validar({ nome: 'Ana Maria', telefone: '11912345678', senha: '12345678' })
        .erros['nome'],
    ).toEqual(['Use no máximo 5 caracteres.']);
  });
});

class Unidade {
  @BlocoObrigatorio()
  bloco!: string;

  @AptoObrigatorio()
  apto!: string;
}

function validarUnidade(dados: Record<string, unknown>) {
  const unidade = plainToInstance(Unidade, dados);
  const erros = Object.fromEntries(
    validateSync(unidade).map((e) => [
      e.property,
      Object.values(e.constraints ?? {}),
    ]),
  );
  return { unidade, erros };
}

describe('normalização de bloco e apto', () => {
  it.each([
    ['B', 'B'],
    ['b', 'B'],
    ['  Bloco   b ', 'B'],
    ['BLOCO B', 'B'],
    ['bloco-c', 'C'],
    ['Bloco: 2', '2'],
    ['Bl. 3', '3'],
    ['bl 4', '4'],
    ['bl5', '5'],
    ['Torre 2', 'TORRE 2'],
    ['Bloco Torre Sul', 'TORRE SUL'],
    ['Blue', 'BLUE'],
    ['Bloco', 'BLOCO'],
    ['a1', 'A1'],
    ['Bloco nº 3', '3'],
    ['Bl. Nº 4', '4'],
    ['bloco n° 5', '5'],
    ['Bloco no. 6', '6'],
    ['nº 7', '7'],
    ['Bloco Norte', 'NORTE'],
    ['Nova Torre', 'NOVA TORRE'],
    ['No', 'NO'],
  ])('bloco %j -> %j', (entrada, esperado) => {
    expect(normalizarBloco(entrada)).toBe(esperado);
  });

  it.each([
    ['302', '302'],
    ['Apto 302', '302'],
    ['apto. 302a', '302A'],
    ['AP 12', '12'],
    ['ap12', '12'],
    ['Apartamento 101', '101'],
    ['apt-7', '7'],
    ['Casa 3', 'CASA 3'],
    ['Apto', 'APTO'],
    ['Apto nº 302', '302'],
    ['Apto. Nº 302', '302'],
    ['apto n.º 302', '302'],
    ['Apto Nº302', '302'],
    ['ap no 12', '12'],
    ['Apartamento N° 101', '101'],
    ['nº 302', '302'],
    ['Nº', 'Nº'],
    ['Norte 1', 'NORTE 1'],
  ])('apto %j -> %j', (entrada, esperado) => {
    expect(normalizarApto(entrada)).toBe(esperado);
  });
});

describe('validadores de bloco e apto', () => {
  it('normaliza antes de validar', () => {
    const { unidade, erros } = validarUnidade({
      bloco: ' Bloco b ',
      apto: 'Apto 302',
    });
    expect(erros).toEqual({});
    expect(unidade).toEqual({ bloco: 'B', apto: '302' });
  });

  it.each([
    ['vazios', { bloco: '   ', apto: '' }],
    ['ausentes', {}],
    ['fora do tipo', { bloco: 2, apto: null }],
  ])('campos %s: mensagens da especificação de UI', (_, dados) => {
    const { erros } = validarUnidade(dados);
    expect(erros['bloco']).toContain(MENSAGEM_BLOCO);
    expect(erros['apto']).toContain(MENSAGEM_APTO);
  });

  it(`limita o bloco a ${REGRAS_BLOCO.max} e o apto a ${REGRAS_APTO.max} caracteres, depois do prefixo`, () => {
    expect(
      validarUnidade({
        bloco: `Bloco ${'X'.repeat(REGRAS_BLOCO.max)}`,
        apto: `Apto ${'1'.repeat(REGRAS_APTO.max)}`,
      }).erros,
    ).toEqual({});

    const { erros } = validarUnidade({
      bloco: 'X'.repeat(REGRAS_BLOCO.max + 1),
      apto: '1'.repeat(REGRAS_APTO.max + 1),
    });
    expect(erros['bloco']).toEqual([
      `Use no máximo ${REGRAS_BLOCO.max} caracteres.`,
    ]);
    expect(erros['apto']).toEqual([
      `Use no máximo ${REGRAS_APTO.max} caracteres.`,
    ]);
  });
});
