---
id: commands
title: Server Commands
sidebar_label: Commands
sidebar_position: 1
---

# Server Commands

Console and in-game commands for Hytale server administration.

---

## Player Commands

Commands for managing players, their game modes, stats, effects, and camera.

### gamemode

Changes the game mode of a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/gamemode <gamemode> [player]` |
| **Aliases** | `gm` |
| **Permission** | `gamemode.self`, `gamemode.other` |

**Parameters:**
- `gamemode` - The game mode to set (e.g., Creative, Adventure, Survival)
- `player` (optional) - Target player (requires `gamemode.other` permission)

**Examples:**
```
/gamemode creative
/gamemode adventure PlayerName
/gm survival
```

---

### kill

Instantly kills a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/kill [player]` |
| **Permission** | `kill.self`, `kill.other` |

**Parameters:**
- `player` (optional) - Target player (requires `kill.other` permission)

**Examples:**
```
/kill
/kill PlayerName
```

---

### damage

Deals damage to a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/damage [amount] [--silent] [player]` |
| **Aliases** | `hurt` |
| **Permission** | `damage.self`, `damage.other` |

**Parameters:**
- `amount` (optional) - Amount of damage to deal (default: 1.0)
- `--silent` (flag) - Suppress damage notification message
- `player` (optional) - Target player (requires `damage.other` permission)

**Examples:**
```
/damage
/damage 5.0
/damage 10 --silent PlayerName
/hurt 3.5
```

---

### hide

Hides a player from other players.

| Property | Value |
|----------|-------|
| **Syntax** | `/hide <player> [target]` |
| **Subcommands** | `show`, `all`, `showall` |

**Parameters:**
- `player` - The player to hide
- `target` (optional) - Hide from a specific player only (hides from all if not specified)

**Subcommands:**
- `/hide show <player> [target]` - Make a player visible again
- `/hide all` - Hide all players from each other
- `/hide showall` - Make all players visible to each other

**Examples:**
```
/hide PlayerName
/hide PlayerName TargetPlayer
/hide show PlayerName
/hide all
/hide showall
```

---

### whereami

Displays the current location and world information.

| Property | Value |
|----------|-------|
| **Syntax** | `/whereami [player]` |
| **Permission** | `whereami.self`, `whereami.other` |
| **Game Mode** | Creative |

**Parameters:**
- `player` (optional) - Target player (requires `whereami.other` permission)

**Information displayed:**
- World name
- Chunk coordinates (X, Y, Z)
- Position coordinates (X, Y, Z)
- Head rotation (yaw, pitch, roll)
- Direction and axis information
- Chunk saving status

**Examples:**
```
/whereami
/whereami PlayerName
```

---

### whoami

Displays player identity information.

| Property | Value |
|----------|-------|
| **Syntax** | `/whoami [player]` |
| **Aliases** | `uuid` |
| **Game Mode** | Adventure |

**Parameters:**
- `player` (optional) - Target player

**Information displayed:**
- Player UUID
- Username
- Language preference

**Examples:**
```
/whoami
/uuid
/whoami PlayerName
```

---

### player stats

Manage player statistics.

| Property | Value |
|----------|-------|
| **Syntax** | `/player stats <subcommand>` |
| **Aliases** | `stat` |

**Subcommands:**

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `get` | `/player stats get <statName> [player]` | Get the value of a stat |
| `set` | `/player stats set <statName> <value> [player]` | Set a stat to a specific value |
| `add` | `/player stats add <statName> <value> [player]` | Add to a stat value |
| `reset` | `/player stats reset [player]` | Reset all stats |
| `settomax` | `/player stats settomax <statName> [player]` | Set a stat to its maximum value |
| `dump` | `/player stats dump [player]` | Display all stats |

**Examples:**
```
/player stats get health
/player stats set health 100
/player stats add stamina 50
/player stats settomax health
/player stats dump
```

---

### player effect

Apply or clear effects on players.

| Property | Value |
|----------|-------|
| **Syntax** | `/player effect <subcommand>` |

**Subcommands:**

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `apply` | `/player effect apply <effect> [duration] [player]` | Apply an effect |
| `clear` | `/player effect clear [player]` | Clear all effects |

**Parameters:**
- `effect` - The effect asset ID to apply
- `duration` (optional) - Duration in ticks (default: 100)
- `player` (optional) - Target player

**Permissions:**
- `player.effect.apply.self`, `player.effect.apply.other`
- `player.effect.clear.self`, `player.effect.clear.other`

**Examples:**
```
/player effect apply speed_boost
/player effect apply regeneration 200
/player effect apply strength 150 PlayerName
/player effect clear
```

---

### player camera

Control player camera modes.

| Property | Value |
|----------|-------|
| **Syntax** | `/player camera <subcommand>` |

**Subcommands:**

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `reset` | `/player camera reset [player]` | Reset camera to default |
| `topdown` | `/player camera topdown [player]` | Set top-down camera view |
| `sidescroller` | `/player camera sidescroller [player]` | Set side-scroller camera view |
| `demo` | `/player camera demo <activate\|deactivate>` | Demo camera mode |

**Examples:**
```
/player camera reset
/player camera topdown
/player camera sidescroller PlayerName
/player camera demo activate
```

---

## Entity Commands

Commands for managing entities in the world.

### entity clone

Clones an entity.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity clone [entity] [count]` |

