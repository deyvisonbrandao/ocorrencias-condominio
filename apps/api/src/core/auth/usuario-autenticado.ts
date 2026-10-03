import type { Papel } from '@ocorrencias/contratos';
import type { Request } from 'express';

export interface UsuarioAutenticado {
  id: string;
  condominioId: string;
  papel: Papel;
}

export type RequisicaoAutenticada = Request & { usuario?: UsuarioAutenticado };

export const CHAVE_PUBLICO = 'auth:publico';
export const CHAVE_PAPEIS = 'auth:papeis';
