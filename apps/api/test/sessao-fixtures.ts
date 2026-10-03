import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { gerarHashSenha } from '../src/core/auth/senha.js';
import { prismaDeTeste } from './banco.js';

export const SENHA = 'senha-forte-123';

let hashSenha: string | undefined;

export interface CondominioDeTeste {
  id: string;
  slug: string;
  nome: string;
}

export async function criarCondominio(
  slug: string,
  status: 'ATIVO' | 'INATIVO' = 'ATIVO',
): Promise<CondominioDeTeste> {
  return prismaDeTeste().condominio.create({
    data: { nome: `Condomínio ${slug}`, slug, status },
    select: { id: true, slug: true, nome: true },
  });
}

export async function criarUsuario(
  condominioId: string,
  dados: {
    telefone: string;
    papel?: 'SINDICO' | 'SUBSINDICO' | 'MORADOR';
    status?: 'PENDENTE' | 'ATIVO' | 'RECUSADO' | 'INATIVO';
    nome?: string;
    senhaTemporaria?: boolean;
    bloco?: string;
    apto?: string;
    criadoEm?: Date;
  },
): Promise<{ id: string }> {
  hashSenha ??= await gerarHashSenha(SENHA);
  const papel = dados.papel ?? 'MORADOR';
  return prismaDeTeste().usuario.create({
    data: {
      condominioId,
      nome: dados.nome ?? `${papel} ${dados.telefone}`,
      telefone: dados.telefone,
      senhaHash: hashSenha,
      papel,
      status: dados.status ?? 'ATIVO',
      senhaTemporaria: dados.senhaTemporaria ?? false,
      bloco: dados.bloco ?? null,
      apto: dados.apto ?? null,
      ...(dados.criadoEm ? { criadoEm: dados.criadoEm } : {}),
      slotAdmin: papel === 'SINDICO' ? 1 : papel === 'SUBSINDICO' ? 2 : null,
    },
    select: { id: true },
  });
}

export function cookieDaSessao(setCookie: string[] | string | undefined) {
  const linhas = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  const linha = linhas.find((l) => l.startsWith('sessao='));
  if (!linha) throw new Error('login não definiu o cookie de sessão');
  return linha.split(';')[0];
}

export async function entrar(
  app: INestApplication<App>,
  slug: string,
  telefone: string,
  senha = SENHA,
): Promise<string> {
  const resposta = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ slug, telefone, senha })
    .expect(200);
  return cookieDaSessao(resposta.headers['set-cookie']);
}
