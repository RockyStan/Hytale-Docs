---
id: network-protocol
title: Protocole Réseau
sidebar_label: Protocole Réseau
sidebar_position: 5
description: Comprendre le protocole réseau du serveur Hytale
---

# Protocole Réseau

Ce document décrit le protocole réseau Hytale utilisé pour la communication entre les clients et les serveurs. Les informations sont dérivées de l'analyse du code serveur décompilé.

## Aperçu du Protocole

Hytale utilise un protocole réseau moderne et efficace construit sur QUIC (Quick UDP Internet Connections).

| Propriété | Valeur |
|-----------|--------|
| Transport | QUIC sur UDP |
| Port par défaut | 5520 |
| Protocole applicatif | `hytale/1` |

QUIC offre plusieurs avantages par rapport au TCP traditionnel :
- **Latence réduite** : Établissement de connexion plus rapide avec prise en charge du 0-RTT
- **Flux multiplexés** : Plusieurs flux de données sans blocage en tête de ligne
- **Chiffrement intégré** : TLS 1.3 intégré au protocole
- **Migration de connexion** : Gère les changements de réseau de manière élégante

## Constantes du Protocole

Le protocole utilise les constantes suivantes définies dans `ProtocolSettings.java` :

| Constante | Valeur | Description |
|-----------|--------|-------------|
| `PROTOCOL_HASH` | `6708f121966c1c443f4b0eb525b2f81d0a8dc61f5003a692a8fa157e5e02cea9` | Hachage SHA-256 pour la validation de version |
| `PROTOCOL_VERSION` | 1 | Numéro de version du protocole |
| `PACKET_COUNT` | 268 | Nombre total de types de paquets |
| `STRUCT_COUNT` | 315 | Nombre total de structures de données |
| `ENUM_COUNT` | 136 | Nombre total d'énumérations |
| `MAX_PACKET_SIZE` | 1 677 721 600 | Taille maximale d'un paquet en octets (~1,6 Go) |
| `DEFAULT_PORT` | 5520 | Port serveur par défaut |

Le `PROTOCOL_HASH` est utilisé lors de la poignée de main pour s'assurer que le client et le serveur utilisent des versions de protocole compatibles.

## Interface Packet

Tous les paquets implémentent l'interface `Packet` (`com.hypixel.hytale.protocol.Packet`) :

```java
public interface Packet {
   int getId();
   void serialize(@Nonnull ByteBuf var1);
   int computeSize();
}
```

| Méthode | Description |
|---------|-------------|
| `getId()` | Retourne l'identifiant unique du paquet |
| `serialize(ByteBuf)` | Écrit les données du paquet dans un tampon d'octets |
| `computeSize()` | Calcule la taille sérialisée du paquet |

## Sérialisation

### Structure des Trames

Les paquets sont transmis sous forme de trames binaires préfixées par leur longueur :

```
+--------------------+------------------------+-------------------------+
| Longueur (4 octets) | ID du paquet (4 octets) | Charge utile (variable) |
+--------------------+------------------------+-------------------------+
```

| Composant | Taille | Description |
|-----------|--------|-------------|
| Préfixe de longueur | 4 octets | Longueur totale de la trame |
| ID du paquet | 4 octets | Identifie le type de paquet |
| Charge utile | Variable | Données spécifiques au paquet |
| **Taille minimale de trame** | 8 octets | Longueur + ID du paquet |

### Compression

Les paquets volumineux utilisent la compression **Zstd** (Zstandard) pour une utilisation efficace de la bande passante. Zstd offre :
- Des vitesses de compression et de décompression rapides
- Des taux de compression élevés
- Une prise en charge du streaming

Les paquets utilisant la compression ont un indicateur `IS_COMPRESSED = true` dans leur définition de classe.

### Entiers à Longueur Variable (VarInt)

Hytale implémente son propre encodage VarInt pour les entiers à longueur variable dans `com.hypixel.hytale.protocol.io.VarInt` :

```java
public static void write(@Nonnull ByteBuf buf, int value) {
   if (value < 0) {
      throw new IllegalArgumentException("VarInt cannot encode negative values: " + value);
   } else {
      while ((value & -128) != 0) {
         buf.writeByte(value & 127 | 128);
         value >>>= 7;
      }
      buf.writeByte(value);
   }
}
```

Caractéristiques principales :
- N'encode que les valeurs non négatives
- Utilise 7 bits par octet pour les données, 1 bit comme indicateur de continuation
- Les valeurs plus petites utilisent moins d'octets (efficace pour les petits nombres courants)

## Directions des Paquets

Les paquets circulent dans trois directions :