**Parameters:**
- `entity` (optional) - Entity ID to clone (uses looked-at entity if not specified)
- `count` (optional) - Number of clones to create (default: 1)

**Examples:**
```
/entity clone
/entity clone 12345
/entity clone 12345 5
```

---

### entity remove

Removes an entity from the world.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity remove [entity] [--others]` |

**Parameters:**
- `entity` (optional) - Entity ID to remove (uses looked-at entity if not specified)
- `--others` (flag) - Remove all other non-player entities except the specified one

**Examples:**
```
/entity remove
/entity remove 12345
/entity remove 12345 --others
```

---

### entity dump

Dumps entity data to the server log.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity dump [entity]` |

**Parameters:**
- `entity` (optional) - Entity ID to dump (uses looked-at entity if not specified)

**Examples:**
```
/entity dump
/entity dump 12345
```

---

### entity clean

Removes all non-player entities from the current world.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity clean` |

**Warning:** This is a destructive command that removes all entities except players.

**Examples:**
```
/entity clean
```

---

### entity count

Displays the total entity count in the current world.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity count` |

**Examples:**
```
/entity count
```

---

### entity stats

Manage entity statistics.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity stats <subcommand>` |
| **Aliases** | `stat` |

**Subcommands:**

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `get` | `/entity stats get <statName> [entity]` | Get the value of a stat |
| `set` | `/entity stats set <statName> <value> [entity]` | Set a stat value |
| `add` | `/entity stats add <statName> <value> [entity]` | Add to a stat value |
| `reset` | `/entity stats reset [entity]` | Reset all stats |
| `settomax` | `/entity stats settomax <statName> [entity]` | Set a stat to maximum |
| `dump` | `/entity stats dump [entity]` | Display all stats |

**Examples:**
```
/entity stats get health
/entity stats set health 50
/entity stats dump
```

---

### entity effect

Apply an effect to entities.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity effect <effect> [duration] [entity]` |

**Parameters:**
- `effect` - The effect asset ID to apply
- `duration` (optional) - Duration in ticks (default: 100)
- `entity` (optional) - Target entity

**Examples:**
```
/entity effect poison
/entity effect slow 200
```

---

### entity intangible

Makes an entity intangible (no collision).

| Property | Value |
|----------|-------|
| **Syntax** | `/entity intangible [--remove] [entity]` |

**Parameters:**
- `--remove` (flag) - Remove intangible status instead of adding it
- `entity` (optional) - Target entity

**Examples:**
```
/entity intangible
/entity intangible --remove
/entity intangible 12345
```

---

### entity invulnerable

Makes an entity invulnerable to damage.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity invulnerable [--remove] [entity]` |

**Parameters:**
- `--remove` (flag) - Remove invulnerable status instead of adding it
- `entity` (optional) - Target entity

**Examples:**
```
/entity invulnerable
/entity invulnerable --remove
/entity invulnerable 12345
```

---

## World Commands

Commands for managing chunks and world maps.

### chunk info

Displays detailed information about a chunk.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk info <x> <z>` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)

**Information displayed:**
- Initialization status
- Generation status
- Ticking status
- Saving status
- Section details

**Examples:**
```
/chunk info 0 0
/chunk info ~ ~
/chunk info ~5 ~-3
```

