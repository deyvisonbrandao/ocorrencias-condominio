import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Prisma } from '../../generated/prisma/client.js';
import {
  CAMPO_CONDOMINIO,
  type Classificacao,
  CLASSIFICACAO_MODELOS,
} from './classificacao-modelos.js';

// O client gerado do Prisma 7 não expõe fields/references das relações, e @prisma/internals seria dependência
// pesada só para isto. O schema é formatado pelo `prisma format`, então ler o texto é estável.
const SCHEMA = fileURLToPath(
  new URL('../../../prisma/schema.prisma', import.meta.url),
);

interface CampoRelacao {
  modelo: string;
  campo: string;
  alvo: string;
  lista: boolean;
  nomeRelacao?: string;
  fields?: string[];
  references?: string[];
}

function listaDe(atributos: string, chave: string): string[] | undefined {
  const achado = new RegExp(`${chave}:\\s*\\[([^\\]]*)\\]`).exec(atributos);
  return achado?.[1]
    .split(',')
    .map((nome) => nome.trim())
    .filter(Boolean);
}

function lerRelacoes(schema: string): {
  modelos: string[];
  relacoes: CampoRelacao[];
} {
  const semComentarios = schema.replace(/\/\/.*$/gm, '');
  const blocos = [
    ...semComentarios.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm),
  ];
  const modelos = blocos.map(([, nome]) => nome);
  const relacoes: CampoRelacao[] = [];

  for (const [, modelo, corpo] of blocos) {
    for (const linha of corpo.split('\n').map((l) => l.trim())) {
      const campo = /^(\w+)\s+(\w+)(\[\]|\?)?\s*(.*)$/.exec(linha);
      if (!campo || linha.startsWith('@@')) continue;
      const [, nome, tipo, modificador, atributos] = campo;
      if (!modelos.includes(tipo)) continue;
      const relacao = /@relation\(([^)]*)\)/.exec(atributos)?.[1] ?? '';
      relacoes.push({
        modelo,
        campo: nome,
        alvo: tipo,
        lista: modificador === '[]',
        nomeRelacao: /^\s*(?:name:\s*)?"([^"]+)"/.exec(relacao)?.[1],
        fields: listaDe(relacao, 'fields'),
        references: listaDe(relacao, 'references'),
      });
    }
  }
  return { modelos, relacoes };
}

function chaveDoCondominio(
  classificacao: Exclude<Classificacao, 'global'>,
): string {
  return classificacao === 'raiz' ? 'id' : CAMPO_CONDOMINIO;
}

function problemasDeRelacao(
  schema: string,
  classificacao: Record<string, Classificacao | undefined>,
): string[] {
  const { relacoes } = lerRelacoes(schema);
  const problemas: string[] = [];

  for (const r of relacoes) {
    const origem = classificacao[r.modelo];
    const alvo = classificacao[r.alvo];
    const nome = `${r.modelo}.${r.campo}`;
    if (origem === undefined || alvo === undefined) {
      problemas.push(`${nome}: modelo sem classificação`);
      continue;
    }
    if (origem === 'global' && alvo === 'global') continue;
    if (origem === 'global' || alvo === 'global') {
      problemas.push(
        `${nome}: modelo global não pode se relacionar com modelo de condomínio`,
      );
      continue;
    }

    if (r.lista) {
      const volta = relacoes.find(
        (v) =>
          v.modelo === r.alvo &&
          v.alvo === r.modelo &&
          v.nomeRelacao === r.nomeRelacao &&
          v !== r,
      );
      if (volta?.lista) {
        problemas.push(
          `${nome}: muitos-para-muitos implícito cria tabela sem condominio_id`,
        );
      }
    }
    if (!r.fields) continue;

    const posicao = r.fields.indexOf(chaveDoCondominio(origem));
    if (posicao === -1 || r.references?.[posicao] !== chaveDoCondominio(alvo)) {
      problemas.push(
        `${nome}: a FK precisa ligar ${chaveDoCondominio(origem)} a ${r.alvo}.${chaveDoCondominio(alvo)} (FK composta, ADR-001)`,
      );
    }
  }
  return problemas;
}

