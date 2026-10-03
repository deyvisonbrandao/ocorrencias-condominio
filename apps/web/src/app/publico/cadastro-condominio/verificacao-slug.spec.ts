import { Observable, of, Subject } from 'rxjs';
import { DisponibilidadeSlug } from '../../core/services/condominios-publico.service';
import { EstadoSlug, verificarSlug } from './verificacao-slug';

describe('verificarSlug', () => {
  let slugs: Subject<string>;
  let consultar: ReturnType<typeof vi.fn<(slug: string) => Observable<DisponibilidadeSlug>>>;
  let estados: EstadoSlug[];

  beforeEach(() => {
    vi.useFakeTimers();
    slugs = new Subject<string>();
    consultar = vi.fn((slug: string) =>
      of<DisponibilidadeSlug>(slug === 'ocupado' ? 'em-uso' : 'disponivel'),
    );
    estados = [];
    verificarSlug(slugs, consultar, 400).subscribe((estado) => estados.push(estado));
  });

  afterEach(() => vi.useRealTimers());

  it('mostra "verificando" na hora e só consulta depois de 400ms sem digitação', () => {
    slugs.next('jardim');
    expect(estados).toEqual(['verificando']);

    vi.advanceTimersByTime(399);
    expect(consultar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(consultar).toHaveBeenCalledWith('jardim');
    expect(estados).toEqual(['verificando', 'disponivel']);
  });

  it('digitação rápida consulta só o último valor', () => {
    slugs.next('jar');
    vi.advanceTimersByTime(200);
    slugs.next('jardi');
    vi.advanceTimersByTime(200);
    slugs.next('ocupado');
    vi.advanceTimersByTime(400);

    expect(consultar).toHaveBeenCalledTimes(1);
    expect(consultar).toHaveBeenCalledWith('ocupado');
    expect(estados.at(-1)).toBe('em-uso');
  });

  it('slug fora das regras não consulta e volta ao estado ocioso', () => {
    slugs.next('jardim');
    slugs.next('Jardim Flores');
    vi.advanceTimersByTime(1000);

    expect(consultar).not.toHaveBeenCalled();
    expect(estados).toEqual(['verificando', 'ocioso']);
  });

  it('o mesmo valor repetido não dispara nova consulta', () => {
    slugs.next('jardim');
    vi.advanceTimersByTime(400);
    slugs.next(' jardim ');
    vi.advanceTimersByTime(400);

    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it('descarta a resposta de um valor que já mudou', () => {
    const resposta = new Subject<DisponibilidadeSlug>();
    consultar.mockReturnValueOnce(resposta);

    slugs.next('primeiro');
    vi.advanceTimersByTime(400);
    slugs.next('segundo');
    resposta.next('em-uso');

    expect(estados).toEqual(['verificando', 'verificando']);
  });
});