---

### chunk load

Loads a chunk into memory.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk load <x> <z> [--markdirty]` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)
- `--markdirty` (flag) - Mark the chunk as needing to be saved

**Examples:**
```
/chunk load 0 0
/chunk load ~ ~
/chunk load 10 10 --markdirty
```

---

### chunk unload

Unloads a chunk from memory.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk unload <x> <z>` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)

**Examples:**
```
/chunk unload 0 0
/chunk unload ~ ~
```

---

### chunk regenerate

Regenerates a chunk (WARNING: destructive).

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk regenerate <x> <z>` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)

**Warning:** This will regenerate the chunk, losing all player modifications.

**Examples:**
```
/chunk regenerate 0 0
/chunk regenerate ~ ~
```

---

### worldmap discover

Discovers zones on the world map for a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldmap discover [zone]` |
| **Aliases** | `disc` |

**Parameters:**
- `zone` (optional) - Zone name to discover, or "all" to discover all zones. If not specified, lists available zones.

**Examples:**
```
/worldmap discover
/worldmap discover all
/worldmap discover ForestZone
/map disc all
```

---

### worldmap undiscover

Removes discovered zones from the world map.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldmap undiscover [zone]` |

**Parameters:**
- `zone` (optional) - Zone name to undiscover, or "all" to undiscover all zones. If not specified, lists discovered zones.

**Examples:**
```
/worldmap undiscover
/worldmap undiscover all
/worldmap undiscover ForestZone
```

---

## Server Commands

Commands for server administration.

### stop

Stops the server gracefully.

| Property | Value |
|----------|-------|
| **Syntax** | `/stop [--crash]` |
| **Aliases** | `shutdown` |

**Parameters:**
- `--crash` (flag) - Simulate a crash shutdown instead of graceful shutdown

**Examples:**
```
/stop
/shutdown
/stop --crash
```

---

### kick

Kicks a player from the server.

| Property | Value |
|----------|-------|
| **Syntax** | `/kick <player>` |

**Parameters:**
- `player` - The player to kick

**Examples:**
```
/kick PlayerName
```

---

### who

Lists all online players by world.

| Property | Value |
|----------|-------|
| **Syntax** | `/who` |
| **Game Mode** | Adventure |

**Information displayed:**
- Players organized by world
- Display names (if set) and usernames

**Examples:**
```
/who
```

---

### maxplayers

Gets or sets the maximum player count.

| Property | Value |
|----------|-------|
| **Syntax** | `/maxplayers [amount]` |

**Parameters:**
- `amount` (optional) - New maximum player count. If not specified, displays current value.

**Examples:**
```
/maxplayers
/maxplayers 50
```

---

### auth

Authentication management commands.

| Property | Value |
|----------|-------|
| **Syntax** | `/auth <subcommand>` |

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `status` | Check authentication status |
| `login` | Login to authentication service |
| `select` | Select authentication account |
| `logout` | Logout from authentication |
| `cancel` | Cancel pending authentication |
| `persistence` | Manage authentication persistence |

**Examples:**
```
/auth status
/auth login
/auth logout
```

---

## Utility Commands

General utility commands.

### help

Displays help information for commands.

| Property | Value |
|----------|-------|
| **Syntax** | `/help [command]` |
| **Aliases** | `?` |
| **Game Mode** | Adventure |

**Parameters:**
- `command` (optional) - Command name to get help for. Opens command list UI if not specified.

**Examples:**
```
/help
/?
/help gamemode
```

---

### backup

Creates a backup of the server data.

| Property | Value |
|----------|-------|
| **Syntax** | `/backup` |

**Requirements:**
- Server must be fully booted
- Backup directory must be configured in server options

**Examples:**
```
/backup
```

---

### notify

Sends a notification to all players.

| Property | Value |
|----------|-------|
| **Syntax** | `/notify [style] <message>` |

**Parameters:**
- `style` (optional) - Notification style (Default, Warning, Error, etc.)
- `message` - The message to send (supports formatted messages with `{...}`)

**Examples:**
```
/notify Hello everyone!
/notify Warning Server restart in 5 minutes
/notify {"text": "Formatted message", "color": "red"}
```

---

### sound 2d

Plays a 2D sound effect.

| Property | Value |
|----------|-------|
| **Syntax** | `/sound 2d <sound> [category] [--all] [player]` |
| **Aliases** | `play` |

**Parameters:**
- `sound` - Sound event asset ID
- `category` (optional) - Sound category (default: SFX)
- `--all` (flag) - Play to all players in the world
- `player` (optional) - Target player

**Examples:**
```
/sound 2d ui_click
/sound play notification SFX
/sound 2d alert --all
```

---

### sound 3d

Plays a 3D positional sound effect.

| Property | Value |
|----------|-------|
| **Syntax** | `/sound 3d <sound> [category] <x> <y> <z> [--all] [player]` |
| **Aliases** | `play3d` |

**Parameters:**
- `sound` - Sound event asset ID
- `category` (optional) - Sound category (default: SFX)
- `x y z` - Position coordinates (supports relative coordinates with ~)
- `--all` (flag) - Play to all players in the world
- `player` (optional) - Target player

**Examples:**
```
/sound 3d explosion SFX 100 64 200
/sound play3d ambient ~ ~ ~
/sound 3d alert SFX ~ ~10 ~ --all
```

---

## Debug Commands

Commands for debugging and monitoring.

### ping

Displays ping/latency information.

| Property | Value |
|----------|-------|
| **Syntax** | `/ping [--detail] [player]` |
| **Subcommands** | `clear`, `graph` |
| **Game Mode** | Adventure |

**Parameters:**
- `--detail` (flag) - Show detailed ping information
- `player` (optional) - Target player

**Subcommands:**
- `/ping clear [player]` - Clear ping history
- `/ping graph [width] [height] [player]` - Display ping graph

**Examples:**
```
/ping
/ping --detail
/ping PlayerName
/ping clear
/ping graph 80 15
```

---

### version

Displays server version information.

| Property | Value |
|----------|-------|
| **Syntax** | `/version` |

**Information displayed:**
- Server version
- Patchline
- Environment (if not release)

**Examples:**
```
/version
```

---

### log

Manages logger levels.

| Property | Value |
|----------|-------|
| **Syntax** | `/log <logger> [level] [--save] [--reset]` |

**Parameters:**
- `logger` - Logger name (or "global" for the global logger)
- `level` (optional) - Log level (OFF, SEVERE, WARNING, INFO, CONFIG, FINE, FINER, FINEST, ALL)
- `--save` (flag) - Save the log level to server config
- `--reset` (flag) - Reset the logger to default level

**Examples:**
```
/log global
/log global INFO
/log global FINE --save
/log network WARNING
/log network --reset
```

---

### server stats memory

Displays server memory statistics.

| Property | Value |
|----------|-------|
| **Syntax** | `/server stats memory` |
| **Aliases** | `mem` |

**Information displayed:**
- Total and free physical memory
- Total and free swap memory
- Heap memory usage (init, used, committed, max, free)
- Non-heap memory usage
- Objects pending finalization

**Examples:**
```
/server stats memory
/server stats mem
```

---

### server stats cpu

Displays server CPU statistics.

| Property | Value |
|----------|-------|
| **Syntax** | `/server stats cpu` |

**Information displayed:**
- System CPU load
- Process CPU load
- System load average
- Process uptime

**Examples:**
```
/server stats cpu
```

---

## Inventory Commands

Commands for managing player inventories, items, and equipment.

### give

Gives items to a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/give <item> [quantity] [metadata]` |
| **Permission** | `give.self`, `give.other` |

