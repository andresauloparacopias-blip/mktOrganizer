# MKT ORGANIZER

Extensão por @andrz.wav para o MKTZap no Chrome e Opera GX.

## Instalar

Baixe **Instalar MKT ORGANIZER.exe** na [publicação mais recente](https://github.com/andresauloparacopias-blip/mktOrganizer/releases/latest).

1. Execute o EXE e clique em **Baixar / atualizar do GitHub**.
2. Mantenha marcada a opção **Verificar atualizações automaticamente a cada 30 minutos**.
3. Os arquivos ficam em **Documentos\MKTZAP\MKT ORGANIZER**, sem exigir administrador.
4. Na primeira vez, abra a tela de extensões no Opera, Opera GX ou Chrome, ative **Modo de desenvolvedor**, clique em **Carregar sem compactação** e selecione essa pasta. O botão **Copiar caminho** ajuda nessa etapa.
5. Abra ou atualize o MKTZap.

O EXE baixa e atualiza os arquivos e oferece uma tentativa de primeira ativação pela interface do navegador. Se a interface não for reconhecida, a ativação é concluída manualmente. O botão de atualização busca a versão mais recente publicada no GitHub, independentemente da versão embutida no EXE.

## Atualizações automáticas

A tarefa do Windows **MKT ORGANIZER - Atualizacao** verifica o GitHub a cada 30 minutos e após entrar no Windows, enquanto esse usuário estiver conectado e houver internet. Ela baixa somente pacotes deste repositório e confere o SHA-256 antes da instalação. Se estiver sem internet, tenta novamente na próxima execução.

Os arquivos anteriores ficam em **Documentos\MKTZAP\Backups MKT ORGANIZER**. O estado de atualização só é marcado como pronto depois que todos os arquivos são instalados. A extensão recarrega automaticamente, mantendo o identificador e seus dados locais. Atualize páginas do MKTZap já abertas quando terminar de escrever; o atualizador não fecha o navegador nem recarrega essas páginas à força.

Pastas, sinalizações, contatos, configurações e lembretes ficam no armazenamento de cada perfil do navegador. O atualizador não apaga nem sincroniza esses dados. Não remova a extensão para atualizar. Se ela foi instalada antes em outra pasta, exporte o backup em **Ajustes**, ative a pasta do instalador e importe o backup.

Para desativar o atualizador, execute novamente o instalador, desmarque **Verificar atualizações automaticamente a cada 30 minutos** e aplique. O registro de erros fica em `%LOCALAPPDATA%\MKT ORGANIZER\atualizador.log`.

## Publicar uma atualização

O código da extensão está em `extension/`. O arquivo RAR antigo é mantido apenas como referência e não é usado pelo atualizador.

1. Atualize os arquivos em `extension/`.
2. Incremente `version` em `extension/manifest.json`, a versão no título de `extension/LEIA-ME.md` e a versão em `extension/update-state.json`, mantendo `ready: true`.
3. Envie um commit para `main`. O workflow **Publicar MKT ORGANIZER** compila o instalador e cria uma release `v<versão>` com `extension.zip`, `update.json` e o EXE.
4. Os usuários recebem a nova publicação na verificação seguinte. Alterações apenas salvas no computador não são distribuídas até o envio ao GitHub e a conclusão do workflow.

No computador de desenvolvimento, `PUBLICAR ATUALIZACAO.ps1` copia a extensão da pasta Documentos, verifica se houve aumento de versão, cria o commit e envia para este repositório. O Git deve estar instalado e autenticado na conta com acesso de escrita. Nenhuma senha ou token deve ser salvo neste projeto.

Também é possível executar `installer/build.ps1` no Windows para gerar o pacote em `dist/`. O EXE é local e ainda não tem assinatura digital de editor.

## Instalação assistida (3.3.64)
Após baixar os arquivos, use **Ativar no navegador**, escolha Chrome, Opera ou Opera GX e clique em **Iniciar instalação assistida**. A assistência tenta operar os controles acessíveis da tela de extensões. Aguarde sem usar o computador durante a tentativa e confira se a extensão ficou ativada. Quando um controle não for reconhecido, siga as instruções manuais e use **Copiar caminho**. A assistência atua no perfil aberto do navegador e reconhece os rótulos em português e inglês. As atualizações seguintes continuam usando o atualizador existente.
