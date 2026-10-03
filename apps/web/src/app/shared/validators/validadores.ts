import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizarCelularBr, REGRAS_EMAIL, REGRAS_SENHA } from '@ocorrencias/contratos';

export type Regra = (valor: string) => string | null;

export const CHAVE_MENSAGEM = 'mensagem';

export const MENSAGEM_CELULAR = 'Informe um celular com DDD, como (11) 91234-5678.';
export const MENSAGEM_EMAIL = 'Confira o e-mail.';
export const MENSAGEM_SENHA_CURTA = `A senha precisa ter pelo menos ${REGRAS_SENHA.min} caracteres.`;
export const MENSAGEM_SENHA_LONGA = `A senha pode ter no máximo ${REGRAS_SENHA.max} caracteres.`;
export const MENSAGEM_ACEITE =
  'Para continuar, aceite os termos de uso e a política de privacidade.';

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCom(...regras: readonly Regra[]): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    const valor = typeof controle.value === 'string' ? controle.value : '';
    for (const regra of regras) {
      const mensagem = regra(valor);
      if (mensagem) {
        return { [CHAVE_MENSAGEM]: mensagem };
      }
    }
    return null;
  };
}

export function mensagemDeErro(controle: AbstractControl | null): string | null {
  const mensagem: unknown = controle?.errors?.[CHAVE_MENSAGEM];
  return typeof mensagem === 'string' ? mensagem : null;
}

export function obrigatorio(mensagem: string): Regra {
  return (valor) => (valor.trim() === '' ? mensagem : null);
}

export function maximo(max: number, normalizar = (valor: string) => valor.trim()): Regra {
  return (valor) => (normalizar(valor).length > max ? `Use no máximo ${max} caracteres.` : null);
}

export const celularBr: Regra = (valor) =>
  normalizarCelularBr(valor) === null ? MENSAGEM_CELULAR : null;

export const emailOpcional: Regra = (valor) => {
  const email = valor.trim();
  if (email === '') {
    return null;
  }
  return FORMATO_EMAIL.test(email) && email.length <= REGRAS_EMAIL.max ? null : MENSAGEM_EMAIL;
};

export const senha: Regra = (valor) => {
  if (valor.length < REGRAS_SENHA.min) {
    return MENSAGEM_SENHA_CURTA;
  }
  return valor.length > REGRAS_SENHA.max ? MENSAGEM_SENHA_LONGA : null;
};

export const aceiteObrigatorio: ValidatorFn = (controle) =>
  controle.value === true ? null : { [CHAVE_MENSAGEM]: MENSAGEM_ACEITE };
