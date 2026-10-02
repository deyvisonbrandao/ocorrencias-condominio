import { Global, Module } from '@nestjs/common';
import { AppConfig, carregarArquivoEnv, carregarConfig } from './app-config.js';

@Global()
@Module({
  providers: [
    {
      provide: AppConfig,
      useFactory: (): AppConfig => {
        carregarArquivoEnv();
        return carregarConfig(process.env);
      },
    },
  ],
  exports: [AppConfig],
})
export class ConfigModule {}