| Direction | Description | Exemple |
|-----------|-------------|---------|
| **Client vers Serveur** | Envoyés par les clients, traités par les gestionnaires de paquets du serveur | `ClientMovement`, `ChatMessage` |
| **Serveur vers Client** | Envoyés par le serveur, traités par le client | `SetChunk`, `EntityUpdates` |
| **Bidirectionnel** | Peuvent être envoyés par l'une ou l'autre partie | `Disconnect`, `SetPaused` |

Les paquets client vers serveur sont enregistrés dans `GamePacketHandler.registerHandlers()` :

```java
this.registerHandler(108, p -> this.handle((ClientMovement)p));
this.registerHandler(211, p -> this.handle((ChatMessage)p));
```

Les paquets serveur vers client sont encodés via `PacketEncoder.encode()` et envoyés à travers le canal réseau.

## Flux de Connexion

### Processus de Poignée de Main

1. **Le client se connecte** via le transport QUIC
2. **Le client envoie un paquet `Connect`** (ID 0) avec :
   - Le hachage du protocole pour la validation de version
   - Le type de client (Game ou Editor)
   - Le code de langue
   - Le jeton d'identité pour l'authentification
   - L'UUID et le nom d'utilisateur du joueur
3. **Le serveur valide** le hachage du protocole par rapport à la valeur attendue
4. **Le serveur valide** les identifiants d'authentification
5. **Le serveur répond** avec soit :
   - `ConnectAccept` (ID 14) - Connexion acceptée, peut inclure un défi de mot de passe
   - `Disconnect` (ID 1) - Connexion refusée avec raison
6. **L'authentification continue** via `AuthenticationPacketHandler`
7. **La phase de configuration** passe à `SetupPacketHandler`
8. **Le jeu** passe à `GamePacketHandler`

```
Client                                Serveur
   |                                    |
   |  -------- Connexion QUIC --------> |
   |                                    |
   |  -------- Connect (ID 0) --------> |
   |       protocolHash, clientType,    |
   |       language, identityToken,     |
   |       uuid, username               |
   |                                    |
   |  <----- ConnectAccept (ID 14) ---- |
   |       passwordChallenge (optionnel)|
   |                                    |
   |  -------- AuthToken (ID 12) -----> |
   |       accessToken,                 |
   |       serverAuthorizationGrant     |
   |                                    |
   |  <------ JoinWorld (ID 104) ------ |
   |                                    |
```

## Catégories de Paquets

Les paquets sont organisés en catégories fonctionnelles :

### Paquets de Connexion

Gèrent le cycle de vie de la connexion.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `Connect` | 0 | Client -> Serveur | Requête de connexion initiale |
| `Disconnect` | 1 | Bidirectionnel | Terminaison de connexion |
| `Ping` | 2 | Serveur -> Client | Requête de mesure de latence |
| `Pong` | 3 | Client -> Serveur | Réponse de mesure de latence |

### Paquets d'Authentification

Gèrent le flux d'authentification.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `Status` | 10 | Serveur -> Client | Informations sur le statut du serveur |
| `AuthToken` | 12 | Client -> Serveur | Soumission du jeton d'authentification |
| `ConnectAccept` | 14 | Serveur -> Client | Réponse de connexion acceptée |

### Paquets Joueur

Gèrent l'état et les actions du joueur.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `JoinWorld` | 104 | Serveur -> Client | Rejoindre un monde |
| `ClientReady` | 105 | Client -> Serveur | État prêt du client |
| `ClientMovement` | 108 | Client -> Serveur | Mise à jour du mouvement du joueur |
| `MouseInteraction` | 111 | Client -> Serveur | Événements d'entrée souris |
| `SyncPlayerPreferences` | 116 | Client -> Serveur | Synchroniser les paramètres du joueur |
| `ClientPlaceBlock` | 117 | Client -> Serveur | Requête de placement de bloc |
| `RemoveMapMarker` | 119 | Client -> Serveur | Supprimer un marqueur de carte |

### Paquets de Monde

Synchronisent les données du monde.

| Paquet | ID | Direction | Compressé | Description |
|--------|-----|-----------|-----------|-------------|
| `SetChunk` | 131 | Serveur -> Client | Oui | Transfert de données de chunk |
| `SetPaused` | 158 | Bidirectionnel | Non | Mettre en pause l'état du jeu |

### Paquets d'Entité

Synchronisent l'état des entités.

| Paquet | ID | Direction | Compressé | Description |
|--------|-----|-----------|-----------|-------------|
| `EntityUpdates` | 161 | Serveur -> Client | Oui | Mises à jour de l'état des entités |
| `MountMovement` | 166 | Client -> Serveur | Non | Mouvement d'entité montée |

### Paquets d'Inventaire

Gèrent l'inventaire du joueur.

| Paquet | ID | Direction | Compressé | Description |
|--------|-----|-----------|-----------|-------------|
| `UpdatePlayerInventory` | 170 | Serveur -> Client | Oui | Synchronisation complète de l'inventaire |

