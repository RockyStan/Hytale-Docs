---
id: network-protocol
title: Network Protocol
sidebar_label: Network Protocol
sidebar_position: 5
description: Understanding the Hytale server network protocol
---

# Network Protocol

This document describes the Hytale network protocol used for communication between clients and servers. The information is derived from analysis of the decompiled server code.

## Protocol Overview

Hytale uses a modern, efficient network protocol built on top of QUIC (Quick UDP Internet Connections).

| Property | Value |
|----------|-------|
| Transport | QUIC over UDP |
| Default Port | 5520 |
| Application Protocol | `hytale/1` |

QUIC provides several advantages over traditional TCP:
- **Reduced latency**: Faster connection establishment with 0-RTT support
- **Multiplexed streams**: Multiple data streams without head-of-line blocking
- **Built-in encryption**: TLS 1.3 integrated into the protocol
- **Connection migration**: Handles network changes gracefully

## Protocol Constants

The protocol uses the following constants defined in `ProtocolSettings.java`:

| Constant | Value | Description |
|----------|-------|-------------|
| `PROTOCOL_HASH` | `6708f121966c1c443f4b0eb525b2f81d0a8dc61f5003a692a8fa157e5e02cea9` | SHA-256 hash for version validation |
| `PROTOCOL_VERSION` | 1 | Protocol version number |
| `PACKET_COUNT` | 268 | Total number of packet types |
| `STRUCT_COUNT` | 315 | Total number of data structures |
| `ENUM_COUNT` | 136 | Total number of enumerations |
| `MAX_PACKET_SIZE` | 1,677,721,600 | Maximum packet size in bytes (~1.6 GB) |
| `DEFAULT_PORT` | 5520 | Default server port |

The `PROTOCOL_HASH` is used during the handshake to ensure client and server are using compatible protocol versions.

## Packet Interface

All packets implement the `Packet` interface (`com.hypixel.hytale.protocol.Packet`):

```java
public interface Packet {
   int getId();
   void serialize(@Nonnull ByteBuf var1);
   int computeSize();
}
```

| Method | Description |
|--------|-------------|
| `getId()` | Returns the unique packet identifier |
| `serialize(ByteBuf)` | Writes the packet data to a byte buffer |
| `computeSize()` | Calculates the serialized size of the packet |

## Serialization

### Frame Structure

Packets are transmitted as length-prefixed binary frames:

```
+----------------+----------------+------------------+
| Length (4 bytes) | Packet ID (4 bytes) | Payload (variable) |
+----------------+----------------+------------------+
```

| Component | Size | Description |
|-----------|------|-------------|
| Length Prefix | 4 bytes | Total frame length |
| Packet ID | 4 bytes | Identifies the packet type |
| Payload | Variable | Packet-specific data |
| **Minimum Frame Size** | 8 bytes | Length + Packet ID |

### Compression

Large packets use **Zstd** (Zstandard) compression for efficient bandwidth usage. Zstd provides:
- Fast compression and decompression speeds
- High compression ratios
- Streaming support

Packets that use compression have an `IS_COMPRESSED = true` flag in their class definition.

### Variable-Length Integers (VarInt)

Hytale implements its own VarInt encoding for variable-length integers in `com.hypixel.hytale.protocol.io.VarInt`:

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

Key characteristics:
- Only encodes non-negative values
- Uses 7 bits per byte for data, 1 bit as continuation flag
- Smaller values use fewer bytes (efficient for common small numbers)

## Packet Directions

Packets flow in three directions:

| Direction | Description | Example |
|-----------|-------------|---------|
| **Client to Server** | Sent by clients, handled by server packet handlers | `ClientMovement`, `ChatMessage` |
| **Server to Client** | Sent by server, processed by client | `SetChunk`, `EntityUpdates` |
| **Bidirectional** | Can be sent by either party | `Disconnect`, `SetPaused` |

Client-to-server packets are registered in `GamePacketHandler.registerHandlers()`:

```java
this.registerHandler(108, p -> this.handle((ClientMovement)p));
this.registerHandler(211, p -> this.handle((ChatMessage)p));
```

Server-to-client packets are encoded via `PacketEncoder.encode()` and sent through the network channel.

