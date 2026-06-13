# O inspetor de documento

O inspetor de documento é o painel ao lado do editor. A aba **Estrutura** mapeia a
organização do documento, e a aba **Informações** mostra detalhes em tempo real sobre
o documento que você está escrevendo e permite definir alguns limites opcionais e um
status. Você escolhe quais campos aparecem — universalmente e por espaço — para que o
inspetor mostre só o que importa para você.

## A estrutura

A aba **Estrutura** lista os títulos do documento em ordem, com recuo por nível, para
que você veja a forma de um texto longo de relance. Ela é atualizada um momento após
você pausar a digitação.

A estrutura é construída a partir dos seus títulos — digite `# `, `## ` ou `### ` no
início de uma linha (ou use a barra de ferramentas flutuante) para adicionar um.
Um documento sem títulos mostra uma estrutura vazia; veja
[Formatação e markdown](formatting-and-markdown#headings-and-structure) para saber como
os títulos funcionam.

No celular, abra o inspetor pela aba **mais**: escolha **Inspetor de documento** no menu
e ele desliza a partir da direita.

## Contagem de palavras e caracteres

A aba Informações sempre mostra as contagens em tempo real de **palavras** e
**caracteres** do documento.

## Definindo um limite de palavras ou caracteres

Se o campo **Limite de palavras** ou **Limite de caracteres** estiver visível, digite
um número para definir uma meta. O contador então exibe `atual / limite`, e ao
ultrapassar o limite ele fica vermelho e o texto excedente é destacado no editor.
Nada é excluído ou cortado — o destaque é apenas um sinal visual para que você
continue escrevendo e ajuste depois.

Deixe um limite vazio (ou defina como `0`) para não ter limite.

Se preferir manter o limite e o contador mas não o destaque no editor, desative
**Destacar texto acima do limite** nas configurações (veja abaixo).

## Status e bloqueio

O seletor de **Status** leva um documento por suas fases: _Rascunho_, _Em andamento_,
_Em revisão_, _Concluído_ e _Publicado_. Definir o status como **Concluído** ou
**Publicado** bloqueia o documento para que não seja alterado por acidente — um banner
aparece sobre o editor com um botão **Desbloquear para editar**. Para desbloquear, use
esse botão ou volte o status a uma fase anterior. O bloqueio protege apenas o corpo do
documento; nada é excluído.

## Data de vencimento

Se o campo **Data de vencimento** estiver visível, escolha uma data para registrar um
prazo. Uma data vencida é exibida em vermelho.

## Escolhendo quais campos aparecem

Cada campo do inspetor é opcional. Para escolher quais aparecem:

- **Universalmente:** abra **Configurações universais → Inspetor de documento** e ative
  ou desative cada campo. Você também pode escolher quais fases de status aparecem no seletor.
- **Por espaço:** abra as **Configurações → Inspetor de documento** de um espaço. Cada
  campo pode herdar o padrão universal ou ser ativado/desativado apenas para aquele espaço.

Desativar um campo o oculta do inspetor — junto com seu limite e o destaque no editor —
mesmo que você tenha definido um valor anteriormente. O valor não é excluído: reative
o campo e ele reaparece.