### Paquets de Fenêtre/Interface

Gèrent les interactions d'interface utilisateur.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `CloseWindow` | 202 | Client -> Serveur | Fermer une fenêtre d'interface |
| `SendWindowAction` | 203 | Client -> Serveur | Interaction avec une fenêtre |
| `ClientOpenWindow` | 204 | Client -> Serveur | Requête d'ouverture de fenêtre |

### Paquets d'Interface

Gestion du chat et de l'interface.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `ChatMessage` | 211 | Client -> Serveur | Envoyer un message de chat |
| `CustomPageEvent` | 219 | Client -> Serveur | Interaction avec une page personnalisée |
| `UpdateLanguage` | 232 | Client -> Serveur | Changer le paramètre de langue |

### Paquets de Carte du Monde

Interactions avec la carte du monde.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `UpdateWorldMapVisible` | 243 | Client -> Serveur | Basculer la visibilité de la carte |
| `TeleportToWorldMapMarker` | 244 | Client -> Serveur | Se téléporter à un marqueur |
| `TeleportToWorldMapPosition` | 245 | Client -> Serveur | Se téléporter à une position |

### Paquets de Configuration

Configuration initiale du client.

| Paquet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `RequestAssets` | 23 | Client -> Serveur | Demander les données d'assets |
| `ViewRadius` | 32 | Client -> Serveur | Définir la distance de vue |

### Paquets Spécialisés

| Catégorie | Paquets | Description |
|-----------|---------|-------------|
| Accès Serveur | `UpdateServerAccess` (251), `SetServerAccess` (252) | Contrôle d'accès en solo |
| Machinima | `RequestMachinimaActorModel` (260), `UpdateMachinimaScene` (262) | Outils cinématiques |
| Caméra | `RequestFlyCameraMode` (282) | Contrôle de la caméra |
| Interaction | `SyncInteractionChains` (290) | Chaînes d'interaction |
| Assets | 40+ paquets | Synchronisation des assets |

## Détails des Paquets Clés

### Connect (ID 0)

Paquet de connexion initial envoyé par les clients.

| Champ | Type | Description |
|-------|------|-------------|
| `protocolHash` | String | Hachage du protocole ASCII de 64 caractères |
| `clientType` | ClientType | Game ou Editor |
| `language` | String | Code de langue (ex: "en-US") |
| `identityToken` | String | Jeton d'identité d'authentification |
| `uuid` | UUID | UUID du joueur |
| `username` | String | Nom d'utilisateur du joueur (max 16 caractères) |
| `referralData` | byte[] | Données de référence optionnelles (max 4096 octets) |
| `referralSource` | HostAddress | Source de référence optionnelle |

**Taille maximale** : 38 161 octets

### Disconnect (ID 1)

Paquet de terminaison de connexion.

| Champ | Type | Description |
|-------|------|-------------|
| `reason` | String | Message de raison de déconnexion |
| `type` | DisconnectType | Disconnect, Crash, etc. |

**Taille maximale** : 16 384 007 octets

### Ping/Pong (ID 2/3)

Paquets de mesure de latence.

**Ping** (Serveur -> Client) :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Identifiant du ping |
| `time` | InstantData | Données d'horodatage |
| `lastPingValueRaw` | int | Dernier ping brut |
| `lastPingValueDirect` | int | Dernier ping direct |
| `lastPingValueTick` | int | Dernier ping tick |

**Pong** (Client -> Serveur) :

| Champ | Type | Description |
|-------|------|-------------|
| `id` | int | Identifiant de ping correspondant |
| `time` | InstantData | Données d'horodatage |
| `type` | PongType | Raw, Direct, ou Tick |
| `packetQueueSize` | short | Taille de la file d'attente du client |

### ClientMovement (ID 108)

Paquet d'état de mouvement du joueur.

| Champ | Type | Description |
|-------|------|-------------|
| `movementStates` | MovementStates | Indicateurs de mouvement |
| `relativePosition` | HalfFloatPosition | Delta de position |
| `absolutePosition` | Position | Coordonnées absolues |
| `bodyOrientation` | Direction | Rotation du corps |
| `lookOrientation` | Direction | Direction du regard/tête |
| `teleportAck` | TeleportAck | Accusé de réception de téléportation |
| `wishMovement` | Position | Mouvement souhaité |
| `velocity` | Vector3d | Vélocité actuelle |
| `mountedTo` | int | ID de l'entité montée |
| `riderMovementStates` | MovementStates | États de mouvement du cavalier |

**Taille maximale** : 153 octets

### SetChunk (ID 131)

Paquet de données de chunk (compressé).