## Connection Flow

### Handshake Process

1. **Client connects** via QUIC transport
2. **Client sends `Connect` packet** (ID 0) with:
   - Protocol hash for version validation
   - Client type (Game or Editor)
   - Language code
   - Identity token for authentication
   - Player UUID and username
3. **Server validates** the protocol hash against expected value
4. **Server validates** authentication credentials
5. **Server responds** with either:
   - `ConnectAccept` (ID 14) - Connection accepted, may include password challenge
   - `Disconnect` (ID 1) - Connection rejected with reason
6. **Authentication continues** via `AuthenticationPacketHandler`
7. **Setup phase** transitions to `SetupPacketHandler`
8. **Gameplay** transitions to `GamePacketHandler`

```
Client                                Server
   |                                    |
   |  -------- QUIC Connect ----------> |
   |                                    |
   |  -------- Connect (ID 0) --------> |
   |       protocolHash, clientType,    |
   |       language, identityToken,     |
   |       uuid, username               |
   |                                    |
   |  <----- ConnectAccept (ID 14) ---- |
   |       passwordChallenge (optional) |
   |                                    |
   |  -------- AuthToken (ID 12) -----> |
   |       accessToken,                 |
   |       serverAuthorizationGrant     |
   |                                    |
   |  <------ JoinWorld (ID 104) ------ |
   |                                    |
```

## Packet Categories

Packets are organized into functional categories:

### Connection Packets

Manage connection lifecycle.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `Connect` | 0 | Client -> Server | Initial connection request |
| `Disconnect` | 1 | Bidirectional | Connection termination |
| `Ping` | 2 | Server -> Client | Latency measurement request |
| `Pong` | 3 | Client -> Server | Latency measurement response |

### Authentication Packets

Handle authentication flow.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `Status` | 10 | Server -> Client | Server status information |
| `AuthToken` | 12 | Client -> Server | Authentication token submission |
| `ConnectAccept` | 14 | Server -> Client | Connection accepted response |

### Player Packets

Manage player state and actions.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `JoinWorld` | 104 | Server -> Client | Join a world |
| `ClientReady` | 105 | Client -> Server | Client ready state |
| `ClientMovement` | 108 | Client -> Server | Player movement update |
| `MouseInteraction` | 111 | Client -> Server | Mouse input events |
| `SyncPlayerPreferences` | 116 | Client -> Server | Sync player settings |
| `ClientPlaceBlock` | 117 | Client -> Server | Place block request |
| `RemoveMapMarker` | 119 | Client -> Server | Remove map marker |

### World Packets

Synchronize world data.

| Packet | ID | Direction | Compressed | Description |
|--------|-----|-----------|------------|-------------|
| `SetChunk` | 131 | Server -> Client | Yes | Chunk data transfer |
| `SetPaused` | 158 | Bidirectional | No | Pause game state |

### Entity Packets

Synchronize entity state.

| Packet | ID | Direction | Compressed | Description |
|--------|-----|-----------|------------|-------------|
| `EntityUpdates` | 161 | Server -> Client | Yes | Entity state updates |
| `MountMovement` | 166 | Client -> Server | No | Mounted entity movement |

### Inventory Packets

Manage player inventory.

| Packet | ID | Direction | Compressed | Description |
|--------|-----|-----------|------------|-------------|
| `UpdatePlayerInventory` | 170 | Server -> Client | Yes | Full inventory sync |

### Window/UI Packets

Handle UI interactions.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `CloseWindow` | 202 | Client -> Server | Close UI window |
| `SendWindowAction` | 203 | Client -> Server | Window interaction |
| `ClientOpenWindow` | 204 | Client -> Server | Request to open window |

### Interface Packets

Chat and interface management.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `ChatMessage` | 211 | Client -> Server | Send chat message |
| `CustomPageEvent` | 219 | Client -> Server | Custom page interaction |
| `UpdateLanguage` | 232 | Client -> Server | Change language setting |

### World Map Packets

World map interactions.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `UpdateWorldMapVisible` | 243 | Client -> Server | Toggle world map visibility |
| `TeleportToWorldMapMarker` | 244 | Client -> Server | Teleport to marker |
| `TeleportToWorldMapPosition` | 245 | Client -> Server | Teleport to position |

