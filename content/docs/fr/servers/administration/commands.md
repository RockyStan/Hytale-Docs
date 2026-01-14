---
id: commands
title: Commandes du serveur
sidebar_label: Commandes
sidebar_position: 1
---

# Commandes du serveur

Commandes console et en jeu pour l'administration du serveur Hytale.

---

## Commandes Joueur

Commandes pour gerer les joueurs, leurs modes de jeu, statistiques, effets et camera.

### gamemode

Change le mode de jeu d'un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/gamemode <gamemode> [joueur]` |
| **Alias** | `gm` |
| **Permission** | `gamemode.self`, `gamemode.other` |

**Parametres :**
- `gamemode` - Le mode de jeu a definir (ex: Creative, Adventure, Survival)
- `joueur` (optionnel) - Joueur cible (necessite la permission `gamemode.other`)

**Exemples :**
```
/gamemode creative
/gamemode adventure NomJoueur
/gm survival
```

---

### kill

Tue instantanement un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/kill [joueur]` |
| **Permission** | `kill.self`, `kill.other` |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (necessite la permission `kill.other`)

**Exemples :**
```
/kill
/kill NomJoueur
```

---

### damage

Inflige des degats a un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/damage [montant] [--silent] [joueur]` |
| **Alias** | `hurt` |
| **Permission** | `damage.self`, `damage.other` |

**Parametres :**
- `montant` (optionnel) - Quantite de degats a infliger (defaut: 1.0)
- `--silent` (drapeau) - Supprime le message de notification de degats
- `joueur` (optionnel) - Joueur cible (necessite la permission `damage.other`)

**Exemples :**
```
/damage
/damage 5.0
/damage 10 --silent NomJoueur
/hurt 3.5
```

---

### hide

Cache un joueur aux autres joueurs.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/hide <joueur> [cible]` |
| **Sous-commandes** | `show`, `all`, `showall` |

**Parametres :**
- `joueur` - Le joueur a cacher
- `cible` (optionnel) - Cacher uniquement d'un joueur specifique (cache de tous si non specifie)

**Sous-commandes :**
- `/hide show <joueur> [cible]` - Rendre un joueur visible a nouveau
- `/hide all` - Cacher tous les joueurs les uns des autres
- `/hide showall` - Rendre tous les joueurs visibles les uns aux autres

**Exemples :**
```
/hide NomJoueur
/hide NomJoueur JoueurCible
/hide show NomJoueur
/hide all
/hide showall
```

---

### whereami

Affiche la position actuelle et les informations du monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/whereami [joueur]` |
| **Permission** | `whereami.self`, `whereami.other` |
| **Mode de jeu** | Creative |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (necessite la permission `whereami.other`)

**Informations affichees :**
- Nom du monde
- Coordonnees du chunk (X, Y, Z)
- Coordonnees de position (X, Y, Z)
- Rotation de la tete (lacet, tangage, roulis)
- Informations de direction et d'axe
- Statut de sauvegarde du chunk

**Exemples :**
```
/whereami
/whereami NomJoueur
```

---

### whoami

Affiche les informations d'identite du joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/whoami [joueur]` |
| **Alias** | `uuid` |
| **Mode de jeu** | Adventure |

**Parametres :**
- `joueur` (optionnel) - Joueur cible

**Informations affichees :**
- UUID du joueur
- Nom d'utilisateur
- Preference de langue

**Exemples :**
```
/whoami
/uuid
/whoami NomJoueur
```

---

### player stats

Gere les statistiques du joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player stats <sous-commande>` |
| **Alias** | `stat` |

**Sous-commandes :**

| Sous-commande | Syntaxe | Description |
|---------------|---------|-------------|
| `get` | `/player stats get <nomStat> [joueur]` | Obtenir la valeur d'une stat |
| `set` | `/player stats set <nomStat> <valeur> [joueur]` | Definir une stat a une valeur specifique |
| `add` | `/player stats add <nomStat> <valeur> [joueur]` | Ajouter a une valeur de stat |
| `reset` | `/player stats reset [joueur]` | Reinitialiser toutes les stats |
| `settomax` | `/player stats settomax <nomStat> [joueur]` | Definir une stat a sa valeur maximale |
| `dump` | `/player stats dump [joueur]` | Afficher toutes les stats |

**Exemples :**
```
/player stats get health
/player stats set health 100
/player stats add stamina 50
/player stats settomax health
/player stats dump
```

---

### player effect

Appliquer ou effacer des effets sur les joueurs.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player effect <sous-commande>` |

**Sous-commandes :**

| Sous-commande | Syntaxe | Description |
|---------------|---------|-------------|
| `apply` | `/player effect apply <effet> [duree] [joueur]` | Appliquer un effet |
| `clear` | `/player effect clear [joueur]` | Effacer tous les effets |