describe('relações entre modelos de condomínio (FK composta)', () => {
  const schema = readFileSync(SCHEMA, 'utf8');

  it('o leitor do schema enxerga os mesmos modelos do client gerado', () => {
    expect(lerRelacoes(schema).modelos.sort()).toEqual(
      (Object.values(Prisma.ModelName) as string[]).sort(),
    );
  });

  it('o leitor do schema extrai fields e references das relações', () => {
    expect(
      lerRelacoes(schema).relacoes.find(
        (r) => r.modelo === 'AuditoriaAdmin' && r.campo === 'ator',
      ),
    ).toMatchObject({
      alvo: 'Usuario',
      nomeRelacao: 'AuditoriaAtor',
      fields: ['condominioId', 'atorId'],
      references: ['condominioId', 'id'],
    });
  });

  it('toda relação do schema respeita o isolamento', () => {
    expect(problemasDeRelacao(schema, CLASSIFICACAO_MODELOS)).toEqual([]);
  });

  describe('a regra recusa', () => {
    const classificacao: Record<string, Classificacao> = {
      Condominio: 'raiz',
      Usuario: 'escopado',
      Ocorrencia: 'escopado',
      Plano: 'global',
    };
    const base = `
model Condominio {
  id String @id
}
model Usuario {
  id           String @id
  condominioId String
  @@unique([condominioId, id])
}
model Plano {
  id String @id
}
`;

    it('FK simples entre dois modelos escopados', () => {
      const ruim = `${base}
model Ocorrencia {
  id           String  @id
  condominioId String
  autorId      String
  autor        Usuario @relation(fields: [autorId], references: [id])
}`;
      expect(problemasDeRelacao(ruim, classificacao)).toEqual([
        expect.stringMatching(/^Ocorrencia\.autor: a FK precisa ligar/),
      ]);
    });

    it('condominioId ligado a outra coluna do alvo', () => {
      const ruim = `${base}
model Ocorrencia {
  id           String  @id
  condominioId String
  autorId      String
  autor        Usuario @relation(fields: [autorId, condominioId], references: [condominioId, id])
}`;
      expect(problemasDeRelacao(ruim, classificacao)).toHaveLength(1);
    });

    it('modelo escopado ligado ao Condominio por outra coluna', () => {
      const ruim = `${base}
model Ocorrencia {
  id           String     @id
  condominioId String
  outroId      String
  condominio   Condominio @relation(fields: [outroId], references: [id])
}`;
      expect(problemasDeRelacao(ruim, classificacao)).toHaveLength(1);
    });

    it('Condominio apontando para escopado sem passar pelo próprio id', () => {
      const ruim = base.replace(
        'model Condominio {\n  id String @id\n}',
        `model Condominio {
  id        String  @id
  sindicoId String
  sindico   Usuario @relation(fields: [sindicoId], references: [id])
}`,
      );
      expect(problemasDeRelacao(ruim, classificacao)).toEqual([
        expect.stringMatching(/^Condominio\.sindico: /),
      ]);
    });

    it('modelo global relacionado a modelo de condomínio, nos dois sentidos', () => {
      const ruim = `${base}
model Ocorrencia {
  id           String @id
  condominioId String
  planoId      String
  plano        Plano  @relation(fields: [planoId], references: [id])
}`.replace(
        'model Plano {\n  id String @id\n}',
        'model Plano {\n  id          String       @id\n  ocorrencias Ocorrencia[]\n}',
      );
      expect(problemasDeRelacao(ruim, classificacao)).toEqual([
        expect.stringMatching(/^Plano\.ocorrencias: modelo global/),
        expect.stringMatching(/^Ocorrencia\.plano: modelo global/),
      ]);
    });

    it('muitos-para-muitos implícito entre modelos de condomínio', () => {
      const ruim = `${base}
model Ocorrencia {
  id           String    @id
  condominioId String
  usuarios     Usuario[]
}`.replace(
        '  @@unique([condominioId, id])',
        '  ocorrencias  Ocorrencia[]\n  @@unique([condominioId, id])',
      );
      expect(problemasDeRelacao(ruim, classificacao)).toHaveLength(2);
    });
  });
});