### Setup Packets

Initial client setup.

| Packet | ID | Direction | Description |
|--------|-----|-----------|-------------|
| `RequestAssets` | 23 | Client -> Server | Request asset data |
| `ViewRadius` | 32 | Client -> Server | Set view distance |

### Specialized Packets

| Category | Packets | Description |
|----------|---------|-------------|
| Server Access | `UpdateServerAccess` (251), `SetServerAccess` (252) | Singleplayer access control |
| Machinima | `RequestMachinimaActorModel` (260), `UpdateMachinimaScene` (262) | Cinematic tools |
| Camera | `RequestFlyCameraMode` (282) | Camera control |
| Interaction | `SyncInteractionChains` (290) | Interaction chains |
| Assets | 40+ packets | Asset synchronization |

## Key Packet Details

### Connect (ID 0)

Initial connection packet sent by clients.

| Field | Type | Description |
|-------|------|-------------|
| `protocolHash` | String | 64-character ASCII protocol hash |
| `clientType` | ClientType | Game or Editor |
| `language` | String | Language code (e.g., "en-US") |
| `identityToken` | String | Authentication identity token |
| `uuid` | UUID | Player UUID |
| `username` | String | Player username (max 16 chars) |
| `referralData` | byte[] | Optional referral data (max 4096 bytes) |
| `referralSource` | HostAddress | Optional referral source |

**Max Size**: 38,161 bytes

### Disconnect (ID 1)

Connection termination packet.

| Field | Type | Description |
|-------|------|-------------|
| `reason` | String | Disconnect reason message |
| `type` | DisconnectType | Disconnect, Crash, etc. |

**Max Size**: 16,384,007 bytes

### Ping/Pong (ID 2/3)

Latency measurement packets.

**Ping** (Server -> Client):

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Ping identifier |
| `time` | InstantData | Timestamp data |
| `lastPingValueRaw` | int | Last raw ping |
| `lastPingValueDirect` | int | Last direct ping |
| `lastPingValueTick` | int | Last tick ping |

**Pong** (Client -> Server):

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Matching ping identifier |
| `time` | InstantData | Timestamp data |
| `type` | PongType | Raw, Direct, or Tick |
| `packetQueueSize` | short | Client queue size |

### ClientMovement (ID 108)

Player movement state packet.

| Field | Type | Description |
|-------|------|-------------|
| `movementStates` | MovementStates | Movement flags |
| `relativePosition` | HalfFloatPosition | Position delta |
| `absolutePosition` | Position | Absolute coordinates |
| `bodyOrientation` | Direction | Body rotation |
| `lookOrientation` | Direction | Head/look direction |
| `teleportAck` | TeleportAck | Teleport acknowledgment |
| `wishMovement` | Position | Desired movement |
| `velocity` | Vector3d | Current velocity |
| `mountedTo` | int | Mounted entity ID |
| `riderMovementStates` | MovementStates | Riding movement states |

**Max Size**: 153 bytes

### SetChunk (ID 131)

Chunk data packet (compressed).

| Field | Type | Description |
|-------|------|-------------|
| `x` | int | Chunk X coordinate |
| `y` | int | Chunk Y coordinate |
| `z` | int | Chunk Z coordinate |
| `localLight` | byte[] | Local lighting data |
| `globalLight` | byte[] | Global lighting data |
| `data` | byte[] | Block data |

**Max Size**: 12,288,040 bytes
**Compression**: Zstd

### EntityUpdates (ID 161)

Entity synchronization packet (compressed).

| Field | Type | Description |
|-------|------|-------------|
| `removed` | int[] | Removed entity IDs |
| `updates` | EntityUpdate[] | Entity state updates |

**Max Size**: 1,677,721,600 bytes
**Compression**: Zstd

### UpdatePlayerInventory (ID 170)

Full inventory synchronization packet (compressed).

| Field | Type | Description |
|-------|------|-------------|
| `storage` | InventorySection | Storage section |
| `armor` | InventorySection | Armor section |
| `hotbar` | InventorySection | Hotbar section |
| `utility` | InventorySection | Utility items |
| `builderMaterial` | InventorySection | Builder materials |
| `tools` | InventorySection | Tools section |
| `backpack` | InventorySection | Backpack section |
| `sortType` | SortType | Current sort type |