**Parametres :**
- `effet` - L'ID de l'asset d'effet a appliquer
- `duree` (optionnel) - Duree en ticks (defaut: 100)
- `joueur` (optionnel) - Joueur cible

**Permissions :**
- `player.effect.apply.self`, `player.effect.apply.other`
- `player.effect.clear.self`, `player.effect.clear.other`

**Exemples :**
```
/player effect apply speed_boost
/player effect apply regeneration 200
/player effect apply strength 150 NomJoueur
/player effect clear
```

---

### player camera

Controle les modes de camera du joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player camera <sous-commande>` |

**Sous-commandes :**

| Sous-commande | Syntaxe | Description |
|---------------|---------|-------------|
| `reset` | `/player camera reset [joueur]` | Reinitialiser la camera par defaut |
| `topdown` | `/player camera topdown [joueur]` | Definir la vue camera du dessus |
| `sidescroller` | `/player camera sidescroller [joueur]` | Definir la vue camera side-scroller |
| `demo` | `/player camera demo <activate\|deactivate>` | Mode camera demo |

**Exemples :**
```
/player camera reset
/player camera topdown
/player camera sidescroller NomJoueur
/player camera demo activate
```

---

## Commandes Entite

Commandes pour gerer les entites dans le monde.

### entity clone

Clone une entite.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity clone [entite] [nombre]` |

**Parametres :**
- `entite` (optionnel) - ID de l'entite a cloner (utilise l'entite regardee si non specifie)
- `nombre` (optionnel) - Nombre de clones a creer (defaut: 1)

**Exemples :**
```
/entity clone
/entity clone 12345
/entity clone 12345 5
```

---

### entity remove

Supprime une entite du monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity remove [entite] [--others]` |

**Parametres :**
- `entite` (optionnel) - ID de l'entite a supprimer (utilise l'entite regardee si non specifie)
- `--others` (drapeau) - Supprimer toutes les autres entites non-joueur sauf celle specifiee

**Exemples :**
```
/entity remove
/entity remove 12345
/entity remove 12345 --others
```

---

### entity dump

Exporte les donnees de l'entite dans le journal du serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity dump [entite]` |

**Parametres :**
- `entite` (optionnel) - ID de l'entite a exporter (utilise l'entite regardee si non specifie)

**Exemples :**
```
/entity dump
/entity dump 12345
```

---

### entity clean

Supprime toutes les entites non-joueur du monde actuel.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity clean` |

**Attention :** C'est une commande destructive qui supprime toutes les entites sauf les joueurs.

**Exemples :**
```
/entity clean
```

---

### entity count

Affiche le nombre total d'entites dans le monde actuel.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity count` |

**Exemples :**
```
/entity count
```

---

### entity stats

Gere les statistiques des entites.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity stats <sous-commande>` |
| **Alias** | `stat` |

**Sous-commandes :**

| Sous-commande | Syntaxe | Description |
|---------------|---------|-------------|
| `get` | `/entity stats get <nomStat> [entite]` | Obtenir la valeur d'une stat |
| `set` | `/entity stats set <nomStat> <valeur> [entite]` | Definir une valeur de stat |
| `add` | `/entity stats add <nomStat> <valeur> [entite]` | Ajouter a une valeur de stat |
| `reset` | `/entity stats reset [entite]` | Reinitialiser toutes les stats |
| `settomax` | `/entity stats settomax <nomStat> [entite]` | Definir une stat au maximum |
| `dump` | `/entity stats dump [entite]` | Afficher toutes les stats |

**Exemples :**
```
/entity stats get health
/entity stats set health 50
/entity stats dump
```

---

### entity effect

Appliquer un effet aux entites.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity effect <effet> [duree] [entite]` |

**Parametres :**
- `effet` - L'ID de l'asset d'effet a appliquer
- `duree` (optionnel) - Duree en ticks (defaut: 100)
- `entite` (optionnel) - Entite cible

**Exemples :**
```
/entity effect poison
/entity effect slow 200
```

---

### entity intangible

Rend une entite intangible (sans collision).

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity intangible [--remove] [entite]` |

**Parametres :**
- `--remove` (drapeau) - Retirer le statut intangible au lieu de l'ajouter
- `entite` (optionnel) - Entite cible

**Exemples :**
```
/entity intangible
/entity intangible --remove
/entity intangible 12345
```

---

### entity invulnerable

Rend une entite invulnerable aux degats.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity invulnerable [--remove] [entite]` |

**Parametres :**
- `--remove` (drapeau) - Retirer le statut invulnerable au lieu de l'ajouter
- `entite` (optionnel) - Entite cible

**Exemples :**
```
/entity invulnerable
/entity invulnerable --remove
/entity invulnerable 12345
```