**Parameters:**
- `item` - The item asset ID to give
- `quantity` (optional) - Number of items to give (default: 1)
- `metadata` (optional) - JSON metadata string for the item

**Usage variants:**
- `/give <player> <item> [quantity] [metadata]` - Give items to another player (requires `give.other` permission)

**Examples:**
```
/give Sword_Iron
/give Sword_Iron 5
/give PlayerName Pickaxe_Diamond 1
/give Potion_Health 3 {"durability": 100}
```

---

### give armor

Gives a complete set of armor matching a search pattern.

| Property | Value |
|----------|-------|
| **Syntax** | `/give armor <search> [--set] [player]` |

**Parameters:**
- `search` - Search string to match armor types (e.g., "Iron", "Diamond")
- `--set` (flag) - Clear existing armor before adding new armor
- `player` (optional) - Target player (use "*" for all players)

**Examples:**
```
/give armor Iron
/give armor Diamond --set
/give armor Gold PlayerName
/give armor Iron *
```

---

### inventory

Parent command for inventory management subcommands.

| Property | Value |
|----------|-------|
| **Syntax** | `/inventory <subcommand>` |
| **Aliases** | `inv` |

**Subcommands:**
- `clear` - Clear inventory
- `see` - View another player's inventory
- `item` - Open item container
- `backpack` - Manage backpack size

