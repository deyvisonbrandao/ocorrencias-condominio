-- CreateIndex
CREATE INDEX `usuario_condominio_id_papel_status_criado_em_idx` ON `usuario`(`condominio_id`, `papel`, `status`, `criado_em`);