**Compression**: Zstd

### ChatMessage (ID 211)

Chat message packet.

| Field | Type | Description |
|-------|------|-------------|
| `message` | String | Message content (max 4,096,000 chars) |

**Max Size**: 16,384,006 bytes

## Disconnect Types

The `DisconnectType` enum defines various disconnect reasons:

| Type | Description |
|------|-------------|
| `Disconnect` | Normal disconnect |
| `Crash` | Client/server crash |

## Detailed Packet Structures

This section provides detailed binary structures for high-priority packet categories, derived from decompiled source code.

### Entity Packets

Entity packets handle the synchronization of entities between the server and clients, including spawning, updating, and removing entities.

#### EntityUpdates (ID 161)

**Direction:** Server -> Client
**Compressed:** Yes (Zstd)
**Description:** Batch update packet that synchronizes multiple entity states. Sent every tick for entities within the player's view distance.

```
+------------------+------------------+--------------------+--------------------+
| Null Bits (1)    | removed Offset   | updates Offset     | Variable Data      |
| (byte)           | (int32 LE)       | (int32 LE)         | (variable)         |
+------------------+------------------+--------------------+--------------------+
```

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Bitmask: bit 0 = removed present, bit 1 = updates present |
| 1 | removedOffset | int32 LE | 4 | Offset to removed array (-1 if null) |
| 5 | updatesOffset | int32 LE | 4 | Offset to updates array (-1 if null) |
| 9 | removed | VarInt + int32[] | Variable | Array of entity network IDs to remove |
| - | updates | VarInt + EntityUpdate[] | Variable | Array of entity updates |

**EntityUpdate Structure:**

| Field | Type | Size | Description |
|-------|------|------|-------------|
| nullBits | byte | 1 | Presence flags for optional fields |
| networkId | int32 LE | 4 | Entity network identifier |
| removedOffset | int32 LE | 4 | Offset to removed components |
| updatesOffset | int32 LE | 4 | Offset to component updates |
| removed | ComponentUpdateType[] | Variable | Components removed from entity |
| updates | ComponentUpdate[] | Variable | Component state updates |

**Max Size:** 1,677,721,600 bytes

#### PlayAnimation (ID 162)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Triggers an animation on an entity. Used for combat animations, emotes, and other visual feedback.

```
+------------------+------------------+------------------+------------------+
| Null Bits (1)    | entityId (4)     | slot (1)         | Variable Data    |
+------------------+------------------+------------------+------------------+
```

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Bitmask for nullable fields |
| 1 | entityId | int32 LE | 4 | Target entity network ID |
| 5 | slot | byte | 1 | AnimationSlot enum value (Movement, Action, etc.) |
| 6 | itemAnimationsIdOffset | int32 LE | 4 | Offset to item animations string |
| 10 | animationIdOffset | int32 LE | 4 | Offset to animation ID string |
| 14 | itemAnimationsId | VarString | Variable | Item animation set ID (optional) |
| - | animationId | VarString | Variable | Animation identifier (optional) |

**Fixed Size:** 14 bytes (minimum)
**Max Size:** 32,768,024 bytes

#### ChangeVelocity (ID 163)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Modifies an entity's velocity. Used for knockback, explosions, and physics effects.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flag for config |
| 1 | x | float LE | 4 | X velocity component |
| 5 | y | float LE | 4 | Y velocity component |
| 9 | z | float LE | 4 | Z velocity component |
| 13 | changeType | byte | 1 | ChangeVelocityType: 0=Add, 1=Set, 2=Multiply |
| 14 | config | VelocityConfig | 21 | Optional velocity configuration |

**Fixed Size:** 35 bytes

#### ApplyKnockback (ID 164)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Applies knockback force to the client's player entity, typically from combat or explosions.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Bit 0 = hitPosition present |
| 1 | hitPosition | Position | 24 | Impact position (x, y, z as doubles) |
| 25 | x | float LE | 4 | Knockback force X |
| 29 | y | float LE | 4 | Knockback force Y |
| 33 | z | float LE | 4 | Knockback force Z |
| 37 | changeType | byte | 1 | ChangeVelocityType enum |

