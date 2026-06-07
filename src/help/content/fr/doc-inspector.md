# L'inspecteur de document

L'inspecteur de document est le panneau à côté de l'éditeur. Son onglet
**Info** affiche des détails en direct sur le document que tu écris et
te permet de fixer quelques limites optionnelles et un statut. Tu
choisis quels champs apparaissent — globalement et par espace — pour
que l'inspecteur ne montre que ce qui t'intéresse.

## Comptages de mots et caractères

L'onglet Info affiche toujours les comptages en direct de **mots** et
**caractères** du document.

## Fixer une limite de mots ou caractères

Si le champ **Limite de mots** ou **Limite de caractères** est affiché,
tape un nombre pour fixer un objectif. Le comptage se lit alors
`actuel / limite`, et une fois que tu dépasses la limite, le comptage
devient rouge et le texte hors limite est surligné dans l'éditeur. Rien
n'est jamais supprimé ou coupé — le surlignage n'est qu'un indice
visuel, donc tu peux continuer à écrire et trimer plus tard.

Laisse une limite vide (ou mets-la à `0`) pour aucune limite.

Si tu préfères garder la limite et le compteur mais pas le surlignage
de l'éditeur, désactive **Surligner le texte hors limite** dans les
paramètres (voir ci-dessous).

## Statut et verrouillage

Le sélecteur de **Statut** déplace un document à travers ses étapes :
_Brouillon_, _En cours_, _En revue_, _Terminé_ et _Publié_. Mettre le
statut à **Terminé** ou **Publié** verrouille le document pour qu'il ne
soit pas modifié par accident — un bandeau apparaît au-dessus de
l'éditeur avec un bouton **Déverrouiller pour éditer**. Pour
déverrouiller, utilise ce bouton ou remets le statut à une étape
précédente. Le verrouillage protège uniquement le corps du document ;
rien n'est supprimé.

## Date d'échéance

Si le champ **Date d'échéance** est affiché, choisis une date pour
enregistrer une échéance. Une date dépassée s'affiche en rouge.

## Choisir quels champs apparaissent

Chaque champ de l'inspecteur est optionnel. Pour choisir lesquels apparaissent :

- **Globalement :** ouvre **Paramètres → Inspecteur de document** et active ou désactive chaque champ. Tu peux aussi choisir quelles étapes de statut apparaissent dans le sélecteur.
- **Par espace :** ouvre **Paramètres → Inspecteur de document** d'un espace. Chaque champ peut hériter du défaut global ou être activé ou désactivé juste pour cet espace.

Désactiver un champ le cache de l'inspecteur — avec sa limite et le
surlignage de l'éditeur — même si tu avais fixé une valeur avant. La
valeur n'est pas supprimée : réactive le champ et elle réapparaît.
