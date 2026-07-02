# ComSummarizer

Extension Chrome Manifest V3 qui extrait les commentaires visibles sur YouTube et Reddit, génère un résumé automatique des commentaires les plus pertinents avec les APIs IA embarquées de Chrome, puis ajoute un bouton de traduction par commentaire lorsque la langue détectée diffère de celle de l'utilisateur.

## Structure

- `manifest.json` : configuration MV3 et injection des scripts/styles
- `src/content.js` : orchestration du scraping, du résumé et de la traduction
- `src/services/chrome-ai.js` : couche d'abstraction pour Summarizer, Translator et Language Detector
- `src/sites/index.js` : scrapers YouTube, Reddit et fallback générique
- `src/ui/injector.js` : injection du résumé et des actions dans le DOM
- `src/injected.css` : styles injectés dans les pages visitées

## Fonctionnement

1. Le content script détecte le site et collecte les commentaires visibles dans le DOM.
2. Une stratégie de pondération simple retient les 5 commentaires les plus pertinents.
3. Le résumé est généré avec la Summarizer API puis injecté en haut de la section commentaires.
4. Chaque commentaire est analysé avec la Language Detector API.
5. Si la langue diffère de celle de l'utilisateur, un bouton "Traduire" est ajouté et déclenche la Translator API.
6. Un message explicite est injecté dans la page si une API Chrome IA n'est pas disponible.

## Installation en mode développeur

1. Ouvrir `chrome://extensions`
2. Activer le mode développeur
3. Cliquer sur "Charger l'application non empaquetée"
4. Sélectionner le dossier du projet

## Limites connues

- Les commentaires chargés plus tard au scroll dépendent des mutations DOM détectées par l'extension.
- La stratégie générique peut produire des faux positifs sur des pages très structurées.
- Les APIs Chrome IA doivent être présentes et actives dans le navigateur pour que le résumé et la traduction fonctionnent.