| Champ | Type | Description |
|-------|------|-------------|
| `x` | int | Coordonnée X du chunk |
| `y` | int | Coordonnée Y du chunk |
| `z` | int | Coordonnée Z du chunk |
| `localLight` | byte[] | Données d'éclairage local |
| `globalLight` | byte[] | Données d'éclairage global |
| `data` | byte[] | Données de blocs |

**Taille maximale** : 12 288 040 octets
**Compression** : Zstd

### EntityUpdates (ID 161)

Paquet de synchronisation des entités (compressé).

| Champ | Type | Description |
|-------|------|-------------|
| `removed` | int[] | IDs des entités supprimées |
| `updates` | EntityUpdate[] | Mises à jour de l'état des entités |

**Taille maximale** : 1 677 721 600 octets
**Compression** : Zstd

### UpdatePlayerInventory (ID 170)

Paquet de synchronisation complète de l'inventaire (compressé).

| Champ | Type | Description |
|-------|------|-------------|
| `storage` | InventorySection | Section de stockage |
| `armor` | InventorySection | Section d'armure |
| `hotbar` | InventorySection | Section de barre d'accès rapide |
| `utility` | InventorySection | Objets utilitaires |
| `builderMaterial` | InventorySection | Matériaux de construction |
| `tools` | InventorySection | Section d'outils |
| `backpack` | InventorySection | Section de sac à dos |
| `sortType` | SortType | Type de tri actuel |

**Compression** : Zstd

### ChatMessage (ID 211)

Paquet de message de chat.

| Champ | Type | Description |
|-------|------|-------------|
| `message` | String | Contenu du message (max 4 096 000 caractères) |

**Taille maximale** : 16 384 006 octets

## Types de Déconnexion

L'énumération `DisconnectType` définit diverses raisons de déconnexion :

| Type | Description |
|------|-------------|
| `Disconnect` | Déconnexion normale |
| `Crash` | Plantage client/serveur |

## Structures Detaillees des Paquets

Cette section fournit les structures binaires detaillees pour les categories de paquets prioritaires, derivees du code source decompile.

### Paquets d'Entite

Les paquets d'entite gerent la synchronisation des entites entre le serveur et les clients, y compris la creation, la mise a jour et la suppression des entites.

#### EntityUpdates (ID 161)

**Direction :** Serveur -> Client
**Compresse :** Oui (Zstd)
**Description :** Paquet de mise a jour groupee qui synchronise plusieurs etats d'entites. Envoye a chaque tick pour les entites dans la distance de vue du joueur.

```
+------------------+------------------+--------------------+--------------------+
| Bits Null (1)    | removed Offset   | updates Offset     | Donnees Variables  |
| (octet)          | (int32 LE)       | (int32 LE)         | (variable)         |
+------------------+------------------+--------------------+--------------------+
```

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Masque : bit 0 = removed present, bit 1 = updates present |
| 1 | removedOffset | int32 LE | 4 | Offset vers le tableau removed (-1 si null) |
| 5 | updatesOffset | int32 LE | 4 | Offset vers le tableau updates (-1 si null) |
| 9 | removed | VarInt + int32[] | Variable | Tableau des IDs reseau des entites a supprimer |
| - | updates | VarInt + EntityUpdate[] | Variable | Tableau des mises a jour d'entites |

**Structure EntityUpdate :**

| Champ | Type | Taille | Description |
|-------|------|--------|-------------|
| nullBits | octet | 1 | Indicateurs de presence pour les champs optionnels |
| networkId | int32 LE | 4 | Identifiant reseau de l'entite |
| removedOffset | int32 LE | 4 | Offset vers les composants supprimes |
| updatesOffset | int32 LE | 4 | Offset vers les mises a jour de composants |
| removed | ComponentUpdateType[] | Variable | Composants supprimes de l'entite |
| updates | ComponentUpdate[] | Variable | Mises a jour de l'etat des composants |

**Taille maximale :** 1 677 721 600 octets

#### PlayAnimation (ID 162)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Declenche une animation sur une entite. Utilise pour les animations de combat, les emotes et autres retours visuels.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Masque pour les champs nullables |
| 1 | entityId | int32 LE | 4 | ID reseau de l'entite cible |
| 5 | slot | octet | 1 | Valeur enum AnimationSlot (Movement, Action, etc.) |
| 6 | itemAnimationsIdOffset | int32 LE | 4 | Offset vers la chaine d'animations d'objet |
| 10 | animationIdOffset | int32 LE | 4 | Offset vers la chaine d'ID d'animation |
| 14 | itemAnimationsId | VarString | Variable | ID du set d'animations d'objet (optionnel) |
| - | animationId | VarString | Variable | Identifiant de l'animation (optionnel) |

**Taille fixe :** 14 octets (minimum)
**Taille maximale :** 32 768 024 octets