---

## Commandes Monde

Commandes pour gerer les chunks et les cartes du monde.

### chunk info

Affiche des informations detaillees sur un chunk.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk info <x> <z>` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)

**Informations affichees :**
- Statut d'initialisation
- Statut de generation
- Statut de tick
- Statut de sauvegarde
- Details des sections

**Exemples :**
```
/chunk info 0 0
/chunk info ~ ~
/chunk info ~5 ~-3
```

---

### chunk load

Charge un chunk en memoire.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk load <x> <z> [--markdirty]` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)
- `--markdirty` (drapeau) - Marquer le chunk comme necessitant une sauvegarde

**Exemples :**
```
/chunk load 0 0
/chunk load ~ ~
/chunk load 10 10 --markdirty
```

---

### chunk unload

Decharge un chunk de la memoire.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk unload <x> <z>` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)

**Exemples :**
```
/chunk unload 0 0
/chunk unload ~ ~
```

---

### chunk regenerate

Regenere un chunk (ATTENTION : destructif).

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk regenerate <x> <z>` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)

**Attention :** Cela regenerera le chunk, perdant toutes les modifications des joueurs.

**Exemples :**
```
/chunk regenerate 0 0
/chunk regenerate ~ ~
```

---

### worldmap discover

Decouvre des zones sur la carte du monde pour un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldmap discover [zone]` |
| **Alias** | `disc` |

**Parametres :**
- `zone` (optionnel) - Nom de la zone a decouvrir, ou "all" pour decouvrir toutes les zones. Si non specifie, liste les zones disponibles.

**Exemples :**
```
/worldmap discover
/worldmap discover all
/worldmap discover ForestZone
/map disc all
```

---

### worldmap undiscover

Retire les zones decouvertes de la carte du monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldmap undiscover [zone]` |

**Parametres :**
- `zone` (optionnel) - Nom de la zone a retirer, ou "all" pour retirer toutes les zones. Si non specifie, liste les zones decouvertes.

**Exemples :**
```
/worldmap undiscover
/worldmap undiscover all
/worldmap undiscover ForestZone
```

---

## Commandes Serveur

Commandes pour l'administration du serveur.

### stop

Arrete le serveur proprement.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/stop [--crash]` |
| **Alias** | `shutdown` |

**Parametres :**
- `--crash` (drapeau) - Simuler un arret par crash au lieu d'un arret propre

**Exemples :**
```
/stop
/shutdown
/stop --crash
```

---

### kick

Expulse un joueur du serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/kick <joueur>` |

**Parametres :**
- `joueur` - Le joueur a expulser

**Exemples :**
```
/kick NomJoueur
```

---

### who

Liste tous les joueurs en ligne par monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/who` |
| **Mode de jeu** | Adventure |

**Informations affichees :**
- Joueurs organises par monde
- Noms d'affichage (si definis) et noms d'utilisateur

**Exemples :**
```
/who
```

---

### maxplayers

Obtient ou definit le nombre maximum de joueurs.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/maxplayers [montant]` |

**Parametres :**
- `montant` (optionnel) - Nouveau nombre maximum de joueurs. Si non specifie, affiche la valeur actuelle.

**Exemples :**
```
/maxplayers
/maxplayers 50
```

---

### auth

Commandes de gestion d'authentification.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/auth <sous-commande>` |

**Sous-commandes :**

| Sous-commande | Description |
|---------------|-------------|
| `status` | Verifier le statut d'authentification |
| `login` | Se connecter au service d'authentification |
| `select` | Selectionner un compte d'authentification |
| `logout` | Se deconnecter de l'authentification |
| `cancel` | Annuler l'authentification en cours |
| `persistence` | Gerer la persistance de l'authentification |

**Exemples :**
```
/auth status
/auth login
/auth logout
```

---

## Commandes Utilitaires

Commandes utilitaires generales.

### help

Affiche les informations d'aide pour les commandes.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/help [commande]` |
| **Alias** | `?` |
| **Mode de jeu** | Adventure |

**Parametres :**
- `commande` (optionnel) - Nom de la commande pour obtenir de l'aide. Ouvre l'interface de liste de commandes si non specifie.

**Exemples :**
```
/help
/?
/help gamemode
```

---

### backup

Cree une sauvegarde des donnees du serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/backup` |

**Prerequis :**
- Le serveur doit etre completement demarre
- Le repertoire de sauvegarde doit etre configure dans les options du serveur

**Exemples :**
```
/backup
```

---

### notify

Envoie une notification a tous les joueurs.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/notify [style] <message>` |

**Parametres :**
- `style` (optionnel) - Style de notification (Default, Warning, Error, etc.)
- `message` - Le message a envoyer (supporte les messages formates avec `{...}`)