**Fixed Size:** 38 bytes

#### SpawnModelParticles (ID 165)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Spawns particle effects attached to an entity's model bones.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flags |
| 1 | entityId | int32 LE | 4 | Entity network ID |
| 5 | modelParticles | ModelParticle[] | Variable | Array of particle configurations |

**Max Size:** 1,677,721,600 bytes

#### MountMovement (ID 166)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Sends movement input for a mounted entity (vehicle, rideable creature).

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flags for optional fields |
| 1 | absolutePosition | Position | 24 | Mount's absolute world position |
| 25 | bodyOrientation | Direction | 12 | Mount's body rotation (yaw, pitch, roll as floats) |
| 37 | movementStates | MovementStates | 22 | Movement flags and states |

**Fixed Size:** 59 bytes

#### SetEntitySeed (ID 160)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Sets the random seed for an entity, used for deterministic procedural effects.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | entitySeed | int32 LE | 4 | Random seed value |

**Fixed Size:** 4 bytes

---

### Player Packets

Player packets manage player state, movement, actions, and game mode.

#### JoinWorld (ID 104)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Sent when a player joins or transitions to a world. Triggers world loading on the client.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | clearWorld | byte | 1 | Boolean: clear existing world data |
| 1 | fadeInOut | byte | 1 | Boolean: use fade transition |
| 2 | worldUuid | UUID | 16 | World unique identifier (two int64 LE) |

**Fixed Size:** 18 bytes

#### ClientReady (ID 105)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Signals client readiness state during world loading.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | readyForChunks | byte | 1 | Boolean: ready to receive chunk data |
| 1 | readyForGameplay | byte | 1 | Boolean: ready for gameplay packets |

**Fixed Size:** 2 bytes

#### ClientMovement (ID 108)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Primary movement packet sent every tick containing the player's position, orientation, and movement state.

```
+------------------+-------------------+-------------------+-------------------+
| Null Bits (2)    | movementStates    | relativePosition  | absolutePosition  |
+------------------+-------------------+-------------------+-------------------+
| bodyOrientation  | lookOrientation   | teleportAck       | wishMovement      |
+------------------+-------------------+-------------------+-------------------+
| velocity         | mountedTo         | riderMovementStates                    |
+------------------+-------------------+----------------------------------------+
```

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte[2] | 2 | Presence flags for 10 optional fields |
| 2 | movementStates | MovementStates | 22 | Movement flags (jumping, sprinting, sneaking, etc.) |
| 24 | relativePosition | HalfFloatPosition | 6 | Position delta (half-precision floats) |
| 30 | absolutePosition | Position | 24 | Absolute world coordinates (3x double) |
| 54 | bodyOrientation | Direction | 12 | Body rotation (3x float) |
| 66 | lookOrientation | Direction | 12 | Camera/head direction (3x float) |
| 78 | teleportAck | TeleportAck | 1 | Acknowledges server teleport |
| 79 | wishMovement | Position | 24 | Desired movement direction |
| 103 | velocity | Vector3d | 24 | Current velocity (3x double) |
| 127 | mountedTo | int32 LE | 4 | Entity ID if mounted (-1 if not) |
| 131 | riderMovementStates | MovementStates | 22 | Movement states when riding |

**Fixed Size:** 153 bytes

#### ClientTeleport (ID 109)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Teleports the player to a new position, used for respawning, portals, and commands.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flag for modelTransform |
| 1 | teleportId | byte | 1 | Teleport sequence ID for acknowledgment |
| 2 | modelTransform | ModelTransform | 49 | Position and rotation data |
| 51 | resetVelocity | byte | 1 | Boolean: reset player velocity |

**Fixed Size:** 52 bytes

#### MouseInteraction (ID 111)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Sends mouse input events including clicks and world interactions.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flags for optional fields |
| 1 | clientTimestamp | int64 LE | 8 | Client-side timestamp |
| 9 | activeSlot | int32 LE | 4 | Currently selected hotbar slot |
| 13 | screenPoint | Vector2f | 8 | Mouse screen coordinates (optional) |
| 21 | mouseButton | MouseButtonEvent | 3 | Button state (optional) |
| 24 | worldInteraction | WorldInteraction | 20 | Block/entity interaction data (optional) |
| 44 | itemInHandIdOffset | int32 LE | 4 | Offset to item ID string |
| 48 | mouseMotionOffset | int32 LE | 4 | Offset to mouse motion data |