#### ChangeVelocity (ID 163)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Modifie la velocite d'une entite. Utilise pour le recul, les explosions et les effets physiques.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateur de presence pour config |
| 1 | x | float LE | 4 | Composante X de la velocite |
| 5 | y | float LE | 4 | Composante Y de la velocite |
| 9 | z | float LE | 4 | Composante Z de la velocite |
| 13 | changeType | octet | 1 | ChangeVelocityType : 0=Add, 1=Set, 2=Multiply |
| 14 | config | VelocityConfig | 21 | Configuration de velocite optionnelle |

**Taille fixe :** 35 octets

#### ApplyKnockback (ID 164)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Applique une force de recul a l'entite joueur du client, typiquement depuis le combat ou les explosions.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Bit 0 = hitPosition present |
| 1 | hitPosition | Position | 24 | Position d'impact (x, y, z en doubles) |
| 25 | x | float LE | 4 | Force de recul X |
| 29 | y | float LE | 4 | Force de recul Y |
| 33 | z | float LE | 4 | Force de recul Z |
| 37 | changeType | octet | 1 | Enum ChangeVelocityType |

**Taille fixe :** 38 octets

#### SpawnModelParticles (ID 165)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Fait apparaitre des effets de particules attaches aux os du modele d'une entite.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateurs de presence |
| 1 | entityId | int32 LE | 4 | ID reseau de l'entite |
| 5 | modelParticles | ModelParticle[] | Variable | Tableau de configurations de particules |

**Taille maximale :** 1 677 721 600 octets

#### MountMovement (ID 166)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Envoie les entrees de mouvement pour une entite montee (vehicule, creature chevauchable).

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateurs de presence pour les champs optionnels |
| 1 | absolutePosition | Position | 24 | Position absolue de la monture dans le monde |
| 25 | bodyOrientation | Direction | 12 | Rotation du corps de la monture (yaw, pitch, roll en floats) |
| 37 | movementStates | MovementStates | 22 | Indicateurs et etats de mouvement |

**Taille fixe :** 59 octets

#### SetEntitySeed (ID 160)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Definit la graine aleatoire pour une entite, utilisee pour les effets proceduraux deterministes.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | entitySeed | int32 LE | 4 | Valeur de la graine aleatoire |

**Taille fixe :** 4 octets

---

### Paquets Joueur

Les paquets joueur gerent l'etat du joueur, le mouvement, les actions et le mode de jeu.

#### JoinWorld (ID 104)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Envoye lorsqu'un joueur rejoint ou transite vers un monde. Declenche le chargement du monde sur le client.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | clearWorld | octet | 1 | Booleen : effacer les donnees du monde existant |
| 1 | fadeInOut | octet | 1 | Booleen : utiliser une transition en fondu |
| 2 | worldUuid | UUID | 16 | Identifiant unique du monde (deux int64 LE) |

**Taille fixe :** 18 octets

#### ClientReady (ID 105)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Signale l'etat de preparation du client pendant le chargement du monde.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | readyForChunks | octet | 1 | Booleen : pret a recevoir les donnees de chunk |
| 1 | readyForGameplay | octet | 1 | Booleen : pret pour les paquets de gameplay |

**Taille fixe :** 2 octets

#### ClientMovement (ID 108)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Paquet de mouvement principal envoye a chaque tick contenant la position, l'orientation et l'etat de mouvement du joueur.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet[2] | 2 | Indicateurs de presence pour 10 champs optionnels |
| 2 | movementStates | MovementStates | 22 | Indicateurs de mouvement (saut, sprint, accroupi, etc.) |
| 24 | relativePosition | HalfFloatPosition | 6 | Delta de position (floats demi-precision) |
| 30 | absolutePosition | Position | 24 | Coordonnees absolues du monde (3x double) |
| 54 | bodyOrientation | Direction | 12 | Rotation du corps (3x float) |
| 66 | lookOrientation | Direction | 12 | Direction de la camera/tete (3x float) |
| 78 | teleportAck | TeleportAck | 1 | Accuse de reception de teleportation serveur |
| 79 | wishMovement | Position | 24 | Direction de mouvement souhaitee |
| 103 | velocity | Vector3d | 24 | Velocite actuelle (3x double) |
| 127 | mountedTo | int32 LE | 4 | ID de l'entite si monte (-1 sinon) |
| 131 | riderMovementStates | MovementStates | 22 | Etats de mouvement en tant que cavalier |

**Taille fixe :** 153 octets

#### ClientTeleport (ID 109)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Teleporte le joueur a une nouvelle position, utilise pour la reapparition, les portails et les commandes.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateur de presence pour modelTransform |
| 1 | teleportId | octet | 1 | ID de sequence de teleportation pour l'accuse de reception |
| 2 | modelTransform | ModelTransform | 49 | Donnees de position et rotation |
| 51 | resetVelocity | octet | 1 | Booleen : reinitialiser la velocite du joueur |