**Exemples :**
```
/notify Bonjour a tous !
/notify Warning Redemarrage du serveur dans 5 minutes
/notify {"text": "Message formate", "color": "red"}
```

---

### sound 2d

Joue un effet sonore 2D.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/sound 2d <son> [categorie] [--all] [joueur]` |
| **Alias** | `play` |

**Parametres :**
- `son` - ID de l'asset d'evenement sonore
- `categorie` (optionnel) - Categorie de son (defaut: SFX)
- `--all` (drapeau) - Jouer pour tous les joueurs dans le monde
- `joueur` (optionnel) - Joueur cible

**Exemples :**
```
/sound 2d ui_click
/sound play notification SFX
/sound 2d alert --all
```

---

### sound 3d

Joue un effet sonore 3D positionnel.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/sound 3d <son> [categorie] <x> <y> <z> [--all] [joueur]` |
| **Alias** | `play3d` |

**Parametres :**
- `son` - ID de l'asset d'evenement sonore
- `categorie` (optionnel) - Categorie de son (defaut: SFX)
- `x y z` - Coordonnees de position (supporte les coordonnees relatives avec ~)
- `--all` (drapeau) - Jouer pour tous les joueurs dans le monde
- `joueur` (optionnel) - Joueur cible

**Exemples :**
```
/sound 3d explosion SFX 100 64 200
/sound play3d ambient ~ ~ ~
/sound 3d alert SFX ~ ~10 ~ --all
```

---

## Commandes de Debogage

Commandes pour le debogage et la surveillance.

### ping

Affiche les informations de ping/latence.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/ping [--detail] [joueur]` |
| **Sous-commandes** | `clear`, `graph` |
| **Mode de jeu** | Adventure |

**Parametres :**
- `--detail` (drapeau) - Afficher les informations de ping detaillees
- `joueur` (optionnel) - Joueur cible

**Sous-commandes :**
- `/ping clear [joueur]` - Effacer l'historique de ping
- `/ping graph [largeur] [hauteur] [joueur]` - Afficher le graphique de ping

**Exemples :**
```
/ping
/ping --detail
/ping NomJoueur
/ping clear
/ping graph 80 15
```

---

### version

Affiche les informations de version du serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/version` |

**Informations affichees :**
- Version du serveur
- Patchline
- Environnement (si pas release)

**Exemples :**
```
/version
```

---

### log

Gere les niveaux de journalisation.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/log <logger> [niveau] [--save] [--reset]` |

**Parametres :**
- `logger` - Nom du logger (ou "global" pour le logger global)
- `niveau` (optionnel) - Niveau de log (OFF, SEVERE, WARNING, INFO, CONFIG, FINE, FINER, FINEST, ALL)
- `--save` (drapeau) - Sauvegarder le niveau de log dans la config du serveur
- `--reset` (drapeau) - Reinitialiser le logger au niveau par defaut

**Exemples :**
```
/log global
/log global INFO
/log global FINE --save
/log network WARNING
/log network --reset
```

---

### server stats memory

Affiche les statistiques de memoire du serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/server stats memory` |
| **Alias** | `mem` |

**Informations affichees :**
- Memoire physique totale et libre
- Memoire swap totale et libre
- Utilisation de la memoire heap (init, utilise, commis, max, libre)
- Utilisation de la memoire non-heap
- Objets en attente de finalisation

**Exemples :**
```
/server stats memory
/server stats mem
```

---

### server stats cpu

Affiche les statistiques CPU du serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/server stats cpu` |

**Informations affichees :**
- Charge CPU systeme
- Charge CPU processus
- Moyenne de charge systeme
- Temps de fonctionnement du processus

**Exemples :**
```
/server stats cpu
```

---

## Commandes Inventaire

Commandes pour gerer les inventaires des joueurs, objets et equipements.

### give

Donne des objets a un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/give <objet> [quantite] [metadonnees]` |
| **Permission** | `give.self`, `give.other` |

**Parametres :**
- `objet` - L'ID de l'asset de l'objet a donner
- `quantite` (optionnel) - Nombre d'objets a donner (defaut: 1)
- `metadonnees` (optionnel) - Chaine JSON de metadonnees pour l'objet

**Variantes d'utilisation :**
- `/give <joueur> <objet> [quantite] [metadonnees]` - Donner des objets a un autre joueur (necessite la permission `give.other`)

**Exemples :**
```
/give Sword_Iron
/give Sword_Iron 5
/give NomJoueur Pickaxe_Diamond 1
/give Potion_Health 3 {"durability": 100}
```

---

### give armor

Donne un ensemble complet d'armure correspondant a un motif de recherche.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/give armor <recherche> [--set] [joueur]` |