**Fixed Size:** 52 bytes (minimum)
**Max Size:** 20,480,071 bytes

#### ClientPlaceBlock (ID 117)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Request to place a block at a specific position.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Bit 0 = position, bit 1 = rotation |
| 1 | position | BlockPosition | 12 | Block coordinates (3x int32) |
| 13 | rotation | BlockRotation | 3 | Block rotation state |
| 16 | placedBlockId | int32 LE | 4 | Block type identifier |

**Fixed Size:** 20 bytes

#### SetGameMode (ID 101)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Changes the player's game mode.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | gameMode | byte | 1 | GameMode enum: Adventure, Creative, Spectator |

**Fixed Size:** 1 byte

---

### World Packets

World packets handle chunk data, block updates, and world state synchronization.

#### SetChunk (ID 131)

**Direction:** Server -> Client
**Compressed:** Yes (Zstd)
**Description:** Sends chunk data to the client including block data and lighting information.

```
+------------------+------------------+------------------+------------------+
| Null Bits (1)    | x (4)            | y (4)            | z (4)            |
+------------------+------------------+------------------+------------------+
| localLightOffset | globalLightOffset| dataOffset       | Variable Data    |
+------------------+------------------+------------------+------------------+
```

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flags for data arrays |
| 1 | x | int32 LE | 4 | Chunk X coordinate |
| 5 | y | int32 LE | 4 | Chunk Y coordinate |
| 9 | z | int32 LE | 4 | Chunk Z coordinate |
| 13 | localLightOffset | int32 LE | 4 | Offset to local lighting data |
| 17 | globalLightOffset | int32 LE | 4 | Offset to global lighting data |
| 21 | dataOffset | int32 LE | 4 | Offset to block data |
| 25 | localLight | VarInt + byte[] | Variable | Local light levels per block |
| - | globalLight | VarInt + byte[] | Variable | Global (sky) light levels |
| - | data | VarInt + byte[] | Variable | Compressed block data |

**Fixed Size:** 25 bytes (minimum)
**Max Size:** 12,288,040 bytes

#### UnloadChunk (ID 135)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Instructs the client to unload a chunk column from memory.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | chunkX | int32 LE | 4 | Chunk column X coordinate |
| 4 | chunkZ | int32 LE | 4 | Chunk column Z coordinate |

**Fixed Size:** 8 bytes

#### ServerSetBlock (ID 140)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Updates a single block in the world. Used for block breaking, placing, and state changes.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | x | int32 LE | 4 | Block X coordinate |
| 4 | y | int32 LE | 4 | Block Y coordinate |
| 8 | z | int32 LE | 4 | Block Z coordinate |
| 12 | blockId | int32 LE | 4 | New block type ID (0 = air) |
| 16 | filler | int16 LE | 2 | Reserved/padding data |
| 18 | rotation | byte | 1 | Block rotation state (0-23) |

**Fixed Size:** 19 bytes

#### ServerSetBlocks (ID 141)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Batch update for multiple blocks within a chunk, more efficient than multiple ServerSetBlock packets.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | x | int32 LE | 4 | Chunk X coordinate |
| 4 | y | int32 LE | 4 | Chunk Y coordinate |
| 8 | z | int32 LE | 4 | Chunk Z coordinate |
| 12 | cmds | SetBlockCmd[] | Variable | Array of block commands |

**SetBlockCmd Structure (9 bytes each):**

| Field | Type | Size | Description |
|-------|------|------|-------------|
| index | int16 LE | 2 | Block index within chunk (0-4095) |
| blockId | int32 LE | 4 | Block type ID |
| filler | int16 LE | 2 | Reserved data |
| rotation | byte | 1 | Block rotation (0-23) |

**Max Size:** 36,864,017 bytes

#### UpdateBlockDamage (ID 144)

