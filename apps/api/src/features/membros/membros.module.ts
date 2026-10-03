import { Module } from '@nestjs/common';
import { MoradoresController } from './moradores.controller.js';
import { MoradoresService } from './moradores.service.js';

@Module({
  controllers: [MoradoresController],
  providers: [MoradoresService],
})
export class MembrosModule {}
