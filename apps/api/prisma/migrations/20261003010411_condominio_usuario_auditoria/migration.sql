-- CreateTable
CREATE TABLE `condominio` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(40) NOT NULL,
    `status` ENUM('ATIVO', 'INATIVO') NOT NULL DEFAULT 'ATIVO',
    `proximo_numero_ocorrencia` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `condominio_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id` CHAR(36) NOT NULL,
    `condominio_id` CHAR(36) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `telefone` VARCHAR(16) NOT NULL,
    `email` VARCHAR(254) NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `bloco` VARCHAR(20) NULL,
    `apto` VARCHAR(10) NULL,
    `papel` ENUM('SINDICO', 'SUBSINDICO', 'MORADOR') NOT NULL,
    `status` ENUM('PENDENTE', 'ATIVO', 'RECUSADO', 'INATIVO') NOT NULL,
    `senha_temporaria` BOOLEAN NOT NULL DEFAULT false,
    `versao_sessao` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `slot_admin` TINYINT UNSIGNED NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuario_condominio_id_id_key`(`condominio_id`, `id`),
    UNIQUE INDEX `usuario_condominio_id_telefone_key`(`condominio_id`, `telefone`),
    UNIQUE INDEX `usuario_condominio_id_slot_admin_key`(`condominio_id`, `slot_admin`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria_admin` (
    `id` CHAR(36) NOT NULL,
    `condominio_id` CHAR(36) NOT NULL,
    `ator_id` CHAR(36) NOT NULL,
    `alvo_id` CHAR(36) NULL,
    `acao` ENUM('MORADOR_APROVADO', 'MORADOR_RECUSADO', 'USUARIO_INATIVADO', 'USUARIO_REATIVADO', 'SENHA_REDEFINIDA', 'SUBSINDICO_DEFINIDO', 'SUBSINDICO_REMOVIDO') NOT NULL,
    `dados` JSON NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auditoria_admin_condominio_id_criado_em_idx`(`condominio_id`, `criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_condominio_id_fkey` FOREIGN KEY (`condominio_id`) REFERENCES `condominio`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auditoria_admin` ADD CONSTRAINT `auditoria_admin_condominio_id_fkey` FOREIGN KEY (`condominio_id`) REFERENCES `condominio`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auditoria_admin` ADD CONSTRAINT `auditoria_admin_condominio_id_ator_id_fkey` FOREIGN KEY (`condominio_id`, `ator_id`) REFERENCES `usuario`(`condominio_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `auditoria_admin` ADD CONSTRAINT `auditoria_admin_condominio_id_alvo_id_fkey` FOREIGN KEY (`condominio_id`, `alvo_id`) REFERENCES `usuario`(`condominio_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- O Prisma não modela CHECK: os slots de admin (síndico e subsíndico) são só 1 e 2 (ADR-002).
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_slot_admin_check` CHECK (`slot_admin` IN (1, 2));