**Parametres :**
- `recherche` - Chaine de recherche pour correspondre aux types d'armure (ex: "Iron", "Diamond")
- `--set` (drapeau) - Effacer l'armure existante avant d'ajouter la nouvelle
- `joueur` (optionnel) - Joueur cible (utiliser "*" pour tous les joueurs)

**Exemples :**
```
/give armor Iron
/give armor Diamond --set
/give armor Gold NomJoueur
/give armor Iron *
```

---

### inventory

Commande parente pour les sous-commandes de gestion d'inventaire.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/inventory <sous-commande>` |
| **Alias** | `inv` |

**Sous-commandes :**
- `clear` - Vider l'inventaire
- `see` - Voir l'inventaire d'un autre joueur
- `item` - Ouvrir le conteneur d'objet
- `backpack` - Gerer la taille du sac a dos

---

### inventory clear

Vide l'inventaire entier du joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/inventory clear` |
| **Alias** | `/inv clear` |
| **Mode de jeu** | Creative |

**Exemples :**
```
/inventory clear
/inv clear
```

---

### inventory see

Ouvre et visualise l'inventaire d'un autre joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/inventory see <joueur>` |
| **Permission** | `invsee.modify` (pour modification) |

**Parametres :**
- `joueur` - Joueur cible dont visualiser l'inventaire

**Notes :**
- Sans permission `invsee.modify`, l'inventaire est en lecture seule
- Ouvre l'inventaire du joueur cible dans une interface de banc

**Exemples :**
```
/inventory see NomJoueur
/inv see NomJoueur
```

---

### inventory item

Ouvre le conteneur de l'objet actuellement tenu (ex: sac a dos, bourse).

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/inventory item` |

**Prerequis :**
- Doit avoir un objet en main
- L'objet doit avoir un composant conteneur

**Exemples :**
```
/inventory item
/inv item
```

---

### inventory backpack

Obtient ou definit la capacite du sac a dos.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/inventory backpack [taille]` |

**Parametres :**
- `taille` (optionnel) - Nouvelle capacite du sac a dos. Si non specifie, affiche la capacite actuelle.

**Notes :**
- Les objets qui ne rentrent plus apres redimensionnement sont jetes au sol

**Exemples :**
```
/inventory backpack
/inventory backpack 20
/inv backpack 30
```

---

### itemstate

Definit l'etat de l'objet actuellement tenu.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/itemstate <etat>` |
| **Mode de jeu** | Creative |

**Parametres :**
- `etat` - La chaine d'etat a appliquer a l'objet

**Prerequis :**
- Doit avoir un objet dans l'emplacement actif de la barre rapide

**Exemples :**
```
/itemstate charged
/itemstate broken
/itemstate enchanted
```

---

## Commandes Eclairage

Commandes pour gerer les calculs d'eclairage et les donnees du monde.

### lighting

Commande parente pour les sous-commandes d'eclairage.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/lighting <sous-commande>` |
| **Alias** | `light` |

**Sous-commandes :**
- `get` - Obtenir les valeurs de lumiere a une position
- `send` - Activer/desactiver l'envoi des donnees d'eclairage
- `info` - Afficher les informations du systeme d'eclairage
- `calculation` - Definir le mode de calcul d'eclairage
- `invalidate` - Invalider les donnees d'eclairage

---

### lighting get

Obtient les valeurs de lumiere a une position specifique.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/lighting get <x> <y> <z> [--hex]` |

**Parametres :**
- `x y z` - Coordonnees de bloc (supporte les coordonnees relatives avec ~)
- `--hex` (drapeau) - Afficher la valeur de lumiere en format hexadecimal

**Informations affichees :**
- Valeur de lumiere rouge (0-15)
- Valeur de lumiere verte (0-15)
- Valeur de lumiere bleue (0-15)
- Valeur de lumiere du ciel (0-15)

**Exemples :**
```
/lighting get 0 64 0
/lighting get ~ ~ ~
/lighting get ~ ~1 ~ --hex
/light get 100 50 200
```

---

### lighting send

Controle si les donnees d'eclairage sont envoyees aux clients.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/lighting send <local\|global> [active]` |

**Sous-commandes :**
- `local` - Activer/desactiver l'envoi des donnees d'eclairage local
- `global` - Activer/desactiver l'envoi des donnees d'eclairage global

**Parametres :**
- `active` (optionnel) - Valeur booleenne. Bascule si non specifie.

**Exemples :**
```
/lighting send local
/lighting send local true
/lighting send global false
```

---

### lighting info

Affiche des informations sur le systeme d'eclairage.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/lighting info [--detail]` |

**Parametres :**
- `--detail` (drapeau) - Afficher les statistiques detaillees d'eclairage des chunks

**Informations affichees :**
- Taille de la file d'attente d'eclairage
- Type de calcul de lumiere
- (Avec --detail) Sections de chunks totales, sections avec lumiere locale/globale

