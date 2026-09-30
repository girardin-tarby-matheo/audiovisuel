# Shotboard Studio

Shotboard Studio est un outil de planification de tournage et de conception de synoptique pour équipes de production, avec un plateau visuel, une bibliothèque d'objets modulables et un mode synoptique de câblage.

## Fonctionnalités principales

- Plateau de plan de tournage avec objets, calques, zoom et déplacement
- Bibliothèque de filtres, éléments personnalisés et ports connectiques
- Mode synoptique pour relier caméra, audio, mixage et écrans
- Export PNG et partage de projet via URL
- Gestion de projets en local et import / export JSON

## Démarrage rapide

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4321
```

## Scripts utiles

```bash
npm run dev
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