**Direction:** Server -> Client
**Compressed:** No
**Description:** Updates the damage state of a block during breaking, used for break animation.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flag for position |
| 1 | blockPosition | BlockPosition | 12 | Target block coordinates |
| 13 | damage | float LE | 4 | Total accumulated damage (0.0-1.0) |
| 17 | delta | float LE | 4 | Damage change this tick |

**Fixed Size:** 21 bytes

#### SetPaused (ID 158)

**Direction:** Bidirectional
**Compressed:** No
**Description:** Pauses or unpauses the game (singleplayer only).

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | paused | byte | 1 | Boolean: game paused state |

**Fixed Size:** 1 byte

---

### Inventory Packets

Inventory packets manage player inventory state, item movement, and container interactions.

#### UpdatePlayerInventory (ID 170)

**Direction:** Server -> Client
**Compressed:** Yes (Zstd)
**Description:** Full inventory synchronization, sent on join and after significant inventory changes.

```
+------------------+------------------+------------------+------------------+
| Null Bits (1)    | sortType (1)     | Section Offsets  | Variable Data    |
|                  |                  | (7x int32)       |                  |
+------------------+------------------+------------------+------------------+
```

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flags for 7 inventory sections |
| 1 | sortType | byte | 1 | SortType enum: Name, Type, Quality |
| 2 | storageOffset | int32 LE | 4 | Offset to storage section |
| 6 | armorOffset | int32 LE | 4 | Offset to armor section |
| 10 | hotbarOffset | int32 LE | 4 | Offset to hotbar section |
| 14 | utilityOffset | int32 LE | 4 | Offset to utility section |
| 18 | builderMaterialOffset | int32 LE | 4 | Offset to builder materials |
| 22 | toolsOffset | int32 LE | 4 | Offset to tools section |
| 26 | backpackOffset | int32 LE | 4 | Offset to backpack section |
| 30+ | sections | InventorySection[] | Variable | Section data with item stacks |

**Fixed Size:** 30 bytes (minimum)
**Max Size:** 1,677,721,600 bytes

#### DropItemStack (ID 174)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Request to drop items from inventory into the world.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | inventorySectionId | int32 LE | 4 | Source section ID |
| 4 | slotId | int32 LE | 4 | Source slot index |
| 8 | quantity | int32 LE | 4 | Number of items to drop |

**Fixed Size:** 12 bytes

#### MoveItemStack (ID 175)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Request to move items between inventory slots or sections.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | fromSectionId | int32 LE | 4 | Source section ID |
| 4 | fromSlotId | int32 LE | 4 | Source slot index |
| 8 | quantity | int32 LE | 4 | Number of items to move |
| 12 | toSectionId | int32 LE | 4 | Destination section ID |
| 16 | toSlotId | int32 LE | 4 | Destination slot index |

**Fixed Size:** 20 bytes

#### SetActiveSlot (ID 177)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Changes the player's active hotbar slot selection.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | inventorySectionId | int32 LE | 4 | Section ID (typically hotbar) |
| 4 | activeSlot | int32 LE | 4 | New active slot index |

**Fixed Size:** 8 bytes

#### InventoryAction (ID 179)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Generic inventory action request (take all, split stack, etc.).

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | inventorySectionId | int32 LE | 4 | Target section ID |
| 4 | inventoryActionType | byte | 1 | InventoryActionType enum |
| 5 | actionData | byte | 1 | Action-specific parameter |

**InventoryActionType Values:**
- `0` - TakeAll: Pick up entire stack
- `1` - Split: Split stack in half
- `2` - TakeOne: Take single item

**Fixed Size:** 6 bytes

---

### Window/Container Packets

Window packets handle UI containers like chests, crafting tables, and shops.

#### OpenWindow (ID 200)

**Direction:** Server -> Client
**Compressed:** Yes (Zstd)
**Description:** Opens a container UI window on the client.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | nullBits | byte | 1 | Presence flags |
| 1 | id | int32 LE | 4 | Unique window ID |
| 5 | windowType | byte | 1 | WindowType enum |
| 6 | windowDataOffset | int32 LE | 4 | Offset to window configuration |
| 10 | inventoryOffset | int32 LE | 4 | Offset to container inventory |
| 14 | extraResourcesOffset | int32 LE | 4 | Offset to extra data |

