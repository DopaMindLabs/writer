# Seus dados

Este aplicativo coloca o **local em primeiro lugar**: sua escrita é armazenada no
próprio navegador, no próprio dispositivo. Nada é enviado para um servidor, e o
aplicativo funciona completamente offline.

## Resumo rápido

- Seu trabalho fica **no seu navegador** — privado por padrão, vinculado a este dispositivo.
- **Exporte** prosa e citações para levar seu trabalho com você.
- **Faça backups** com regularidade; limpar os dados do site apaga seu trabalho.
- Opcionalmente, **sincronize** um espaço com uma pasta local.

## O que significa local em primeiro lugar

- Documentos, espaços, notas e citações ficam no armazenamento local do navegador.
- Não há conta nem sincronização automática com a nuvem — privacidade por padrão, mas
  seus dados estão vinculados a este navegador neste dispositivo.
- Limpar os dados do site do navegador irá remover seu trabalho, então mantenha backups.

## Exportando

Exporte sua escrita para levá-la consigo ou guardar uma cópia segura. Um espaço inteiro
é exportado como um **arquivo de espaço** (.zip) com carimbo de data e hora; citações
são exportadas como [BibTeX](citations-and-bibliography).

Um arquivo de espaço contém duas camadas: uma árvore legível de arquivos markdown que
você pode abrir em qualquer lugar, e uma cópia completa legível por máquina de cada
registro — documentos, notas, anexos, anotações, citações, conexões, histórico de
versões e configurações — para que o arquivo possa ser restaurado ou importado
fielmente depois.

## Importando

Traga um espaço para este navegador a partir de um arquivo de espaço — por exemplo,
um instantâneo baixado ou uma exportação de sincronização de pasta de outro dispositivo.
Vá para **Configurações → Exportar/importar**, escolha o arquivo e ele é importado como
um **novo espaço** ao lado dos existentes. A importação nunca sobrescreve nada; é também
a forma de mover um espaço entre dispositivos.

## Backups, restauração e sincronização

- Crie **instantâneos** na área de backups do espaço; cada um adiciona uma linha que
  você pode baixar, restaurar ou excluir.
- **Restaure** um instantâneo para reverter o espaço inteiro àquele momento. O estado
  atual é salvo como um novo instantâneo primeiro, então uma restauração pode ser
  desfeita. Instantâneos criados antes de existir suporte a restauração (somente
  markdown) só podem ser baixados.
- A restauração a partir de um .zip baixado funciona via importação — o arquivo volta
  como um novo espaço e o espaço existente fica intacto.
- Conecte uma **pasta de sincronização** para espelhar um espaço no armazenamento local,
  defina o intervalo e execute uma sincronização sob demanda.
- A tela inicial mostra um chip de status: um aviso enquanto sincronização e backups não
  estão ativados, mudando para **sincronização de pasta ativada** assim que uma pasta
  de sincronização é conectada.

O armazenamento é local, então **backups regulares são essenciais**. Exporte antes de
limpar dados do navegador, trocar de dispositivo ou experimentar algo novo.

## Se o aplicativo não iniciar

Se o aplicativo não conseguir abrir o banco de dados local, ele mostra uma tela de erro
de inicialização. De lá você pode escolher **Redefinir dados locais**, que — após uma
confirmação explícita — apaga tudo que o aplicativo armazenou neste navegador e começa
novamente com o conteúdo demo. Isso exclui permanentemente seus documentos, notas,
citações e backups internos, então trate como último recurso e guarde as exportações
em lugar seguro.

> Este é um aplicativo em pré-lançamento em evolução. Trate suas exportações como a
> fonte da verdade e faça backups com frequência.

## Relacionado

- [Citações e bibliografia](citations-and-bibliography) — exportação BibTeX.
- [Organizando seu trabalho](organizing-your-work) — o que um espaço contém.