**Exemples :**
```
/lighting info
/lighting info --detail
```

---

### lighting calculation

Definit le mode de calcul d'eclairage.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/lighting calculation <type> [--invalidate]` |

**Parametres :**
- `type` - Type de calcul : `FLOOD` ou `FULLBRIGHT`
- `--invalidate` (drapeau) - Invalider tous les chunks charges apres le changement

**Types de calcul :**
- `FLOOD` - Calcul d'eclairage standard par remplissage
- `FULLBRIGHT` - Luminosite maximale (sans ombres)

**Exemples :**
```
/lighting calculation FLOOD
/lighting calculation FULLBRIGHT
/lighting calculation FLOOD --invalidate
```

---

### lighting invalidate

Invalide les donnees d'eclairage, forcant le recalcul.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/lighting invalidate [--one]` |

**Parametres :**
- `--one` (drapeau) - Invalider uniquement la section de chunk a la position du joueur

**Notes :**
- Sans `--one`, invalide tous les chunks charges
- Necessite un contexte joueur lors de l'utilisation de `--one`

**Exemples :**
```
/lighting invalidate
/lighting invalidate --one
```

---

## Commandes Generation de Monde

Commandes pour la gestion et le benchmarking de la generation de monde.

### worldgen

Commande parente pour les sous-commandes de generation de monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldgen <sous-commande>` |
| **Alias** | `wg` |

**Sous-commandes :**
- `reload` - Recharger les parametres de generation de monde
- `benchmark` - Tester les performances de generation de monde

---

### worldgen reload

Recharge la configuration de generation de monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldgen reload [--clear]` |

**Parametres :**
- `--clear` (drapeau) - Supprimer tous les chunks sauvegardes et regenerer les chunks charges

**Attention :** L'utilisation de `--clear` supprimera toutes les donnees de chunks et regenerera le monde.

**Exemples :**
```
/worldgen reload
/wg reload
/worldgen reload --clear
```

---

### worldgen benchmark

Teste les performances de generation de monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldgen benchmark <pos1> <pos2> [monde] [graine]` |

**Parametres :**
- `pos1` - Coordonnees du premier coin (X, Z)
- `pos2` - Coordonnees du second coin (X, Z)
- `monde` (optionnel) - Monde cible
- `graine` (optionnel) - Graine de generation (utilise la graine du monde si non specifie)

**Notes :**
- Genere les chunks dans la zone specifiee pour le benchmarking
- Les resultats sont sauvegardes dans le dossier `quantification/`
- Fonctionne uniquement avec les generateurs de monde supportant le benchmarking

**Exemples :**
```
/worldgen benchmark 0,0 1000,1000
/wg benchmark -500,-500 500,500
/worldgen benchmark 0,0 2000,2000 MonMonde 12345
```

---

## Commandes d'Apparition

Commandes pour faire apparaitre des entites dans le monde.

### spawnblock

Fait apparaitre une entite de bloc a une position specifiee.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/spawnblock <bloc> <x> <y> <z> [rotation]` |

**Parametres :**
- `bloc` - Cle du type de bloc a faire apparaitre
- `x y z` - Coordonnees de position (supporte les coordonnees relatives avec ~)
- `rotation` (optionnel) - Vecteur de rotation (lacet, tangage, roulis)

**Exemples :**
```
/spawnblock Chest ~ ~ ~
/spawnblock Torch 100 64 200
/spawnblock Lantern ~ ~2 ~ 0,45,0
```

---

## Commandes Joueur Supplementaires

Commandes etendues de gestion des joueurs.

### player respawn

Force un joueur a reapparaitre.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player respawn [joueur]` |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Notes :**
- Supprime le composant de mort, permettant au joueur de reapparaitre

**Exemples :**
```
/player respawn
/player respawn NomJoueur
```

---

### player reset

Reinitialise completement les donnees d'un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player reset [joueur]` |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Attention :** Cela reinitialise toutes les donnees du joueur incluant l'inventaire, les statistiques et la progression.

**Exemples :**
```
/player reset
/player reset NomJoueur
```

---

### player zone

Affiche les informations de zone et de biome actuels.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player zone [joueur]` |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Informations affichees :**
- Nom de la zone actuelle
- Nom du biome actuel

**Exemples :**
```
/player zone
/player zone NomJoueur
```

---

### player viewradius

Gere les parametres de rayon de vue du joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/player viewradius <sous-commande>` |

**Sous-commandes :**

| Sous-commande | Syntaxe | Description |
|---------------|---------|-------------|
| `get` | `/player viewradius get [joueur]` | Obtenir le rayon de vue actuel |
| `set` | `/player viewradius set <rayon> [--blocks] [--bypass] [joueur]` | Definir le rayon de vue |