**WindowType Values:**
- `0` - Container: Generic chest/storage
- `1` - Crafting: Crafting table
- `2` - Furnace: Smelting interface
- `3` - Anvil: Repair/naming
- `4` - Enchanting: Enchantment table
- `5` - Trading: NPC shop

**Max Size:** 1,677,721,600 bytes

#### CloseWindow (ID 202)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Notifies the server that the player closed a window.

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | id | int32 LE | 4 | Window ID to close |

**Fixed Size:** 4 bytes

#### SendWindowAction (ID 203)

**Direction:** Client -> Server
**Compressed:** No
**Description:** Sends a window-specific action (craft item, sort, etc.).

| Offset | Field | Type | Size | Description |
|--------|-------|------|------|-------------|
| 0 | id | int32 LE | 4 | Window ID |
| 4 | action | WindowAction | Variable | Polymorphic action data |

**WindowAction Types:**
- CraftItemAction
- SelectSlotAction
- SortItemsAction
- TierUpgradeAction
- CraftRecipeAction
- ChangeBlockAction

**Max Size:** 32,768,027 bytes

---

## Data Types Reference

### Primitive Types

| Type | Size | Description |
|------|------|-------------|
| byte | 1 | Unsigned 8-bit integer |
| int16 LE | 2 | Little-endian signed 16-bit |
| int32 LE | 4 | Little-endian signed 32-bit |
| int64 LE | 8 | Little-endian signed 64-bit |
| float LE | 4 | Little-endian 32-bit IEEE 754 |
| double LE | 8 | Little-endian 64-bit IEEE 754 |
| VarInt | 1-5 | Variable-length unsigned integer |
| VarString | Variable | VarInt length + UTF-8 bytes |
| UUID | 16 | Two int64 LE values |

### Common Structures

**Position (24 bytes):**
```
+------------------+------------------+------------------+
| x (double LE)    | y (double LE)    | z (double LE)    |
+------------------+------------------+------------------+
```

**BlockPosition (12 bytes):**
```
+------------------+------------------+------------------+
| x (int32 LE)     | y (int32 LE)     | z (int32 LE)     |
+------------------+------------------+------------------+
```

**Direction (12 bytes):**
```
+------------------+------------------+------------------+
| yaw (float LE)   | pitch (float LE) | roll (float LE)  |
+------------------+------------------+------------------+
```

**HalfFloatPosition (6 bytes):**
```
+------------------+------------------+------------------+
| x (half float)   | y (half float)   | z (half float)   |
+------------------+------------------+------------------+
```

**Vector3d (24 bytes):**
```
+------------------+------------------+------------------+
| x (double LE)    | y (double LE)    | z (double LE)    |
+------------------+------------------+------------------+
```

**Vector2f (8 bytes):**
```
+------------------+------------------+
| x (float LE)     | y (float LE)     |
+------------------+------------------+
```

---

## Source Files Reference

| Component | Source File |
|-----------|-------------|
| Transport | `com/hypixel/hytale/server/core/io/transport/QUICTransport.java` |
| Packet Base | `com/hypixel/hytale/protocol/Packet.java` |
| Protocol Constants | `com/hypixel/hytale/protocol/ProtocolSettings.java` |
| Packet IO | `com/hypixel/hytale/protocol/io/PacketIO.java` |
| VarInt | `com/hypixel/hytale/protocol/io/VarInt.java` |
| Packet Encoder | `com/hypixel/hytale/protocol/io/netty/PacketEncoder.java` |
| Initial Handler | `com/hypixel/hytale/server/core/io/handlers/InitialPacketHandler.java` |
| Game Handler | `com/hypixel/hytale/server/core/io/handlers/game/GamePacketHandler.java` |
| Entity Packets | `com/hypixel/hytale/protocol/packets/entities/*.java` |
| Player Packets | `com/hypixel/hytale/protocol/packets/player/*.java` |
| World Packets | `com/hypixel/hytale/protocol/packets/world/*.java` |
| Inventory Packets | `com/hypixel/hytale/protocol/packets/inventory/*.java` |
| Window Packets | `com/hypixel/hytale/protocol/packets/window/*.java` |