---

### inventory clear

Clears the player's entire inventory.

| Property | Value |
|----------|-------|
| **Syntax** | `/inventory clear` |
| **Aliases** | `/inv clear` |
| **Game Mode** | Creative |

**Examples:**
```
/inventory clear
/inv clear
```

---

### inventory see

Opens and views another player's inventory.

| Property | Value |
|----------|-------|
| **Syntax** | `/inventory see <player>` |
| **Permission** | `invsee.modify` (for editing) |

**Parameters:**
- `player` - Target player whose inventory to view

**Notes:**
- Without `invsee.modify` permission, the inventory is read-only
- Opens the target player's inventory in a bench interface

**Examples:**
```
/inventory see PlayerName
/inv see PlayerName
```

---

### inventory item

Opens the container of the currently held item (e.g., backpack, pouch).

| Property | Value |
|----------|-------|
| **Syntax** | `/inventory item` |

**Requirements:**
- Must have an item in hand
- Item must have a container component

**Examples:**
```
/inventory item
/inv item
```

---

### inventory backpack

Gets or sets the backpack capacity.

| Property | Value |
|----------|-------|
| **Syntax** | `/inventory backpack [size]` |

**Parameters:**
- `size` (optional) - New backpack capacity. If not specified, displays current capacity.

**Notes:**
- Items that don't fit after resizing are dropped on the ground

**Examples:**
```
/inventory backpack
/inventory backpack 20
/inv backpack 30
```

---

### itemstate

Sets the state of the currently held item.

| Property | Value |
|----------|-------|
| **Syntax** | `/itemstate <state>` |
| **Game Mode** | Creative |

**Parameters:**
- `state` - The state string to apply to the item

**Requirements:**
- Must have an item in the active hotbar slot

**Examples:**
```
/itemstate charged
/itemstate broken
/itemstate enchanted
```

---

## Lighting Commands

Commands for managing world lighting calculations and data.

### lighting

Parent command for lighting subcommands.

| Property | Value |
|----------|-------|
| **Syntax** | `/lighting <subcommand>` |
| **Aliases** | `light` |

**Subcommands:**
- `get` - Get light values at a position
- `send` - Toggle lighting data sending
- `info` - Display lighting system information
- `calculation` - Set lighting calculation mode
- `invalidate` - Invalidate lighting data

---

### lighting get

Gets the light values at a specific position.

| Property | Value |
|----------|-------|
| **Syntax** | `/lighting get <x> <y> <z> [--hex]` |

**Parameters:**
- `x y z` - Block coordinates (supports relative coordinates with ~)
- `--hex` (flag) - Display light value in hexadecimal format

**Information displayed:**
- Red light value (0-15)
- Green light value (0-15)
- Blue light value (0-15)
- Sky light value (0-15)

**Examples:**
```
/lighting get 0 64 0
/lighting get ~ ~ ~
/lighting get ~ ~1 ~ --hex
/light get 100 50 200
```

---

### lighting send

Controls whether lighting data is sent to clients.

| Property | Value |
|----------|-------|
| **Syntax** | `/lighting send <local\|global> [enabled]` |

**Subcommands:**
- `local` - Toggle local lighting data sending
- `global` - Toggle global lighting data sending

**Parameters:**
- `enabled` (optional) - Boolean value. Toggles if not specified.

**Examples:**
```
/lighting send local
/lighting send local true
/lighting send global false
```

---

### lighting info

Displays information about the lighting system.

| Property | Value |
|----------|-------|
| **Syntax** | `/lighting info [--detail]` |

**Parameters:**
- `--detail` (flag) - Show detailed chunk lighting statistics

**Information displayed:**
- Lighting queue size
- Light calculation type
- (With --detail) Total chunk sections, sections with local/global light

**Examples:**
```
/lighting info
/lighting info --detail
```

---

### lighting calculation

Sets the lighting calculation mode.

