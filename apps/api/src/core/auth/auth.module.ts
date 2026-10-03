import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GuardaAutenticacao } from './guarda-autenticacao.js';
import { GuardaOrigem } from './guarda-origem.js';
import { SessaoJwt } from './sessao-jwt.js';

// A ordem dos APP_GUARD é a ordem de execução: origem antes da autenticação. O guard de papel entra por rota, via @Papeis().
@Global()
@Module({
  providers: [
    SessaoJwt,
    { provide: APP_GUARD, useClass: GuardaOrigem },
    { provide: APP_GUARD, useClass: GuardaAutenticacao },
  ],
  exports: [SessaoJwt],
})
export class AuthModule {}
