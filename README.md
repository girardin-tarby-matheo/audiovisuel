# Shotboard Studio

Shotboard Studio est un outil de planification de tournage et de conception de synoptique pour équipes de production, avec un plateau visuel, une bibliothèque d'objets modulables et un mode synoptique de câblage.

## Fonctionnalités principales

- Plateau de plan de tournage avec objets, calques, zoom et déplacement
- **Fond de plan** : importez un plan de salle ou une photo derrière les objets (opacité, taille, position)
- Noms des objets placés automatiquement sans chevauchement, et déplaçables par double-clic
- Lumières avec faisceau réglable (rayon, ouverture, puissance) et caméras avec champ de vision
- Alignement et répartition des objets sélectionnés
- Annuler / rétablir (Ctrl+Z / Ctrl+Y) pour le plan, le synoptique et le fond de plan
- Mode synoptique pour relier caméra, audio, mixage et écrans, avec validation en direct
- Thème clair ou sombre (bouton soleil / lune)
- Export PNG, export / import JSON et bibliothèque de projets enregistrés dans le navigateur
- **Partage par lien** : le projet est compressé dans l'adresse ; la page de partage affiche un aperçu du plan et permet de l'ouvrir dans l'éditeur (votre projet actuel est sauvegardé avant)
- Raccourcis clavier : touche **?** pour l'aide

## Démarrage rapide

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4321
```

## Scripts utiles

```bash
npm run dev
npm test
npm run build
npm run preview -- --host 0.0.0.0 --port 4321
```

## Structure du projet

```text
src/
  components/     Composants React UI
  lib/           catalogues, utilitaires et types
  pages/          routes Astro
  store/          store Zustand du studio
```

## Bonnes pratiques

- Conserver les objets personnalisés dans le catalogue pour réutiliser la configuration
- Utiliser le mode synoptique pour vérifier les connexions avant le tournage
- Exporter le fichier JSON avant les grandes itérations de conception

## Développement

Le projet est construit avec Astro + React + Zustand + Tailwind.