| Property | Value |
|----------|-------|
| **Syntax** | `/lighting calculation <type> [--invalidate]` |

**Parameters:**
- `type` - Calculation type: `FLOOD` or `FULLBRIGHT`
- `--invalidate` (flag) - Invalidate all loaded chunks after changing

**Calculation types:**
- `FLOOD` - Standard flood-fill lighting calculation
- `FULLBRIGHT` - Full brightness (no shadows)

**Examples:**
```
/lighting calculation FLOOD
/lighting calculation FULLBRIGHT
/lighting calculation FLOOD --invalidate
```

---

### lighting invalidate

Invalidates lighting data, forcing recalculation.

| Property | Value |
|----------|-------|
| **Syntax** | `/lighting invalidate [--one]` |

**Parameters:**
- `--one` (flag) - Only invalidate the chunk section at the player's position

**Notes:**
- Without `--one`, invalidates all loaded chunks
- Requires player context when using `--one`

**Examples:**
```
/lighting invalidate
/lighting invalidate --one
```

---

## World Generation Commands

Commands for world generation management and benchmarking.

### worldgen

Parent command for world generation subcommands.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldgen <subcommand>` |
| **Aliases** | `wg` |

**Subcommands:**
- `reload` - Reload world generation settings
- `benchmark` - Benchmark world generation performance

---

### worldgen reload

Reloads the world generation configuration.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldgen reload [--clear]` |

**Parameters:**
- `--clear` (flag) - Delete all saved chunks and regenerate loaded chunks

**Warning:** Using `--clear` will delete all chunk data and regenerate the world.

**Examples:**
```
/worldgen reload
/wg reload
/worldgen reload --clear
```

---

### worldgen benchmark

Benchmarks world generation performance.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldgen benchmark <pos1> <pos2> [world] [seed]` |

**Parameters:**
- `pos1` - First corner coordinates (X, Z)
- `pos2` - Second corner coordinates (X, Z)
- `world` (optional) - Target world
- `seed` (optional) - Generation seed (uses world seed if not specified)

**Notes:**
- Generates chunks in the specified area for benchmarking
- Results are saved to the `quantification/` folder
- Only works with world generators that support benchmarking

**Examples:**
```
/worldgen benchmark 0,0 1000,1000
/wg benchmark -500,-500 500,500
/worldgen benchmark 0,0 2000,2000 MyWorld 12345
```

---

## Spawn Commands

Commands for spawning entities in the world.

### spawnblock

Spawns a block entity at a specified position.

| Property | Value |
|----------|-------|
| **Syntax** | `/spawnblock <block> <x> <y> <z> [rotation]` |

**Parameters:**
- `block` - Block type key to spawn
- `x y z` - Position coordinates (supports relative coordinates with ~)
- `rotation` (optional) - Rotation vector (yaw, pitch, roll)

**Examples:**
```
/spawnblock Chest ~ ~ ~
/spawnblock Torch 100 64 200
/spawnblock Lantern ~ ~2 ~ 0,45,0
```

---

## Additional Player Commands

Extended player management commands.

### player respawn

Forces a player to respawn.

| Property | Value |
|----------|-------|
| **Syntax** | `/player respawn [player]` |

**Parameters:**
- `player` (optional) - Target player (self if not specified)

**Notes:**
- Removes the death component, allowing the player to respawn

**Examples:**
```
/player respawn
/player respawn PlayerName
```

---

### player reset

Resets a player's data completely.

| Property | Value |
|----------|-------|
| **Syntax** | `/player reset [player]` |

**Parameters:**
- `player` (optional) - Target player (self if not specified)

**Warning:** This will reset all player data including inventory, stats, and progress.

**Examples:**
```
/player reset
/player reset PlayerName
```

---

### player zone

Displays the current zone and biome information.

| Property | Value |
|----------|-------|
| **Syntax** | `/player zone [player]` |

**Parameters:**
- `player` (optional) - Target player (self if not specified)

**Information displayed:**
- Current zone name
- Current biome name

**Examples:**
```
/player zone
/player zone PlayerName
```

---

### player viewradius

Manage player view radius settings.

| Property | Value |
|----------|-------|
| **Syntax** | `/player viewradius <subcommand>` |

**Subcommands:**

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `get` | `/player viewradius get [player]` | Get current view radius |
| `set` | `/player viewradius set <radius> [--blocks] [--bypass] [player]` | Set view radius |

**Set parameters:**
- `radius` - View radius in chunks (or "default" for 32)
- `--blocks` (flag) - Interpret radius as blocks instead of chunks
- `--bypass` (flag) - Allow exceeding server maximum

**Examples:**
```
/player viewradius get
/player viewradius set 16
/player viewradius set 512 --blocks
/player viewradius set default
```

---

### sudo

Execute a command as another player.

| Property | Value |
|----------|-------|
| **Syntax** | `/sudo <player> <command>` |
| **Aliases** | `su` |

**Parameters:**
- `player` - Target player (or "*" for all players)
- `command` - Command to execute (with or without leading /)

**Examples:**
```
/sudo PlayerName gamemode creative
/sudo * notify Hello everyone!
/su PlayerName /whereami
```

---

### refer

Transfers a player to another server.

| Property | Value |
|----------|-------|
| **Syntax** | `/refer <host> <port> [player]` |
| **Aliases** | `transfer` |
| **Permission** | `refer.self`, `refer.other` |

**Parameters:**
- `host` - Target server hostname or IP
- `port` - Target server port (1-65535)
- `player` (optional) - Target player (self if not specified)

**Examples:**
```
/refer play.example.com 25565
/refer 192.168.1.100 25565 PlayerName
/transfer server.example.net 25566
```

---

### toggleBlockPlacementOverride

Toggles block placement restriction override.

| Property | Value |
|----------|-------|
| **Syntax** | `/toggleBlockPlacementOverride` |
| **Aliases** | `tbpo`, `togglePlacement` |

**Notes:**
- When enabled, allows placing blocks in restricted areas
- Useful for building in protected zones

**Examples:**
```
/toggleBlockPlacementOverride
/tbpo
/togglePlacement
```

---

## Additional Entity Commands

Extended entity management commands.

### entity nameplate

Set or remove entity nameplates.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity nameplate <text> [entity]` |