**Taille fixe :** 52 octets

#### MouseInteraction (ID 111)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Envoie les evenements d'entree souris incluant les clics et les interactions avec le monde.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateurs de presence pour les champs optionnels |
| 1 | clientTimestamp | int64 LE | 8 | Horodatage cote client |
| 9 | activeSlot | int32 LE | 4 | Emplacement de la barre d'acces rapide selectionne |
| 13 | screenPoint | Vector2f | 8 | Coordonnees ecran de la souris (optionnel) |
| 21 | mouseButton | MouseButtonEvent | 3 | Etat du bouton (optionnel) |
| 24 | worldInteraction | WorldInteraction | 20 | Donnees d'interaction bloc/entite (optionnel) |
| 44 | itemInHandIdOffset | int32 LE | 4 | Offset vers la chaine d'ID d'objet |
| 48 | mouseMotionOffset | int32 LE | 4 | Offset vers les donnees de mouvement souris |

**Taille fixe :** 52 octets (minimum)
**Taille maximale :** 20 480 071 octets

#### ClientPlaceBlock (ID 117)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Requete pour placer un bloc a une position specifique.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Bit 0 = position, bit 1 = rotation |
| 1 | position | BlockPosition | 12 | Coordonnees du bloc (3x int32) |
| 13 | rotation | BlockRotation | 3 | Etat de rotation du bloc |
| 16 | placedBlockId | int32 LE | 4 | Identifiant du type de bloc |

**Taille fixe :** 20 octets

#### SetGameMode (ID 101)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Change le mode de jeu du joueur.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | gameMode | octet | 1 | Enum GameMode : Adventure, Creative, Spectator |

**Taille fixe :** 1 octet

---

### Paquets de Monde

Les paquets de monde gerent les donnees de chunks, les mises a jour de blocs et la synchronisation de l'etat du monde.

#### SetChunk (ID 131)

**Direction :** Serveur -> Client
**Compresse :** Oui (Zstd)
**Description :** Envoie les donnees de chunk au client incluant les donnees de blocs et les informations d'eclairage.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateurs de presence pour les tableaux de donnees |
| 1 | x | int32 LE | 4 | Coordonnee X du chunk |
| 5 | y | int32 LE | 4 | Coordonnee Y du chunk |
| 9 | z | int32 LE | 4 | Coordonnee Z du chunk |
| 13 | localLightOffset | int32 LE | 4 | Offset vers les donnees d'eclairage local |
| 17 | globalLightOffset | int32 LE | 4 | Offset vers les donnees d'eclairage global |
| 21 | dataOffset | int32 LE | 4 | Offset vers les donnees de blocs |
| 25 | localLight | VarInt + octet[] | Variable | Niveaux de lumiere locale par bloc |
| - | globalLight | VarInt + octet[] | Variable | Niveaux de lumiere globale (ciel) |
| - | data | VarInt + octet[] | Variable | Donnees de blocs compressees |

**Taille fixe :** 25 octets (minimum)
**Taille maximale :** 12 288 040 octets

#### UnloadChunk (ID 135)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Indique au client de decharger une colonne de chunk de la memoire.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | chunkX | int32 LE | 4 | Coordonnee X de la colonne de chunk |
| 4 | chunkZ | int32 LE | 4 | Coordonnee Z de la colonne de chunk |

**Taille fixe :** 8 octets

#### ServerSetBlock (ID 140)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Met a jour un seul bloc dans le monde. Utilise pour la casse, le placement et les changements d'etat des blocs.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | x | int32 LE | 4 | Coordonnee X du bloc |
| 4 | y | int32 LE | 4 | Coordonnee Y du bloc |
| 8 | z | int32 LE | 4 | Coordonnee Z du bloc |
| 12 | blockId | int32 LE | 4 | Nouvel ID de type de bloc (0 = air) |
| 16 | filler | int16 LE | 2 | Donnees reservees/remplissage |
| 18 | rotation | octet | 1 | Etat de rotation du bloc (0-23) |

**Taille fixe :** 19 octets

#### ServerSetBlocks (ID 141)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Mise a jour groupee pour plusieurs blocs dans un chunk, plus efficace que plusieurs paquets ServerSetBlock.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | x | int32 LE | 4 | Coordonnee X du chunk |
| 4 | y | int32 LE | 4 | Coordonnee Y du chunk |
| 8 | z | int32 LE | 4 | Coordonnee Z du chunk |
| 12 | cmds | SetBlockCmd[] | Variable | Tableau de commandes de blocs |

**Structure SetBlockCmd (9 octets chacune) :**

| Champ | Type | Taille | Description |
|-------|------|--------|-------------|
| index | int16 LE | 2 | Index du bloc dans le chunk (0-4095) |
| blockId | int32 LE | 4 | ID du type de bloc |
| filler | int16 LE | 2 | Donnees reservees |
| rotation | octet | 1 | Rotation du bloc (0-23) |

