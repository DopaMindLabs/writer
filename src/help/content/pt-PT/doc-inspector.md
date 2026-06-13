# O inspector de documento

O inspector de documento é o painel ao lado do editor. O separador **Estrutura** mapeia
a organização do documento, e o separador **Informações** mostra detalhes em tempo real
sobre o documento que está a escrever e permite definir alguns limites opcionais e um
estado. Escolhe quais os campos que aparecem — universalmente e por espaço — para que o
inspector mostre apenas o que lhe interessa.

## A estrutura

O separador **Estrutura** lista os títulos do documento por ordem, com avanço por nível,
para que possa ver a forma de um texto longo de relance. É actualizado um momento após
parar de escrever.

A estrutura é construída a partir dos seus títulos — escreva `# `, `## ` ou `### ` no
início de uma linha (ou use a barra de ferramentas flutuante) para adicionar um.
Um documento sem títulos mostra uma estrutura vazia; consulte
[Formatação e markdown](formatting-and-markdown#headings-and-structure) para saber como
os títulos funcionam.

No telemóvel, abra o inspector a partir do separador **mais**: escolha **Inspector de
documento** no menu e ele desliza a partir da direita.

## Contagem de palavras e caracteres

O separador Informações mostra sempre as contagens actuais de **palavras** e
**caracteres** do documento.

## Definir um limite de palavras ou caracteres

Se o campo **Limite de palavras** ou **Limite de caracteres** estiver visível, escreva
um número para definir um objectivo. O contador apresenta depois `actual / limite`, e
ao ultrapassar o limite fica vermelho e o texto excedente é destacado no editor. Nada
é eliminado ou cortado — o destaque é apenas um sinal visual, para que possa continuar
a escrever e aparar mais tarde.

Deixe um limite vazio (ou defina-o como `0`) para não ter limite.

Se preferir manter o limite e o contador mas não o destaque no editor, desactive
**Destacar texto acima do limite** nas definições (ver abaixo).

## Estado e bloqueio

O selector de **Estado** conduz um documento pelas suas fases: _Rascunho_, _Em progresso_,
_Em revisão_, _Concluído_ e _Publicado_. Definir o estado como **Concluído** ou
**Publicado** bloqueia o documento para que não seja alterado por acidente — aparece
um banner sobre o editor com um botão **Desbloquear para editar**. Para desbloquear,
use esse botão ou volte o estado a uma fase anterior. O bloqueio protege apenas o corpo
do documento; nada é eliminado.

## Data de entrega

Se o campo **Data de entrega** estiver visível, escolha uma data para registar um prazo.
Uma data ultrapassada é apresentada a vermelho.

## Escolher quais os campos que aparecem

Cada campo do inspector é opcional. Para escolher quais aparecem:

- **Universalmente:** abra **Definições universais → Inspector de documento** e active
  ou desactive cada campo. Pode também escolher quais as fases de estado que aparecem
  no selector.
- **Por espaço:** abra as **Definições → Inspector de documento** de um espaço. Cada
  campo pode herdar o valor predefinido universal ou ser activado/desactivado apenas
  para esse espaço.

Desactivar um campo oculta-o do inspector — juntamente com o seu limite e o destaque
no editor — mesmo que tenha definido um valor anteriormente. O valor não é eliminado:
volte a activar o campo e ele reaparece.