**Parameters:**
- `text` - The text to display on the nameplate
- `entity` (optional) - Entity ID (uses looked-at entity if not specified)

**Usage variants:**
- `/entity nameplate <text> [entity]` - Set nameplate text
- `/entity nameplate [entity]` - Remove nameplate

**Examples:**
```
/entity nameplate "Boss Monster"
/entity nameplate "Shop Keeper" 12345
/entity nameplate
```

---

### entity resend

Forces resending of all entity data to a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity resend <player>` |

**Parameters:**
- `player` - Target player to resend entities to

**Notes:**
- Despawns all entities for the player, causing them to be resent

**Examples:**
```
/entity resend PlayerName
```

---

### entity tracker

Displays entity tracker statistics for a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity tracker <player>` |

**Parameters:**
- `player` - Target player

**Information displayed:**
- Visible entity count
- LOD excluded count
- Hidden entity count
- Total tracked entities
- World total entity count
- View radius information

**Examples:**
```
/entity tracker PlayerName
```

---

### entity lod

Sets the entity Level of Detail (LOD) culling ratio.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity lod <ratio>` |

**Parameters:**
- `ratio` - LOD ratio value (e.g., 0.000035)

**Subcommands:**
- `/entity lod default` - Reset to default LOD ratio (0.000035)

**Examples:**
```
/entity lod 0.00005
/entity lod 0.00002
/entity lod default
```

---

### entity interactable

Makes an entity interactable or removes interactability.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity interactable [--disable] [entity]` |

**Parameters:**
- `--disable` (flag) - Remove interactability instead of adding it
- `entity` (optional) - Entity ID (uses looked-at entity if not specified)

**Examples:**
```
/entity interactable
/entity interactable --disable
/entity interactable 12345
```

---

### entity hidefromadventureplayers

Hides an entity from players in Adventure mode.

| Property | Value |
|----------|-------|
| **Syntax** | `/entity hidefromadventureplayers [--remove] [entity]` |

**Parameters:**
- `--remove` (flag) - Remove hiding instead of adding it
- `entity` (optional) - Entity ID (uses looked-at entity if not specified)

**Examples:**
```
/entity hidefromadventureplayers
/entity hidefromadventureplayers --remove
/entity hidefromadventureplayers 12345
```

---

## Additional Chunk Commands

Extended chunk management commands.

### chunk fixheight

