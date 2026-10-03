import { FormControl } from '@angular/forms';
import {
  aceiteObrigatorio,
  celularBr,
  emailOpcional,
  maximo,
  MENSAGEM_ACEITE,
  MENSAGEM_CELULAR,
  MENSAGEM_EMAIL,
  MENSAGEM_SENHA_CURTA,
  MENSAGEM_SENHA_LONGA,
  mensagemDeErro,
  obrigatorio,
  senha,
  validarCom,
} from './validadores';

describe('validadores', () => {
  describe('validarCom', () => {
    const validador = validarCom(obrigatorio('Informe seu nome.'), maximo(5));

    it('devolve a mensagem da primeira regra que falha', () => {
      expect(mensagemDeErro(new FormControl('   ', { validators: validador }))).toBe(
        'Informe seu nome.',
      );
      expect(mensagemDeErro(new FormControl('Mariana', { validators: validador }))).toBe(
        'Use no máximo 5 caracteres.',
      );
    });

    it('aceita valor que passa em todas as regras', () => {
      expect(new FormControl('Ana', { validators: validador }).valid).toBe(true);
    });

    it('trata valor que não é texto como vazio', () => {
      expect(mensagemDeErro(new FormControl(null, { validators: validador }))).toBe(
        'Informe seu nome.',
      );
    });
  });

  it('mensagemDeErro devolve null sem controle ou sem erro', () => {
    expect(mensagemDeErro(null)).toBeNull();
    expect(mensagemDeErro(new FormControl('ok'))).toBeNull();
  });

  describe('celularBr', () => {
    it.each(['(11) 91234-5678', '11912345678', '+55 11 91234-5678'])('aceita "%s"', (valor) => {
      expect(celularBr(valor)).toBeNull();
    });

    it.each(['', '(11) 1234-5678', '(11) 81234-5678', '(10) 91234-5678', '(11) 91234-567'])(
      'rejeita "%s"',
      (valor) => {
        expect(celularBr(valor)).toBe(MENSAGEM_CELULAR);
      },
    );
  });

  describe('emailOpcional', () => {
    it.each(['', '   ', 'ana@exemplo.com', ' ana@exemplo.com.br '])('aceita "%s"', (valor) => {
      expect(emailOpcional(valor)).toBeNull();
    });

    it.each(['ana', 'ana@', 'ana@exemplo', 'ana @exemplo.com', `${'a'.repeat(250)}@x.com`])(
      'rejeita "%s"',
      (valor) => {
        expect(emailOpcional(valor)).toBe(MENSAGEM_EMAIL);
      },
    );
  });

  describe('senha', () => {
    it('exige pelo menos 8 caracteres', () => {
      expect(senha('1234567')).toBe(MENSAGEM_SENHA_CURTA);
      expect(senha('12345678')).toBeNull();
    });

    it('limita a 128 caracteres', () => {
      expect(senha('a'.repeat(128))).toBeNull();
      expect(senha('a'.repeat(129))).toBe(MENSAGEM_SENHA_LONGA);
    });
  });

  describe('aceiteObrigatorio', () => {
    it('só passa com a caixa marcada', () => {
      expect(mensagemDeErro(new FormControl(false, { validators: aceiteObrigatorio }))).toBe(
        MENSAGEM_ACEITE,
      );
      expect(new FormControl(true, { validators: aceiteObrigatorio }).valid).toBe(true);
    });
  });
});
