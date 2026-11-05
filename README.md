# MKT ORGANIZER

Extensão por @andrz.wav para o MKTZap no Chrome e Opera GX.

## Instalar

Baixe **Instalar MKT ORGANIZER.exe** na [publicação mais recente](https://github.com/andresauloparacopias-blip/mktOrganizer/releases/latest).

1. Execute o instalador e clique em **Instalar / atualizar arquivos**.
2. Mantenha marcada a opção **Receber atualizações automáticas**.
3. Os arquivos ficam em **Documentos\MKTZAP\MKT ORGANIZER**, sem exigir administrador.
4. Na primeira vez, abra a tela de extensões pelo botão do navegador, ative **Modo de desenvolvedor**, clique em **Carregar sem compactação** e selecione essa pasta. O botão **Copiar caminho** ajuda nessa etapa.
5. Abra ou atualize o MKTZap.

A primeira ativação no navegador é manual. O instalador não altera preferências internas ou políticas do Chrome/Opera.

## Atualizações automáticas

A tarefa do Windows **MKT ORGANIZER - Atualizacao** verifica o GitHub a cada 30 minutos e após entrar no Windows, enquanto esse usuário estiver conectado e houver internet. Ela baixa somente pacotes deste repositório e confere o SHA-256 antes da instalação. Se estiver sem internet, tenta novamente na próxima execução.

Os arquivos anteriores ficam em **Documentos\MKTZAP\Backups MKT ORGANIZER**. O estado de atualização só é marcado como pronto depois que todos os arquivos são instalados. A extensão recarrega automaticamente, mantendo o identificador e seus dados locais. Atualize páginas do MKTZap já abertas quando terminar de escrever; o atualizador não fecha o navegador nem recarrega essas páginas à força.

Pastas, sinalizações, contatos, configurações e lembretes ficam no armazenamento de cada perfil do navegador. O atualizador não apaga nem sincroniza esses dados. Não remova a extensão para atualizar. Se ela foi instalada antes em outra pasta, exporte o backup em **Ajustes**, ative a pasta do instalador e importe o backup.

Para desativar o atualizador, execute novamente o instalador, desmarque **Receber atualizações automáticas** e aplique. O registro de erros fica em `%LOCALAPPDATA%\MKT ORGANIZER\atualizador.log`.

## Publicar uma atualização

O código da extensão está em `extension/`. O arquivo RAR antigo é mantido apenas como referência e não é usado pelo atualizador.

1. Atualize os arquivos em `extension/`.
2. Incremente `version` em `extension/manifest.json`, a versão no título de `extension/LEIA-ME.md` e a versão em `extension/update-state.json`, mantendo `ready: true`.
3. Envie um commit para `main`. O workflow **Publicar MKT ORGANIZER** compila o instalador e cria uma release `v<versão>` com `extension.zip`, `update.json` e o EXE.
4. Os usuários recebem a nova publicação na verificação seguinte. Alterações apenas salvas no computador não são distribuídas até o envio ao GitHub e a conclusão do workflow.

No computador de desenvolvimento, `PUBLICAR ATUALIZACAO.ps1` copia a extensão da pasta Documentos, verifica se houve aumento de versão, cria o commit e envia para este repositório. O Git deve estar instalado e autenticado na conta com acesso de escrita. Nenhuma senha ou token deve ser salvo neste projeto.

Também é possível executar `installer/build.ps1` no Windows para gerar o pacote em `dist/`. O EXE é local e ainda não tem assinatura digital de editor.