Fixes the heightmap for a chunk and recalculates lighting.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk fixheight <x> <z>` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)

**Notes:**
- Recalculates the chunk heightmap
- Invalidates and recalculates lighting
- Useful for fixing lighting glitches

**Examples:**
```
/chunk fixheight 0 0
/chunk fixheight ~ ~
```

---

### chunk forcetick

Forces all blocks in a chunk to tick.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk forcetick <x> <z>` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)

**Notes:**
- Sets all blocks in the chunk to ticking state
- Chunk must be loaded

**Examples:**
```
/chunk forcetick 0 0
/chunk forcetick ~ ~
```

---

### chunk loaded

Displays loaded chunk information for a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk loaded [player]` |

**Parameters:**
- `player` (optional) - Target player (self if not specified)

**Examples:**
```
/chunk loaded
/chunk loaded PlayerName
```

---

### chunk resend

Forces resending all chunks to a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk resend [--clearcache] [player]` |

**Parameters:**
- `--clearcache` (flag) - Also invalidate chunk section caches
- `player` (optional) - Target player (self if not specified)

**Examples:**
```
/chunk resend
/chunk resend --clearcache
/chunk resend PlayerName
```

---

### chunk tracker

Displays chunk tracker statistics for a player.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk tracker [player]` |

**Parameters:**
- `player` (optional) - Target player (self if not specified)

**Information displayed:**
- Max chunks per second/tick
- Min/max loaded chunk radius
- Loaded/loading player chunks
- World loaded chunks

**Examples:**
```
/chunk tracker
/chunk tracker PlayerName
```

---

### chunk maxsendrate

Gets or sets chunk sending rate limits.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk maxsendrate [--sec=<value>] [--tick=<value>] [player]` |

**Parameters:**
- `--sec` (optional) - Maximum chunks per second
- `--tick` (optional) - Maximum chunks per tick
- `player` (optional) - Target player (self if not specified)

**Examples:**
```
/chunk maxsendrate
/chunk maxsendrate --sec=50
/chunk maxsendrate --tick=5
/chunk maxsendrate --sec=100 --tick=10 PlayerName
```

---

### chunk marksave

Marks a chunk as needing to be saved.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk marksave <x> <z>` |

**Parameters:**
- `x z` - Chunk coordinates (supports relative coordinates with ~)

**Notes:**
- If chunk is not loaded, it will be loaded first

**Examples:**
```
/chunk marksave 0 0
/chunk marksave ~ ~
```

---

### chunk tint

Sets the tint color for a chunk.

| Property | Value |
|----------|-------|
| **Syntax** | `/chunk tint <color> [--blur] [--radius=<value>] [--sigma=<value>]` |

**Parameters:**
- `color` - Hex color value (e.g., #FF0000)
- `--blur` (flag) - Apply Gaussian blur to the tint
- `--radius` (optional) - Blur radius (default: 5)
- `--sigma` (optional) - Blur sigma value (default: 1.5)

**Usage variants:**
- `/chunk tint` - Opens the tint color picker UI

**Examples:**
```
/chunk tint #FF0000
/chunk tint #00FF00 --blur
/chunk tint #0000FF --blur --radius=10 --sigma=2.0
```

---

## Additional World Map Commands

Extended world map management commands.

### worldmap reload

Reloads the world map configuration.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldmap reload` |

**Examples:**
```
/worldmap reload
/map reload
```

---

### worldmap clearmarkers

Clears all world map markers for the player.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldmap clearmarkers` |

**Examples:**
```
/worldmap clearmarkers
/map clearmarkers
```

---

### worldmap viewradius

Manage world map view radius settings.

| Property | Value |
|----------|-------|
| **Syntax** | `/worldmap viewradius <subcommand>` |

**Subcommands:**

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `get` | `/worldmap viewradius get [player]` | Get current view radius |
| `set` | `/worldmap viewradius set <radius> [--bypass] [player]` | Set view radius override |
| `remove` | `/worldmap viewradius remove [player]` | Remove view radius override |

**Set parameters:**
- `radius` - View radius value (max 512 without bypass)
- `--bypass` (flag) - Allow exceeding maximum limit

**Examples:**
```
/worldmap viewradius get
/worldmap viewradius set 256
/worldmap viewradius set 1024 --bypass
/worldmap viewradius remove
```