**Parametres de set :**
- `rayon` - Rayon de vue en chunks (ou "default" pour 32)
- `--blocks` (drapeau) - Interpreter le rayon en blocs au lieu de chunks
- `--bypass` (drapeau) - Permettre de depasser le maximum du serveur

**Exemples :**
```
/player viewradius get
/player viewradius set 16
/player viewradius set 512 --blocks
/player viewradius set default
```

---

### sudo

Execute une commande en tant qu'un autre joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/sudo <joueur> <commande>` |
| **Alias** | `su` |

**Parametres :**
- `joueur` - Joueur cible (ou "*" pour tous les joueurs)
- `commande` - Commande a executer (avec ou sans / initial)

**Exemples :**
```
/sudo NomJoueur gamemode creative
/sudo * notify Bonjour a tous !
/su NomJoueur /whereami
```

---

### refer

Transfere un joueur vers un autre serveur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/refer <hote> <port> [joueur]` |
| **Alias** | `transfer` |
| **Permission** | `refer.self`, `refer.other` |

**Parametres :**
- `hote` - Nom d'hote ou IP du serveur cible
- `port` - Port du serveur cible (1-65535)
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Exemples :**
```
/refer play.example.com 25565
/refer 192.168.1.100 25565 NomJoueur
/transfer server.example.net 25566
```

---

### toggleBlockPlacementOverride

Bascule le contournement des restrictions de placement de blocs.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/toggleBlockPlacementOverride` |
| **Alias** | `tbpo`, `togglePlacement` |

**Notes :**
- Lorsqu'active, permet de placer des blocs dans les zones restreintes
- Utile pour construire dans les zones protegees

**Exemples :**
```
/toggleBlockPlacementOverride
/tbpo
/togglePlacement
```

---

## Commandes Entite Supplementaires

Commandes etendues de gestion des entites.

### entity nameplate

Definit ou supprime les plaques nominatives des entites.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity nameplate <texte> [entite]` |

**Parametres :**
- `texte` - Le texte a afficher sur la plaque nominative
- `entite` (optionnel) - ID de l'entite (utilise l'entite regardee si non specifie)

**Variantes d'utilisation :**
- `/entity nameplate <texte> [entite]` - Definir le texte de la plaque nominative
- `/entity nameplate [entite]` - Supprimer la plaque nominative

**Exemples :**
```
/entity nameplate "Boss Monstre"
/entity nameplate "Marchand" 12345
/entity nameplate
```

---

### entity resend

Force le renvoi de toutes les donnees d'entite a un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity resend <joueur>` |

**Parametres :**
- `joueur` - Joueur cible pour le renvoi des entites

**Notes :**
- Fait disparaitre toutes les entites pour le joueur, provoquant leur renvoi

**Exemples :**
```
/entity resend NomJoueur
```

---

### entity tracker

Affiche les statistiques du traqueur d'entites pour un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity tracker <joueur>` |

**Parametres :**
- `joueur` - Joueur cible

**Informations affichees :**
- Nombre d'entites visibles
- Nombre exclu par LOD
- Nombre d'entites cachees
- Total d'entites suivies
- Total d'entites du monde
- Informations de rayon de vue

**Exemples :**
```
/entity tracker NomJoueur
```

---

### entity lod

Definit le ratio de culling LOD (Level of Detail) des entites.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity lod <ratio>` |

**Parametres :**
- `ratio` - Valeur du ratio LOD (ex: 0.000035)

**Sous-commandes :**
- `/entity lod default` - Reinitialiser au ratio LOD par defaut (0.000035)

**Exemples :**
```
/entity lod 0.00005
/entity lod 0.00002
/entity lod default
```

---

### entity interactable

Rend une entite interactive ou supprime l'interactivite.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity interactable [--disable] [entite]` |

**Parametres :**
- `--disable` (drapeau) - Supprimer l'interactivite au lieu de l'ajouter
- `entite` (optionnel) - ID de l'entite (utilise l'entite regardee si non specifie)

**Exemples :**
```
/entity interactable
/entity interactable --disable
/entity interactable 12345
```

---

### entity hidefromadventureplayers

Cache une entite des joueurs en mode Aventure.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/entity hidefromadventureplayers [--remove] [entite]` |

**Parametres :**
- `--remove` (drapeau) - Supprimer le masquage au lieu de l'ajouter
- `entite` (optionnel) - ID de l'entite (utilise l'entite regardee si non specifie)

**Exemples :**
```
/entity hidefromadventureplayers
/entity hidefromadventureplayers --remove
/entity hidefromadventureplayers 12345
```

---

## Commandes Chunk Supplementaires

Commandes etendues de gestion des chunks.

### chunk fixheight

Corrige la carte de hauteur d'un chunk et recalcule l'eclairage.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk fixheight <x> <z>` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)

