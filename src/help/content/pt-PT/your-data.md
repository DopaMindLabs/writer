# Os seus dados

Esta aplicação coloca o **local em primeiro lugar**: a sua escrita é guardada no
próprio navegador, no próprio dispositivo. Nada é enviado para um servidor, e a
aplicação funciona completamente sem ligação à internet.

## Resumo

- O seu trabalho vive **no seu navegador** — privado por omissão, ligado a este dispositivo.
- **Exporte** prosa e citações para levar o seu trabalho consigo.
- **Faça cópias de segurança** com regularidade; limpar os dados do site apaga o seu trabalho.
- Opcionalmente, **sincronize** um espaço com uma pasta local.

## O que significa local em primeiro lugar

- Documentos, espaços, notas e citações ficam no armazenamento local do navegador.
- Não existe conta nem sincronização automática com a nuvem — privacidade por omissão,
  mas os seus dados estão ligados a este navegador neste dispositivo.
- Limpar os dados do site do navegador removerá o seu trabalho, pelo que deve manter
  cópias de segurança.

## Exportar

Exporte a sua escrita para a levar consigo ou guardar uma cópia segura. Um espaço
inteiro é exportado como um **arquivo de espaço** (.zip) com marca temporal; as citações
são exportadas como [BibTeX](citations-and-bibliography).

Um arquivo de espaço contém duas camadas: uma árvore legível de ficheiros markdown
que pode abrir em qualquer lugar, e uma cópia completa legível por máquina de cada
registo — documentos, notas, anexos, anotações, citações, ligações, histórico de versões
e definições — para que o arquivo possa ser restaurado ou importado fielmente mais tarde.

## Importar

Traga um espaço para este navegador a partir de um arquivo de espaço — por exemplo,
um instantâneo descarregado ou uma exportação de sincronização de pasta de outro
dispositivo. Vá a **Definições → Exportar/importar**, escolha o ficheiro de arquivo e
este é importado como um **novo espaço** ao lado dos existentes. A importação nunca
substitui nada; é também a forma de mover um espaço entre dispositivos.

## Cópias de segurança, restauro e sincronização

- Crie **instantâneos** na área de cópias de segurança do espaço; cada um adiciona uma
  linha que pode descarregar, restaurar ou eliminar.
- **Restaure** um instantâneo para fazer o espaço inteiro regredir a esse momento. O
  estado actual é guardado primeiro como um novo instantâneo, pelo que um restauro pode
  ele próprio ser desfeito. Os instantâneos criados antes de existir suporte para restauro
  (apenas markdown) só podem ser descarregados.
- O restauro a partir de um .zip descarregado funciona através da importação — o arquivo
  regressa como um novo espaço e o espaço existente fica intacto.
- Ligue uma **pasta de sincronização** para espelhar um espaço no armazenamento local,
  defina o intervalo e execute uma sincronização a pedido.
- O ecrã inicial mostra um chip de estado: um aviso enquanto a sincronização e as cópias
  de segurança não estiverem activadas, que muda para **sincronização de pasta activa**
  assim que uma pasta de sincronização estiver ligada.

O armazenamento é local, pelo que **cópias de segurança regulares são essenciais**.
Exporte antes de limpar dados do navegador, mudar de dispositivo ou experimentar algo novo.

## Se a aplicação não iniciar

Se a aplicação não conseguir abrir a base de dados local, apresenta um ecrã de erro de
arranque. A partir daí pode escolher **Repor dados locais**, que — após uma confirmação
explícita — apaga tudo o que a aplicação guardou neste navegador e recomeça com o
conteúdo de demonstração. Isto elimina permanentemente os seus documentos, notas,
citações e cópias de segurança internas, pelo que deve tratá-lo como último recurso
e guardar as exportações num local seguro.

> Esta é uma aplicação de pré-lançamento em evolução. Trate as suas exportações como
> a fonte da verdade e faça cópias de segurança com frequência.

## Relacionado

- [Citações e bibliografia](citations-and-bibliography) — exportação BibTeX.
- [Organizar o trabalho](organizing-your-work) — o que um espaço contém.
