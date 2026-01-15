---
id: guide-fabrication
title: Guide de Craft
sidebar_label: Craft
sidebar_position: 7
description: Guide du système de craft de Hytale - établis, recettes et fieldcraft
---

# Guide de Craft

Bienvenue dans le guide de craft pour Hytale. Contrairement aux systèmes de craft traditionnels basés sur une grille, Hytale utilise un **système de craft basé sur des recettes** avec des établis spécialisés et des catégories.

:::note Accès Anticipé
Hytale est actuellement en Accès Anticipé. Les mécaniques de craft et les recettes peuvent changer au fur et à mesure du développement du jeu.
:::

## Comment Fonctionne le Craft

Le système de craft de Hytale **n'utilise pas** de grille de craft. À la place, le craft fonctionne via :

1. **Recettes** - Chaque objet craftable a une recette définie avec les matériaux requis
2. **Établis** - Stations de craft spécialisées pour différents types d'objets
3. **Fieldcraft** - Craft portable accessible depuis votre inventaire
4. **Catégories** - Les recettes sont organisées en catégories pour faciliter la navigation

### Le Processus de Craft

1. Ouvrez un établi ou accédez au Fieldcraft depuis votre inventaire
2. Parcourez les recettes par catégorie
3. Sélectionnez une recette que vous souhaitez crafter
4. Si vous avez les matériaux requis, craftez l'objet
5. Certaines recettes nécessitent du temps pour être complétées

## Types d'Établis

Hytale propose quatre types de stations de craft :

| Type d'Établi | Description |
|---------------|-------------|
| **Crafting** | Craft standard avec catégories et sous-catégories |
| **Processing** | Transformation avec combustible (fours, fonderies) |
| **Diagram Crafting** | Interface de craft basée sur des diagrammes visuels |
| **Structural Crafting** | Craft de construction avec variantes de blocs |

### Niveaux d'Établis

Les établis peuvent être améliorés à travers des niveaux, offrant des avantages :

- **Temps de craft réduit** - Les niveaux supérieurs craftent plus vite
- **Emplacements d'entrée supplémentaires** - Plus de matériaux peuvent être mis en file
- **Emplacements de sortie supplémentaires** - Plus de résultats peuvent être stockés

## Fieldcraft (Craft Portable)

Le Fieldcraft est le système de craft portable accessible n'importe où depuis votre inventaire. Il est conçu pour les recettes basiques dont vous pourriez avoir besoin en exploration.

- Accès via votre inventaire
- Limité aux recettes plus simples
- Craft instantané (pas de temps d'attente)
- Aucun établi requis

## Structure des Recettes

Chaque recette dans Hytale se compose de :

| Composant | Description |
|-----------|-------------|
| **Matériaux d'Entrée** | Objets/ressources requis pour crafter |
| **Sortie Principale** | L'objet principal que vous recevez |
| **Sorties Secondaires** | Objets supplémentaires parfois produits |
| **Établi Requis** | Quel établi et niveau est nécessaire |
| **Temps de Craft** | Combien de temps prend le craft |
| **Connaissance Requise** | Si vous devez d'abord apprendre la recette |

### Types de Matériaux

Les recettes peuvent accepter des matériaux de différentes manières :

- **Objet Spécifique** - Seul un objet spécifique fonctionne
- **Type de Ressource** - N'importe quel objet de ce type de ressource (ex: n'importe quel bois)
- **Tag d'Objet** - Objets avec un tag correspondant

## Apprentissage des Recettes

Certaines recettes doivent être découvertes ou apprises avant de pouvoir les crafter.

### Façons d'Apprendre des Recettes

- **Découverte** - Trouver et interagir avec des objets dans le monde
- **Objets de Recette** - Consommer des objets spéciaux qui enseignent des recettes
- **Progression** - Débloquer via la progression mondiale (système de Mémoires)

## Conseils de Craft

### Pour Commencer

1. **Accédez au Fieldcraft** - Ouvrez votre inventaire pour trouver le craft portable
2. **Trouvez un Établi** - Localisez des stations de craft dans le monde ou craftez-en une
3. **Consultez les Catégories** - Parcourez les catégories pour trouver ce dont vous avez besoin
4. **Rassemblez les Matériaux** - La recette montrera les objets requis

### Stockage des Matériaux

Les établis peuvent automatiquement récupérer les matériaux des coffres à proximité :

- Rayon de recherche horizontal : 7 blocs
- Rayon de recherche vertical : 3 blocs
- Maximum de coffres recherchés : 100

Gardez vos matériaux organisés dans des coffres près de vos stations de craft pour plus de commodité.

## Voir Aussi

- [Système de Craft (Technique)](/docs/api/server-internals/modules/crafting-system) - Documentation technique détaillée
- [Objets](/docs/modding/data-assets/items/overview) - Définitions et propriétés des objets

---

*Ce guide couvre les mécaniques de craft principales. Les recettes et objets spécifiques sont encore en cours de documentation pendant l'Accès Anticipé de Hytale.*
