import {
  Controller,
  Get,
  HttpStatus,
  type INestApplication,
  Param,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { Papeis } from '../src/core/auth/decoradores.js';
import { ErroApi } from '../src/core/http/erro-api.js';
import {
  InjetarPrismaEscopado,
  type PrismaEscopado,
} from '../src/core/prisma/prisma-escopado.js';
import { limparBanco } from './banco.js';
import { criarApp } from './criar-app.js';
import {
  type CondominioDeTeste,
  criarCondominio,
  criarUsuario,
  entrar,
} from './sessao-fixtures.js';

// Recurso por id ainda não existe na API (ocorrências chegam na #13). Este controller de teste passa pelo guard
// real e lê pelo PrismaEscopado, como fará qualquer rota /admin/<recurso>/:id.
@Papeis('SINDICO', 'SUBSINDICO')
@Controller('admin/teste-isolamento/usuarios')
class UsuarioPorIdController {
  constructor(
    @InjetarPrismaEscopado() private readonly prisma: PrismaEscopado,
  ) {}

  @Get(':id')
  async buscar(@Param('id') id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true },
    });
    if (!usuario) {
      throw new ErroApi(
        HttpStatus.NOT_FOUND,
        'NAO_ENCONTRADO',
        'Recurso não encontrado.',
      );
    }
    return usuario;
  }
}

const TELEFONE = '+5511922220001';

describe('isolamento entre condomínios pela sessão (e2e)', () => {
  let app: INestApplication<App>;
  let a: CondominioDeTeste;
  let b: CondominioDeTeste;
  let sindicoA: string;
  let sindicoB: string;
  let moradorB: string;
  let cookieA: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await criarApp({ controllers: [UsuarioPorIdController] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limparBanco();
    a = await criarCondominio('cond-a');
    b = await criarCondominio('cond-b');
    // Mesmo telefone nos dois condomínios (ADR-002): o slug decide em qual conta se entra.
    sindicoA = (
      await criarUsuario(a.id, {
        telefone: TELEFONE,
        papel: 'SINDICO',
        nome: 'Síndico A',
      })
    ).id;
    sindicoB = (
      await criarUsuario(b.id, {
        telefone: TELEFONE,
        papel: 'SINDICO',
        nome: 'Síndico B',
      })
    ).id;
    moradorB = (await criarUsuario(b.id, { telefone: '+5511922220002' })).id;
    cookieA = await entrar(app, 'cond-a', TELEFONE);
  });

  it('com sessão de A, recurso de B responde 404 igual a id inexistente', async () => {
    const deB = await http()
      .get(`/api/v1/admin/teste-isolamento/usuarios/${moradorB}`)
      .set('Cookie', cookieA)
      .expect(404);
    const inexistente = await http()
      .get(
        '/api/v1/admin/teste-isolamento/usuarios/0199a5c2-0000-7000-8000-000000000000',
      )
      .set('Cookie', cookieA)
      .expect(404);

    expect(deB.body).toEqual(inexistente.body);
    await http()
      .get(`/api/v1/admin/teste-isolamento/usuarios/${sindicoB}`)
      .set('Cookie', cookieA)
      .expect(404);
    await http()
      .get(`/api/v1/admin/teste-isolamento/usuarios/${sindicoA}`)
      .set('Cookie', cookieA)
      .expect(200, { id: sindicoA, nome: 'Síndico A' });
  });

  it('/me e /admin/painel só enxergam o condomínio do token', async () => {
    const me = await http()
      .get('/api/v1/me')
      .set('Cookie', cookieA)
      .expect(200);
    expect(me.body).toMatchObject({
      nome: 'Síndico A',
      condominio: { slug: 'cond-a' },
    });

    const painel = await http()
      .get('/api/v1/admin/painel')
      .set('Cookie', cookieA)
      .expect(200);
    expect(painel.body).toEqual({
      condominio: { nome: 'Condomínio cond-a', slug: 'cond-a' },
    });
  });

  it('o mesmo telefone entra em B só pelo slug de B, com sessão separada', async () => {
    const cookieB = await entrar(app, 'cond-b', TELEFONE);

    await http()
      .get(`/api/v1/admin/teste-isolamento/usuarios/${moradorB}`)
      .set('Cookie', cookieB)
      .expect(200);
    const me = await http()
      .get('/api/v1/me')
      .set('Cookie', cookieB)
      .expect(200);
    expect(me.body.condominio.slug).toBe('cond-b');
  });

  it('requisições simultâneas de A e B não trocam de condomínio', async () => {
    const cookieB = await entrar(app, 'cond-b', TELEFONE);
    const respostas = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        http()
          .get('/api/v1/admin/painel')
          .set('Cookie', i % 2 === 0 ? cookieA : cookieB),
      ),
    );

    respostas.forEach((resposta, i) => {
      expect(resposta.body.condominio.slug).toBe(
        i % 2 === 0 ? 'cond-a' : 'cond-b',
      );
    });
  });
});
