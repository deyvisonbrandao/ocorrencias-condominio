import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CelularBr,
  EmailOpcional,
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

  it('limita o tamanho do texto', () => {
    expect(
      validar({ nome: 'Ana Maria', telefone: '11912345678', senha: '12345678' })
        .erros['nome'],
    ).toEqual(['Use no máximo 5 caracteres.']);
  });
});
