import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NOME_PRODUTO } from '../config/marca';
import { TituloDaPagina } from './titulo-da-pagina';

@Component({ template: '' })
class Vazia {}

describe('TituloDaPagina', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'painel', title: 'Painel', component: Vazia },
          { path: 'sem-titulo', component: Vazia },
        ]),
        { provide: TitleStrategy, useClass: TituloDaPagina },
      ],
    });
  });

  it('compõe o título da tela com o nome do produto', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/painel');

    expect(TestBed.inject(Title).getTitle()).toBe(`Painel · ${NOME_PRODUTO}`);
  });

  it('usa só o nome do produto quando a rota não tem título', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/sem-titulo');

    expect(TestBed.inject(Title).getTitle()).toBe(NOME_PRODUTO);
  });
});
