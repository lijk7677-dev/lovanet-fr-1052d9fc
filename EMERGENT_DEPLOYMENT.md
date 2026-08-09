# Emergent Deployment Guide

## Objectif
Ce guide documente les étapes nécessaires pour déployer le site Lovanet en production avec la configuration actuelle et les fichiers vidéo synchronisés.

---

## 1. Pré-requis
- Node.js compatible (v18+ recommandé)
- Yarn installé globalement ou via npm
- Accès au dépôt git : `https://github.com/6yr1990991487-beep/https-github.com-19902909a-25952525824292.git`
- Variables d'environnement configurées dans `frontend/.env` si nécessaire

---

## 2. Cloner le dépôt
```bash
git clone https://github.com/6yr1990991487-beep/https-github.com-19902909a-25952525824292.git
cd https-github.com-19902909a-25952525824292
```

---

## 3. Installer les dépendances
```bash
cd frontend
yarn install --frozen-lockfile
```

---

## 4. Vérifier les fichiers vidéo
Le répertoire `frontend/public/` doit contenir les fichiers vidéo suivants :
- actualites-banner-2.mp4
- actualites-banner.mp4
- banner-2.mp4
- banner-2.webm
- banner-3.mp4
- banner-3.webm
- banner-bottom.mp4
- banner-bottom.webm
- banner-seq-2.mp4
- banner-seq-2.webm
- banner-seq-3.mp4
- banner-top.mp4
- cataloge-banner.mp4
- custom-hero-banner-mobile.mp4
- custom-hero-banner-web.mp4
- custom-hero-banner.mp4
- custom_video_lovanet.mp4
- global-bg-mobile.mp4
- global-bg-web.mp4
- global-bg.mp4
- home-banner.mp4
- leaderboard-banner.mp4
- manga-universe-banner.mp4
- root-capture-video-latest.mp4

> Les pages du site utilisent ces vidéos pour les bannières et les décors visuels.

---

## 5. Générer le cache-busting des assets vidéo
Un script helper existe : `fix-decor-video-sync.sh`

```bash
cd /app
bash fix-decor-video-sync.sh
```

Ce script :
- vérifie la présence des vidéos critiques
- calcule un hash d’asset
- met à jour `frontend/.env` avec `REACT_APP_ASSET_VERSION`
- crée `.emergent/asset-manifest.json`
- nettoie le cache de build

---

## 6. Construire le frontend
```bash
cd frontend
yarn build
```

Le build doit aboutir avec un message similaire à :
- `Compiled with warnings.`
- `The build folder is ready to be deployed.`

---

## 7. Déployer le dossier `build`
Le dossier `frontend/build` est la sortie de production. Déployez ce dossier sur votre hébergeur statique ou CDN.

---

## 8. Liste de vérification post-déploiement
- Le site doit s’ouvrir sur `/` et rester stable
- Les pages principales doivent utiliser le même shell que l’aperçu
- Les vidéos de bannière doivent charger correctement
- Les décors `ThemeBubble` doivent apparaître sur desktop et mobile
- Les caches média ne doivent pas garder les anciennes vidéos plus de 6 heures

---

## 9. Erreurs connues et notes
- Le build actuel affiche des warnings ESLint liés à `react-hooks/exhaustive-deps` dans plusieurs fichiers, mais cela n’empêche pas la compilation.
- Si le build ne trouve pas les sourcemaps de `@mediapipe/tasks-vision`, vérifiez l’installation du module et les fichiers `.map` manquants.

---

## 10. Commandes rapides
```bash
cd /app
git pull origin main
cd frontend
yarn install
bash ../fix-decor-video-sync.sh
yarn build
```

---

## 11. Dépôt Git distant
- URL du dépôt : `https://github.com/6yr1990991487-beep/https-github.com-19902909a-25952525824292.git`

---

## 12. Engagement
Ce dépôt contient désormais :
- un commit de stabilisation des pages `main`, `AnimeCatalog`, `AnimeCountdown`, `Profile`
- une gestion de cache vidéo plus agressive
- un script d’assurance qualité vidéo/decor
- un guide de déploiement dédié
