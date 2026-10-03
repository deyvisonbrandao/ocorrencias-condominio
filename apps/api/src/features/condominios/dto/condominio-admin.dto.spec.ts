import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AtualizarCondominioDto,
  MENSAGEM_SLUG_IMUTAVEL,
  MENSAGEM_UF,
} from './condominio-admin.dto.js';

async function errosDe(corpo: Record<string, unknown>) {
  const dto = plainToInstance(AtualizarCondominioDto, corpo);
  const erros = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return {
    dto,
    porCampo: Object.fromEntries(
      erros.map((e) => [e.property, Object.values(e.constraints ?? {})]),
    ),
  };
}

const VALIDO = { nome: 'Residencial Aurora', cidade: 'Recife', uf: 'PE' };

describe('AtualizarCondominioDto', () => {
  it('aceita nome, cidade e UF válidos e apara os textos', async () => {
    const { dto, porCampo } = await errosDe({
      nome: '  Residencial Aurora ',
      cidade: ' Recife ',
      uf: 'PE',
    });
    expect(porCampo).toEqual({});
    expect(dto).toMatchObject(VALIDO);
  });

  it.each([['XX'], ['pe'], [''], [null], [12], ['toString']])(
    'recusa UF %j',
    async (uf) => {
      const { porCampo } = await errosDe({ ...VALIDO, uf });
      expect(porCampo).toEqual({ uf: [MENSAGEM_UF] });
    },
  );

  it('exige os três campos', async () => {
    const { porCampo } = await errosDe({});
    expect(porCampo).toEqual({
      nome: expect.arrayContaining(['Informe o nome do condomínio.']),
      cidade: expect.arrayContaining(['Informe a cidade.']),
      uf: [MENSAGEM_UF],
    });
  });

  it('recusa cidade só com espaços e acima do limite', async () => {
    expect((await errosDe({ ...VALIDO, cidade: '   ' })).porCampo).toEqual({
      cidade: ['Informe a cidade.'],
    });
    expect(
      (await errosDe({ ...VALIDO, cidade: 'a'.repeat(81) })).porCampo,
    ).toEqual({ cidade: ['Use no máximo 80 caracteres.'] });
  });

  it.each([['novo-slug'], [null], ['']])(
    'recusa slug no corpo (%j), mesmo vazio',
    async (slug) => {
      const { porCampo } = await errosDe({ ...VALIDO, slug });
      expect(porCampo).toEqual({ slug: [MENSAGEM_SLUG_IMUTAVEL] });
    },
  );
});
