import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renderiza o outlet de rotas e a região única de toasts', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('router-outlet')).not.toBeNull();
    expect(raiz.querySelectorAll('ui-regiao-toast')).toHaveLength(1);
  });
});
