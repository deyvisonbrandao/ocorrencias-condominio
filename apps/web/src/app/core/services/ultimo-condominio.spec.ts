import { TestBed } from '@angular/core/testing';
import { CHAVE_ULTIMO_CONDOMINIO, UltimoCondominio } from './ultimo-condominio';

describe('UltimoCondominio', () => {
  let ultimo: UltimoCondominio;

  beforeEach(() => {
    localStorage.clear();
    ultimo = TestBed.inject(UltimoCondominio);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('lembra o último slug gravado', () => {
    ultimo.gravar('jardim-das-flores');

    expect(ultimo.ler()).toBe('jardim-das-flores');
  });

  it('sem nada gravado, devolve null', () => {
    expect(ultimo.ler()).toBeNull();
  });

  it('ignora valor adulterado que não é slug', () => {
    localStorage.setItem(CHAVE_ULTIMO_CONDOMINIO, '//evil.com');

    expect(ultimo.ler()).toBeNull();
  });

  it('com o armazenamento bloqueado, não lança e devolve null', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });

    expect(() => ultimo.gravar('jardim')).not.toThrow();
    expect(ultimo.ler()).toBeNull();
  });
});