**Taille maximale :** 36 864 017 octets

#### UpdateBlockDamage (ID 144)

**Direction :** Serveur -> Client
**Compresse :** Non
**Description :** Met a jour l'etat d'endommagement d'un bloc pendant la casse, utilise pour l'animation de casse.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateur de presence pour position |
| 1 | blockPosition | BlockPosition | 12 | Coordonnees du bloc cible |
| 13 | damage | float LE | 4 | Dommages totaux accumules (0.0-1.0) |
| 17 | delta | float LE | 4 | Changement de dommages ce tick |

**Taille fixe :** 21 octets

#### SetPaused (ID 158)

**Direction :** Bidirectionnel
**Compresse :** Non
**Description :** Met en pause ou reprend le jeu (solo uniquement).

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | paused | octet | 1 | Booleen : etat de pause du jeu |

**Taille fixe :** 1 octet

---

### Paquets d'Inventaire

Les paquets d'inventaire gerent l'etat de l'inventaire du joueur, le deplacement d'objets et les interactions avec les conteneurs.

#### UpdatePlayerInventory (ID 170)

**Direction :** Serveur -> Client
**Compresse :** Oui (Zstd)
**Description :** Synchronisation complete de l'inventaire, envoye a la connexion et apres des changements d'inventaire significatifs.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateurs de presence pour 7 sections d'inventaire |
| 1 | sortType | octet | 1 | Enum SortType : Name, Type, Quality |
| 2 | storageOffset | int32 LE | 4 | Offset vers la section stockage |
| 6 | armorOffset | int32 LE | 4 | Offset vers la section armure |
| 10 | hotbarOffset | int32 LE | 4 | Offset vers la section barre d'acces rapide |
| 14 | utilityOffset | int32 LE | 4 | Offset vers la section utilitaires |
| 18 | builderMaterialOffset | int32 LE | 4 | Offset vers les materiaux de construction |
| 22 | toolsOffset | int32 LE | 4 | Offset vers la section outils |
| 26 | backpackOffset | int32 LE | 4 | Offset vers la section sac a dos |
| 30+ | sections | InventorySection[] | Variable | Donnees de section avec piles d'objets |

**Taille fixe :** 30 octets (minimum)
**Taille maximale :** 1 677 721 600 octets

#### DropItemStack (ID 174)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Requete pour jeter des objets de l'inventaire dans le monde.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | inventorySectionId | int32 LE | 4 | ID de la section source |
| 4 | slotId | int32 LE | 4 | Index de l'emplacement source |
| 8 | quantity | int32 LE | 4 | Nombre d'objets a jeter |

**Taille fixe :** 12 octets

#### MoveItemStack (ID 175)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Requete pour deplacer des objets entre les emplacements ou sections d'inventaire.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | fromSectionId | int32 LE | 4 | ID de la section source |
| 4 | fromSlotId | int32 LE | 4 | Index de l'emplacement source |
| 8 | quantity | int32 LE | 4 | Nombre d'objets a deplacer |
| 12 | toSectionId | int32 LE | 4 | ID de la section destination |
| 16 | toSlotId | int32 LE | 4 | Index de l'emplacement destination |

**Taille fixe :** 20 octets

#### SetActiveSlot (ID 177)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Change la selection de l'emplacement actif de la barre d'acces rapide du joueur.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | inventorySectionId | int32 LE | 4 | ID de la section (generalement barre d'acces rapide) |
| 4 | activeSlot | int32 LE | 4 | Nouvel index de l'emplacement actif |

**Taille fixe :** 8 octets

#### InventoryAction (ID 179)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Requete d'action d'inventaire generique (tout prendre, diviser pile, etc.).

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | inventorySectionId | int32 LE | 4 | ID de la section cible |
| 4 | inventoryActionType | octet | 1 | Enum InventoryActionType |
| 5 | actionData | octet | 1 | Parametre specifique a l'action |

**Valeurs InventoryActionType :**
- `0` - TakeAll : Prendre la pile entiere
- `1` - Split : Diviser la pile en deux
- `2` - TakeOne : Prendre un seul objet

**Taille fixe :** 6 octets

---

### Paquets de Fenetre/Conteneur

Les paquets de fenetre gerent les conteneurs d'interface comme les coffres, les tables de craft et les boutiques.

#### OpenWindow (ID 200)