**Notes :**
- Recalcule la carte de hauteur du chunk
- Invalide et recalcule l'eclairage
- Utile pour corriger les bugs d'eclairage

**Exemples :**
```
/chunk fixheight 0 0
/chunk fixheight ~ ~
```

---

### chunk forcetick

Force tous les blocs d'un chunk a ticker.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk forcetick <x> <z>` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)

**Notes :**
- Met tous les blocs du chunk en etat de tick
- Le chunk doit etre charge

**Exemples :**
```
/chunk forcetick 0 0
/chunk forcetick ~ ~
```

---

### chunk loaded

Affiche les informations des chunks charges pour un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk loaded [joueur]` |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Exemples :**
```
/chunk loaded
/chunk loaded NomJoueur
```

---

### chunk resend

Force le renvoi de tous les chunks a un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk resend [--clearcache] [joueur]` |

**Parametres :**
- `--clearcache` (drapeau) - Invalider aussi les caches de section de chunk
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Exemples :**
```
/chunk resend
/chunk resend --clearcache
/chunk resend NomJoueur
```

---

### chunk tracker

Affiche les statistiques du traqueur de chunks pour un joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk tracker [joueur]` |

**Parametres :**
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Informations affichees :**
- Max chunks par seconde/tick
- Rayon min/max de chunks charges
- Chunks joueur charges/en chargement
- Chunks du monde charges

**Exemples :**
```
/chunk tracker
/chunk tracker NomJoueur
```

---

### chunk maxsendrate

Obtient ou definit les limites de taux d'envoi de chunks.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk maxsendrate [--sec=<valeur>] [--tick=<valeur>] [joueur]` |

**Parametres :**
- `--sec` (optionnel) - Maximum de chunks par seconde
- `--tick` (optionnel) - Maximum de chunks par tick
- `joueur` (optionnel) - Joueur cible (soi-meme si non specifie)

**Exemples :**
```
/chunk maxsendrate
/chunk maxsendrate --sec=50
/chunk maxsendrate --tick=5
/chunk maxsendrate --sec=100 --tick=10 NomJoueur
```

---

### chunk marksave

Marque un chunk comme necessitant une sauvegarde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk marksave <x> <z>` |

**Parametres :**
- `x z` - Coordonnees du chunk (supporte les coordonnees relatives avec ~)

**Notes :**
- Si le chunk n'est pas charge, il sera charge d'abord

**Exemples :**
```
/chunk marksave 0 0
/chunk marksave ~ ~
```

---

### chunk tint

Definit la couleur de teinte pour un chunk.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/chunk tint <couleur> [--blur] [--radius=<valeur>] [--sigma=<valeur>]` |

**Parametres :**
- `couleur` - Valeur couleur hexadecimale (ex: #FF0000)
- `--blur` (drapeau) - Appliquer un flou gaussien a la teinte
- `--radius` (optionnel) - Rayon de flou (defaut: 5)
- `--sigma` (optionnel) - Valeur sigma du flou (defaut: 1.5)

**Variantes d'utilisation :**
- `/chunk tint` - Ouvre l'interface de selection de couleur de teinte

**Exemples :**
```
/chunk tint #FF0000
/chunk tint #00FF00 --blur
/chunk tint #0000FF --blur --radius=10 --sigma=2.0
```

---

## Commandes Carte du Monde Supplementaires

Commandes etendues de gestion de la carte du monde.

### worldmap reload

Recharge la configuration de la carte du monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldmap reload` |

**Exemples :**
```
/worldmap reload
/map reload
```

---

### worldmap clearmarkers

Efface tous les marqueurs de carte du monde pour le joueur.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldmap clearmarkers` |

**Exemples :**
```
/worldmap clearmarkers
/map clearmarkers
```

---

### worldmap viewradius

Gere les parametres de rayon de vue de la carte du monde.

| Propriete | Valeur |
|-----------|--------|
| **Syntaxe** | `/worldmap viewradius <sous-commande>` |

**Sous-commandes :**

| Sous-commande | Syntaxe | Description |
|---------------|---------|-------------|
| `get` | `/worldmap viewradius get [joueur]` | Obtenir le rayon de vue actuel |
| `set` | `/worldmap viewradius set <rayon> [--bypass] [joueur]` | Definir le rayon de vue |
| `remove` | `/worldmap viewradius remove [joueur]` | Supprimer le rayon de vue personnalise |

**Parametres de set :**
- `rayon` - Valeur du rayon de vue (max 512 sans bypass)
- `--bypass` (drapeau) - Permettre de depasser la limite maximale

**Exemples :**
```
/worldmap viewradius get
/worldmap viewradius set 256
/worldmap viewradius set 1024 --bypass
/worldmap viewradius remove
```
