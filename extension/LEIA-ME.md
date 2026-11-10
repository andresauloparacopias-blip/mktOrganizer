# MKT ORGANIZER 3.3.64

Extensão por @andrz.wav

Extensão para `https://app3.mktzap.com.br/chat`, compatível com Opera GX.

## Atualizar no Opera GX

1. Extraia o ZIP e substitua os arquivos da pasta da extensão já carregada.
2. Abra `opera:extensions` e clique em **Recarregar** na extensão.
3. Atualize a página do Mktzap.

Para instalar pela primeira vez, ative **Modo de desenvolvedor** em `opera:extensions`, clique em **Carregar sem compactação** e selecione a pasta **MKT ORGANIZER** que contém `manifest.json`.

## Baixar arquivos do chat

Clique em **Baixar arquivos ▾** e escolha:

- **Imagens:** fotos e imagens.
- **Documentos:** documentos e outros anexos, incluindo vídeos, áudios e ZIPs.

O menu só inicia o download depois que você escolhe uma categoria. Para incluir o histórico inteiro, abra a conversa e carregue as mensagens antigas no Mktzap antes de baixar; a extensão coleta os anexos que o aplicativo carregou nessa conversa. Documentos cujo endereço não tem extensão (como arquivos Corel) mantêm o nome original informado pelo Mktzap. Os arquivos são salvos com o nome original, acrescentando apenas um sufixo quando já existe outro arquivo de mesmo nome. Ao abrir a conversa, o documento aparece com nome e botão **Abrir**. Formatos que o navegador não visualiza, como CDR, abrem no aplicativo associado ao arquivo. O controle nativo **Carregar o documento** não é acionado automaticamente, para evitar downloads inesperados. O menu informa quantos downloads foram iniciados e quantos falharam.

## Pastas de clientes

Abra **MKT ORGANIZER → Pastas**, informe nome e cor e clique em **Criar pasta**. Arraste o cartão do cliente pela alça **⠿** até a pasta na barra acima da lista. Sem pasta selecionada, a fila mostra somente clientes sem atribuição. Clique numa pasta para ver apenas os clientes dela; clique nela novamente para voltar aos sem pasta. As pastas ficam no armazenamento local do Opera GX e entram no backup exportado em **Ajustes**.

Use o filtro **Status** na barra para ver somente atendimentos aguardando resposta, em atendimento, com janela fechando ou já fechados.

As sinalizações ficam no armazenamento local do navegador. Exporte um backup em **Organização → Ajustes** antes de remover a extensão.

Downloads incluem apenas anexos recebidos do cliente, excluindo citações e mensagens enviadas. Organize clientes arrastando os cartões para uma pasta na barra de pastas. A fila inicia em **Sem resposta primeiro**; use o botão de ordem para alternar com a ordem personalizada. Arrastar um cartão também ativa a ordem personalizada.


As etiquetas do chat aberto usam a cor definida na sinalização.

## Lembretes

Abra o sino ao lado de **MKT ORGANIZER**. **Padrão** e **Click** tocam uma vez. **Contínuo** repete até você silenciar ou concluir.

## CPM

Em uma conversa, clique em **CPM** abaixo das observações do contato, na seção **Informações** para ver a quantidade de mensagens enviadas no histórico carregado e a estimativa a R$ 0,05 por mensagem. Clique novamente para recolher.


## Prévia de documentos

Word DOCX e planilhas XLSX/XLS/XLSM/XLSB/ODS/CSV têm prévia local do conteúdo. As abas da planilha podem ser alternadas; a prévia limita cada aba às primeiras 2.000 linhas e 80 colunas. O botão **Abrir documento** amplia a visualização na mesma janela. **Baixar original** permite abrir no aplicativo. Documentos antigos DOC e formatos sem visualizador local continuam disponíveis para baixar.

Marcar a conversa como lida também muda o estado para **Em atendimento**, sem exigir envio de mensagem. Alertas de janela fechada ou prestes a fechar têm prioridade visual.

A busca da fila também aceita texto, cor e ícone da sinalização. A sinalização é removida após a confirmação de sucesso da finalização do atendimento.

A barra de escrita integra anexos (+), emojis, texto, Template, áudio e envio, com visual inspirado no WhatsApp nos dois temas. O arraste superior continua redimensionando o campo; o limite de caracteres fica disponível na dica do campo de texto.

Durante a gravação, o controle de áudio fica vermelho com um quadrado de parar. A janela nativa de templates abre sobre a conversa e acompanha o tema selecionado.

O tempo de gravação aparece acima do botão de parar. Templates preservam a posição e a rolagem da conversa. O botão Finalizar mantém as opções nativas com um seletor destacado.

Os botões do cabeçalho usam espaçamento uniforme. O rótulo do seletor Finalizar tem fundo transparente para manter uma única cor no controle.

O menu Finalizar usa cores próprias para cada tema, com contraste nas opções normais, destacadas, sob o mouse e na pesquisa.

Os separadores de data respeitam o fluxo das mensagens nativas no chat e no histórico, permanecendo antes da primeira mensagem de cada dia, inclusive após carregar imagens.

O campo de mensagem cresce e retrai conforme o conteúdo digitado ou apagado, mantendo o redimensionamento manual.


## Baixar e atualizar arquivos pelo EXE

Execute **Instalar MKT ORGANIZER.exe** e clique em **Baixar / atualizar do GitHub**. O programa busca a publicação mais recente de andresauloparacopias-blip/mktOrganizer, confere o SHA-256 e atualiza a pasta **Documentos\MKTZAP\MKT ORGANIZER**. Ele usa a pasta Documentos configurada no Windows, inclusive no OneDrive, e não precisa de administrador.

Mantenha **Verificar atualizações automaticamente a cada 30 minutos** marcado para receber as próximas publicações. Os arquivos substituídos recebem backup em **Documentos\MKTZAP\Backups MKT ORGANIZER**. Se o GitHub estiver indisponível, uma instalação nova pode usar os arquivos incluídos no EXE; numa atualização, os arquivos existentes são preservados e a tentativa é repetida depois.

O EXE não ativa o modo desenvolvedor nem instala a extensão no navegador. Na primeira instalação, carregue a pasta manualmente em Opera, Opera GX ou Chrome. Depois, a extensão recarrega ao detectar uma atualização completa; atualize páginas do MKTZap quando terminar de escrever. O programa não fecha nem recarrega essas páginas à força.

## Atualização automática e preservação dos dados

O instalador mantém o mesmo caminho em Documentos e não remove a extensão, não muda sua chave nem toca no armazenamento do navegador. Pastas, sinalizações, contatos, ajustes e lembretes permanecem em cada perfil. Os arquivos substituídos recebem backup antes da atualização. Cada usuário mantém seus próprios dados; atualizar o programa não sincroniza esses dados com outras pessoas.

Se você carregou a extensão anteriormente em outra pasta, exporte o backup em Ajustes antes de mudar para a pasta do instalador e importe-o depois da ativação. Não remova a extensão anterior sem esse backup.

As versões precisam ser publicadas no GitHub para chegar aos usuários. O arquivo RAR não é usado pelo atualizador. A tarefa do Windows se chama MKT ORGANIZER - Atualizacao. Para desativá-la, abra o instalador, desmarque Receber atualizações automáticas e aplique a instalação novamente.