**Direction :** Serveur -> Client
**Compresse :** Oui (Zstd)
**Description :** Ouvre une fenetre d'interface de conteneur sur le client.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | nullBits | octet | 1 | Indicateurs de presence |
| 1 | id | int32 LE | 4 | ID unique de la fenetre |
| 5 | windowType | octet | 1 | Enum WindowType |
| 6 | windowDataOffset | int32 LE | 4 | Offset vers la configuration de fenetre |
| 10 | inventoryOffset | int32 LE | 4 | Offset vers l'inventaire du conteneur |
| 14 | extraResourcesOffset | int32 LE | 4 | Offset vers les donnees supplementaires |

**Valeurs WindowType :**
- `0` - Container : Coffre/stockage generique
- `1` - Crafting : Table de craft
- `2` - Furnace : Interface de fusion
- `3` - Anvil : Reparation/nommage
- `4` - Enchanting : Table d'enchantement
- `5` - Trading : Boutique PNJ

**Taille maximale :** 1 677 721 600 octets

#### CloseWindow (ID 202)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Notifie le serveur que le joueur a ferme une fenetre.

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | id | int32 LE | 4 | ID de la fenetre a fermer |

**Taille fixe :** 4 octets

#### SendWindowAction (ID 203)

**Direction :** Client -> Serveur
**Compresse :** Non
**Description :** Envoie une action specifique a la fenetre (crafter objet, trier, etc.).

| Offset | Champ | Type | Taille | Description |
|--------|-------|------|--------|-------------|
| 0 | id | int32 LE | 4 | ID de la fenetre |
| 4 | action | WindowAction | Variable | Donnees d'action polymorphes |

**Types WindowAction :**
- CraftItemAction
- SelectSlotAction
- SortItemsAction
- TierUpgradeAction
- CraftRecipeAction
- ChangeBlockAction

**Taille maximale :** 32 768 027 octets

---

## Reference des Types de Donnees

### Types Primitifs

| Type | Taille | Description |
|------|--------|-------------|
| octet | 1 | Entier non signe 8 bits |
| int16 LE | 2 | Entier signe 16 bits little-endian |
| int32 LE | 4 | Entier signe 32 bits little-endian |
| int64 LE | 8 | Entier signe 64 bits little-endian |
| float LE | 4 | IEEE 754 32 bits little-endian |
| double LE | 8 | IEEE 754 64 bits little-endian |
| VarInt | 1-5 | Entier non signe a longueur variable |
| VarString | Variable | Longueur VarInt + octets UTF-8 |
| UUID | 16 | Deux valeurs int64 LE |

### Structures Communes

**Position (24 octets) :**
```
+------------------+------------------+------------------+
| x (double LE)    | y (double LE)    | z (double LE)    |
+------------------+------------------+------------------+
```

**BlockPosition (12 octets) :**
```
+------------------+------------------+------------------+
| x (int32 LE)     | y (int32 LE)     | z (int32 LE)     |
+------------------+------------------+------------------+
```

**Direction (12 octets) :**
```
+------------------+------------------+------------------+
| yaw (float LE)   | pitch (float LE) | roll (float LE)  |
+------------------+------------------+------------------+
```

**HalfFloatPosition (6 octets) :**
```
+------------------+------------------+------------------+
| x (half float)   | y (half float)   | z (half float)   |
+------------------+------------------+------------------+
```

**Vector3d (24 octets) :**
```
+------------------+------------------+------------------+
| x (double LE)    | y (double LE)    | z (double LE)    |
+------------------+------------------+------------------+
```

**Vector2f (8 octets) :**
```
+------------------+------------------+
| x (float LE)     | y (float LE)     |
+------------------+------------------+
```

---

## Reference des Fichiers Sources

| Composant | Fichier Source |
|-----------|----------------|
| Transport | `com/hypixel/hytale/server/core/io/transport/QUICTransport.java` |
| Base des Paquets | `com/hypixel/hytale/protocol/Packet.java` |
| Constantes du Protocole | `com/hypixel/hytale/protocol/ProtocolSettings.java` |
| IO des Paquets | `com/hypixel/hytale/protocol/io/PacketIO.java` |
| VarInt | `com/hypixel/hytale/protocol/io/VarInt.java` |
| Encodeur de Paquets | `com/hypixel/hytale/protocol/io/netty/PacketEncoder.java` |
| Gestionnaire Initial | `com/hypixel/hytale/server/core/io/handlers/InitialPacketHandler.java` |
| Gestionnaire de Jeu | `com/hypixel/hytale/server/core/io/handlers/game/GamePacketHandler.java` |
| Paquets d'Entite | `com/hypixel/hytale/protocol/packets/entities/*.java` |
| Paquets Joueur | `com/hypixel/hytale/protocol/packets/player/*.java` |
| Paquets de Monde | `com/hypixel/hytale/protocol/packets/world/*.java` |
| Paquets d'Inventaire | `com/hypixel/hytale/protocol/packets/inventory/*.java` |
| Paquets de Fenetre | `com/hypixel/hytale/protocol/packets/window/*.java` |
