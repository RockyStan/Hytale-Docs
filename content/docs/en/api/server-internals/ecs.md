---
id: ecs
title: ECS (Entity Component System)
sidebar_label: ECS
sidebar_position: 6
description: Complete documentation of the Hytale server ECS system
---

# Entity Component System (ECS)

:::info v2 Documentation - Verified
This documentation has been verified against decompiled server source code using multi-agent analysis. All information includes source file references.
:::

## What is an ECS?

An **Entity Component System** is a software architecture pattern commonly used in game development. It's fundamentally different from traditional object-oriented programming and offers significant performance and flexibility benefits.

### The Problem with Traditional OOP

In traditional object-oriented programming, you might create a class hierarchy like this:

```
GameObject
├── Character
│   ├── Player
│   ├── NPC
│   └── Enemy
├── Item
│   ├── Weapon
│   └── Consumable
└── Vehicle
```

This seems logical, but problems arise quickly:
- What if a Player can become a Vehicle (like a mount)?
- What if an Item needs health and can be attacked?
- Adding new behaviors requires modifying the class hierarchy

### The ECS Solution

ECS breaks everything into three simple concepts:

| Concept | What it is | Example |
|---------|------------|---------|
| **Entity** | Just an ID number | Entity #42 |
| **Component** | Pure data attached to entities | `Position(x: 10, y: 5, z: 20)`, `Health(current: 80, max: 100)` |
| **System** | Logic that processes entities with specific components | "Every tick, reduce hunger for entities with Hunger component" |

**Think of it like a spreadsheet:**

| Entity ID | Position | Health | Inventory | AI | Player |
|-----------|----------|--------|-----------|----|----|
| 1 | (10, 5, 20) | 100/100 | 64 items | - | Yes |
| 2 | (50, 10, 30) | 50/80 | - | Hostile | - |
| 3 | (0, 0, 0) | - | 10 items | - | - |

- Entity 1 is a Player with position, health, and inventory
- Entity 2 is an Enemy with position, health, and AI
- Entity 3 is a Chest with just position and inventory

### Why Hytale Uses ECS

1. **Performance**: Entities with the same components are stored together in memory (cache-friendly)
2. **Flexibility**: Add/remove behaviors at runtime by adding/removing components
3. **Parallelization**: Systems can run on different CPU cores simultaneously
4. **Modularity**: Systems are independent and can be added/removed easily

### Real-World Analogy

Imagine you're organizing a party and tracking guests:

- **OOP approach**: Create different classes for "VIP Guest", "Regular Guest", "Staff", etc. What about a VIP who is also Staff?
- **ECS approach**: Each person (entity) has tags/components: "HasVIPBadge", "IsStaff", "NeedsParking", etc. You can mix and match freely.

---

## Hytale's ECS Implementation

This documentation describes the Entity Component System (ECS) used by the Hytale server. This system is responsible for managing entities, their components, and the systems that process them.

## General Architecture

```
+-----------------------------------------------------------------------------------+
|                              ComponentRegistry                                     |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
|  | ComponentType|  | SystemType  |  | SystemGroup |  | ResourceType|               |
|  +-------------+  +-------------+  +-------------+  +-------------+               |
+-----------------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                                  Store                                             |
|  +-----------------+  +-----------------+  +-----------------+                     |
|  | ArchetypeChunk  |  | ArchetypeChunk  |  | ArchetypeChunk  |  (entity groups)    |
|  | [Entity,Entity] |  | [Entity,Entity] |  | [Entity,Entity] |                     |
|  +-----------------+  +-----------------+  +-----------------+                     |
|                                                                                    |
|  +-----------------+  +-----------------+  +-----------------+                     |
|  |    Resource     |  |    Resource     |  |    Resource     |  (global data)      |
|  +-----------------+  +-----------------+  +-----------------+                     |
+-----------------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------------+
|                                 Systems                                            |
|  +-----------------+  +-----------------+  +-----------------+                     |
|  | TickingSystem   |  | RefSystem       |  | EventSystem     |                     |
|  +-----------------+  +-----------------+  +-----------------+                     |
+-----------------------------------------------------------------------------------+
```

## Core Concepts

### 1. Component

A `Component` is a unit of data attached to an entity. It contains no logic, only data.

```java
public interface Component<ECS_TYPE> extends Cloneable {
    @Nullable
    Component<ECS_TYPE> clone();

    @Nullable
    default Component<ECS_TYPE> cloneSerializable() {
        return this.clone();
    }
}
```

**Example of a simple component:**

```java
public class TransformComponent implements Component<EntityStore> {
    private final Vector3d position = new Vector3d();
    private final Vector3f rotation = new Vector3f();

    public static final BuilderCodec<TransformComponent> CODEC =
        BuilderCodec.builder(TransformComponent.class, TransformComponent::new)
            .append(new KeyedCodec<>("Position", Vector3d.CODEC),
                    (o, i) -> o.position.assign(i), o -> o.position)
            .add()
            .append(new KeyedCodec<>("Rotation", Vector3f.ROTATION),
                    (o, i) -> o.rotation.assign(i), o -> o.rotation)
            .add()
            .build();

    @Nonnull
    public Vector3d getPosition() {
        return this.position;
    }

    @Nonnull
    @Override
    public Component<EntityStore> clone() {
        return new TransformComponent(this.position, this.rotation);
    }
}
```

### 2. ComponentType

A `ComponentType` is a unique identifier for a component type within the registry.

```java
public class ComponentType<ECS_TYPE, T extends Component<ECS_TYPE>>
    implements Comparable<ComponentType<ECS_TYPE, ?>>, Query<ECS_TYPE> {

    private ComponentRegistry<ECS_TYPE> registry;
    private Class<? super T> tClass;
    private int index;  // Unique index in the registry

    public int getIndex() { return this.index; }
    public Class<? super T> getTypeClass() { return this.tClass; }
}
```

### 3. Archetype

An `Archetype` represents a unique set of component types. All entities sharing the same archetype are stored together to optimize performance.

```java
public class Archetype<ECS_TYPE> implements Query<ECS_TYPE> {
    private final int minIndex;
    private final int count;
    private final ComponentType<ECS_TYPE, ?>[] componentTypes;

    // Create an archetype
    public static <ECS_TYPE> Archetype<ECS_TYPE> of(ComponentType<ECS_TYPE, ?>... componentTypes);

    // Add a component to the archetype
    public static <ECS_TYPE, T extends Component<ECS_TYPE>> Archetype<ECS_TYPE> add(
        Archetype<ECS_TYPE> archetype, ComponentType<ECS_TYPE, T> componentType);

    // Remove a component from the archetype
    public static <ECS_TYPE, T extends Component<ECS_TYPE>> Archetype<ECS_TYPE> remove(
        Archetype<ECS_TYPE> archetype, ComponentType<ECS_TYPE, T> componentType);

    // Check if the archetype contains a component type
    public boolean contains(ComponentType<ECS_TYPE, ?> componentType);
}
```

### 4. ArchetypeChunk

An `ArchetypeChunk` stores all entities that share the same archetype. It is a data structure optimized for cache access.

```java
public class ArchetypeChunk<ECS_TYPE> {
    protected final Store<ECS_TYPE> store;
    protected final Archetype<ECS_TYPE> archetype;
    protected int entitiesSize;
    protected Ref<ECS_TYPE>[] refs;           // Entity references
    protected Component<ECS_TYPE>[][] components;  // Component data

    // Get a component for an entity at a given index
    public <T extends Component<ECS_TYPE>> T getComponent(
        int index, ComponentType<ECS_TYPE, T> componentType);

    // Set a component
    public <T extends Component<ECS_TYPE>> void setComponent(
        int index, ComponentType<ECS_TYPE, T> componentType, T component);

    // Add an entity
    public int addEntity(Ref<ECS_TYPE> ref, Holder<ECS_TYPE> holder);

    // Remove an entity
    public Holder<ECS_TYPE> removeEntity(int entityIndex, Holder<ECS_TYPE> target);
}
```

### 5. Holder (EntityHolder)

A `Holder` is a temporary container for an entity's components before it is added to the Store.

```java
public class Holder<ECS_TYPE> {
    private Archetype<ECS_TYPE> archetype;
    private Component<ECS_TYPE>[] components;

    // Add a component
    public <T extends Component<ECS_TYPE>> void addComponent(
        ComponentType<ECS_TYPE, T> componentType, T component);

    // Get a component
    public <T extends Component<ECS_TYPE>> T getComponent(
        ComponentType<ECS_TYPE, T> componentType);

    // Remove a component
    public <T extends Component<ECS_TYPE>> void removeComponent(
        ComponentType<ECS_TYPE, T> componentType);

    // Ensure a component exists (create it if absent)
    public <T extends Component<ECS_TYPE>> void ensureComponent(
        ComponentType<ECS_TYPE, T> componentType);
}
```

### 6. Ref (Entity Reference)

A `Ref` is a reference to an entity in the Store. It contains the entity's index and can be invalidated.

```java
public class Ref<ECS_TYPE> {
    private final Store<ECS_TYPE> store;
    private volatile int index;

    public Store<ECS_TYPE> getStore() { return this.store; }
    public int getIndex() { return this.index; }

    public boolean isValid() { return this.index != Integer.MIN_VALUE; }
    public void validate() {
        if (!isValid()) throw new IllegalStateException("Invalid entity reference!");
    }
}
```

### 7. Store

The `Store` is the main container that manages all entities and their components.

```java
public class Store<ECS_TYPE> implements ComponentAccessor<ECS_TYPE> {
    private final ComponentRegistry<ECS_TYPE> registry;
    private final ECS_TYPE externalData;
    private Ref<ECS_TYPE>[] refs;
    private ArchetypeChunk<ECS_TYPE>[] archetypeChunks;
    private Resource<ECS_TYPE>[] resources;

    // Add an entity
    public Ref<ECS_TYPE> addEntity(Holder<ECS_TYPE> holder, AddReason reason);

    // Remove an entity
    public void removeEntity(Ref<ECS_TYPE> ref, RemoveReason reason);

    // Get a component
    public <T extends Component<ECS_TYPE>> T getComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType);

    // Get an entity's archetype
    public Archetype<ECS_TYPE> getArchetype(Ref<ECS_TYPE> ref);

    // Get a global resource
    public <T extends Resource<ECS_TYPE>> T getResource(ResourceType<ECS_TYPE, T> resourceType);
}
```

### 8. Resource

A `Resource` is global data shared across the entire Store (unlike Components, which are per-entity).

```java
public interface Resource<ECS_TYPE> extends Cloneable {
    Resource<ECS_TYPE> clone();
}
```

---

## ComponentRegistry

The `ComponentRegistry` is the central registry that manages all component types, systems, and resources.

```
+------------------------------------------------------------------+
|                        ComponentRegistry                          |
|                                                                   |
|  Components:                                                      |
|  +------------------+  +------------------+  +------------------+ |
|  | ComponentType[0] |  | ComponentType[1] |  | ComponentType[2] | |
|  | TransformComp    |  | BoundingBox      |  | UUIDComponent    | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  Resources:                                                       |
|  +------------------+  +------------------+                       |
|  | ResourceType[0]  |  | ResourceType[1]  |                       |
|  | SpatialResource  |  | WorldResource    |                       |
|  +------------------+  +------------------+                       |
|                                                                   |
|  SystemTypes:                                                     |
|  +------------------+  +------------------+  +------------------+ |
|  | TickingSystem    |  | RefSystem        |  | QuerySystem      | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  Systems (sorted by dependency):                                  |
|  +------------------+  +------------------+  +------------------+ |
|  | System[0]        |  | System[1]        |  | System[2]        | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
```

### Registering Components

```java
// Component without serialization
ComponentType<EntityStore, MyComponent> MY_COMPONENT =
    registry.registerComponent(MyComponent.class, MyComponent::new);

// Component with serialization (Codec)
ComponentType<EntityStore, TransformComponent> TRANSFORM =
    registry.registerComponent(TransformComponent.class, "Transform", TransformComponent.CODEC);
```

### Registering Resources

```java
// Resource without serialization
ResourceType<EntityStore, MyResource> MY_RESOURCE =
    registry.registerResource(MyResource.class, MyResource::new);

// Resource with serialization
ResourceType<EntityStore, MyResource> MY_RESOURCE =
    registry.registerResource(MyResource.class, "MyResource", MyResource.CODEC);
```

### Special Built-in Components

```java
// Marks an entity as not being ticked
ComponentType<ECS_TYPE, NonTicking<ECS_TYPE>> nonTickingComponentType;

// Marks an entity as not being serialized
ComponentType<ECS_TYPE, NonSerialized<ECS_TYPE>> nonSerializedComponentType;

// Stores unknown components during deserialization
ComponentType<ECS_TYPE, UnknownComponents<ECS_TYPE>> unknownComponentType;
```

---

## Creating a Custom Component

### Step 1: Define the Component Class

```java
public class HealthComponent implements Component<EntityStore> {

    // Codec for serialization
    public static final BuilderCodec<HealthComponent> CODEC =
        BuilderCodec.builder(HealthComponent.class, HealthComponent::new)
            .append(new KeyedCodec<>("MaxHealth", Codec.FLOAT),
                    (c, v) -> c.maxHealth = v, c -> c.maxHealth)
            .add()
            .append(new KeyedCodec<>("CurrentHealth", Codec.FLOAT),
                    (c, v) -> c.currentHealth = v, c -> c.currentHealth)
            .add()
            .build();

    private float maxHealth = 100.0f;
    private float currentHealth = 100.0f;

    public HealthComponent() {}

    public HealthComponent(float maxHealth, float currentHealth) {
        this.maxHealth = maxHealth;
        this.currentHealth = currentHealth;
    }

    // Getters and setters
    public float getMaxHealth() { return maxHealth; }
    public void setMaxHealth(float maxHealth) { this.maxHealth = maxHealth; }
    public float getCurrentHealth() { return currentHealth; }
    public void setCurrentHealth(float currentHealth) { this.currentHealth = currentHealth; }

    public void damage(float amount) {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
    }

    public void heal(float amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    public boolean isDead() {
        return this.currentHealth <= 0;
    }

    // REQUIRED: Implementation of clone()
    @Override
    public Component<EntityStore> clone() {
        return new HealthComponent(this.maxHealth, this.currentHealth);
    }
}
```

### Step 2: Register the Component

```java
// In your module or initialization system
public class MyModule {
    private static ComponentType<EntityStore, HealthComponent> HEALTH_COMPONENT_TYPE;

    public static void init(ComponentRegistry<EntityStore> registry) {
        // Registration with serialization
        HEALTH_COMPONENT_TYPE = registry.registerComponent(
            HealthComponent.class,
            "Health",           // Unique ID for serialization
            HealthComponent.CODEC
        );
    }

    public static ComponentType<EntityStore, HealthComponent> getHealthComponentType() {
        return HEALTH_COMPONENT_TYPE;
    }
}
```

### Step 3: Use the Component

```java
// Create an entity with the component
Holder<EntityStore> holder = registry.newHolder();
holder.addComponent(MyModule.getHealthComponentType(), new HealthComponent(100, 100));
Ref<EntityStore> entityRef = store.addEntity(holder, AddReason.SPAWN);

// Access the component
HealthComponent health = store.getComponent(entityRef, MyModule.getHealthComponentType());
health.damage(25);

// Check if the entity has the component
Archetype<EntityStore> archetype = store.getArchetype(entityRef);
if (archetype.contains(MyModule.getHealthComponentType())) {
    // The entity has a Health component
}
```

---

## Query System

Queries allow you to filter entities based on their components.

### Query Interface

```java
public interface Query<ECS_TYPE> {
    // Tests whether an archetype matches the query
    boolean test(Archetype<ECS_TYPE> archetype);

    // Checks if the query depends on a specific component type
    boolean requiresComponentType(ComponentType<ECS_TYPE, ?> componentType);

    // Factory methods
    static <ECS_TYPE> AnyQuery<ECS_TYPE> any();           // Matches everything
    static <ECS_TYPE> NotQuery<ECS_TYPE> not(Query<ECS_TYPE> query);  // Negation
    static <ECS_TYPE> AndQuery<ECS_TYPE> and(Query<ECS_TYPE>... queries);  // Logical AND
    static <ECS_TYPE> OrQuery<ECS_TYPE> or(Query<ECS_TYPE>... queries);   // Logical OR
}
```

### Query Types

```
Query (interface)
  |
  +-- Archetype (an archetype is also a query)
  |
  +-- ComponentType (a ComponentType is also a query)
  |
  +-- AnyQuery (matches everything)
  |
  +-- NotQuery (negation)
  |
  +-- AndQuery (logical AND)
  |
  +-- OrQuery (logical OR)
  |
  +-- ExactArchetypeQuery (exact archetype match)
  |
  +-- ReadWriteArchetypeQuery (interface)
       |
       +-- ReadWriteQuery (implementation)
```

### ReadWriteQuery

The `ReadWriteQuery` distinguishes between read-only components and modified components.

```java
public class ReadWriteQuery<ECS_TYPE> implements ReadWriteArchetypeQuery<ECS_TYPE> {
    private final Archetype<ECS_TYPE> read;   // Components being read
    private final Archetype<ECS_TYPE> write;  // Components being modified

    public ReadWriteQuery(Archetype<ECS_TYPE> read, Archetype<ECS_TYPE> write) {
        this.read = read;
        this.write = write;
    }

    @Override
    public boolean test(Archetype<ECS_TYPE> archetype) {
        return archetype.contains(this.read) && archetype.contains(this.write);
    }
}
```

### Usage Examples

```java
// Simple query: all entities with TransformComponent
Query<EntityStore> hasTransform = TransformComponent.getComponentType();

// Combined query: entities with Transform AND Health
Query<EntityStore> query = Query.and(
    TransformComponent.getComponentType(),
    MyModule.getHealthComponentType()
);

// Query with negation: entities with Transform but WITHOUT Health
Query<EntityStore> query = Query.and(
    TransformComponent.getComponentType(),
    Query.not(MyModule.getHealthComponentType())
);

// Archetype as query
Archetype<EntityStore> archetype = Archetype.of(
    TransformComponent.getComponentType(),
    BoundingBox.getComponentType()
);
// Tests if an entity has AT LEAST these components

// ReadWriteQuery for a system that reads Transform and modifies Health
ReadWriteQuery<EntityStore> query = new ReadWriteQuery<>(
    Archetype.of(TransformComponent.getComponentType()),  // Read
    Archetype.of(MyModule.getHealthComponentType())       // Write
);
```

---

## Systems and SystemGroups

### System Hierarchy

```
ISystem (interface)
  |
  +-- System (abstract base)
       |
       +-- QuerySystem (interface) - systems that filter by archetype
       |    |
       |    +-- RefSystem - callback on entity add/remove
       |    |
       |    +-- HolderSystem - callback on holder before add
       |    |
       |    +-- TickingSystem
       |         |
       |         +-- ArchetypeTickingSystem
       |              |
       |              +-- EntityTickingSystem
       |
       +-- EventSystem
            |
            +-- EntityEventSystem - events on entities
            |
            +-- WorldEventSystem - global events
```

### ISystem

Base interface for all systems.

```java
public interface ISystem<ECS_TYPE> {
    // Lifecycle callbacks
    default void onSystemRegistered() {}
    default void onSystemUnregistered() {}

    // Group this system belongs to
    default SystemGroup<ECS_TYPE> getGroup() { return null; }

    // Dependencies for execution order
    default Set<Dependency<ECS_TYPE>> getDependencies() {
        return Collections.emptySet();
    }
}
```

### System (Base Class)

```java
public abstract class System<ECS_TYPE> implements ISystem<ECS_TYPE> {

    // Register a component associated with this system
    protected <T extends Component<ECS_TYPE>> ComponentType<ECS_TYPE, T> registerComponent(
        Class<? super T> tClass, Supplier<T> supplier);

    protected <T extends Component<ECS_TYPE>> ComponentType<ECS_TYPE, T> registerComponent(
        Class<? super T> tClass, String id, BuilderCodec<T> codec);

    // Register a resource associated with this system
    public <T extends Resource<ECS_TYPE>> ResourceType<ECS_TYPE, T> registerResource(
        Class<? super T> tClass, Supplier<T> supplier);
}
```

### TickingSystem

A system that executes on every tick.

```java
public abstract class TickingSystem<ECS_TYPE> extends System<ECS_TYPE>
    implements TickableSystem<ECS_TYPE> {

    // dt = delta time, systemIndex = index of the system
    public abstract void tick(float dt, int systemIndex, Store<ECS_TYPE> store);
}
```

### ArchetypeTickingSystem

A ticking system that filters by archetype.

```java
public abstract class ArchetypeTickingSystem<ECS_TYPE> extends TickingSystem<ECS_TYPE>
    implements QuerySystem<ECS_TYPE> {

    // Query to filter entities
    public abstract Query<ECS_TYPE> getQuery();

    // Tick on each matching ArchetypeChunk
    public abstract void tick(
        float dt,
        ArchetypeChunk<ECS_TYPE> archetypeChunk,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );
}
```

### EntityTickingSystem

A ticking system that iterates over each entity.

```java
public abstract class EntityTickingSystem<ECS_TYPE> extends ArchetypeTickingSystem<ECS_TYPE> {

    // Tick on a specific entity
    public abstract void tick(
        float dt,
        int index,                         // Index in the ArchetypeChunk
        ArchetypeChunk<ECS_TYPE> archetypeChunk,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );

    // Parallelism support
    public boolean isParallel(int archetypeChunkSize, int taskCount) {
        return false;
    }
}
```

### RefSystem

A system that reacts to entity addition and removal.

```java
public abstract class RefSystem<ECS_TYPE> extends System<ECS_TYPE>
    implements QuerySystem<ECS_TYPE> {

    // Query to filter relevant entities
    public abstract Query<ECS_TYPE> getQuery();

    // Called when an entity matching the query is added
    public abstract void onEntityAdded(
        Ref<ECS_TYPE> ref,
        AddReason reason,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );

    // Called when an entity matching the query is removed
    public abstract void onEntityRemove(
        Ref<ECS_TYPE> ref,
        RemoveReason reason,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );
}
```

### SystemGroup

A group of systems for organizing execution order.

```java
public class SystemGroup<ECS_TYPE> {
    private final ComponentRegistry<ECS_TYPE> registry;
    private final int index;
    private final Set<Dependency<ECS_TYPE>> dependencies;
}
```

### Dependencies (Execution Order)

```java
public enum Order {
    BEFORE,  // Execute before the dependency
    AFTER    // Execute after the dependency
}

public abstract class Dependency<ECS_TYPE> {
    protected final Order order;
    protected final int priority;

    public Dependency(Order order, int priority);
    public Dependency(Order order, OrderPriority priority);
}

// Dependency types
// - SystemDependency: dependency on a specific system
// - SystemTypeDependency: dependency on a system type
// - SystemGroupDependency: dependency on a system group
// - RootDependency: root dependency
```

---

## Complete Example: Creating a System

```java
public class HealthRegenSystem extends EntityTickingSystem<EntityStore> {

    private static ComponentType<EntityStore, HealthComponent> HEALTH;

    // Query: entities with Health
    private final Query<EntityStore> query;

    public HealthRegenSystem() {
        HEALTH = this.registerComponent(
            HealthComponent.class,
            "Health",
            HealthComponent.CODEC
        );
        this.query = HEALTH;
    }

    @Override
    public Query<EntityStore> getQuery() {
        return this.query;
    }

    @Override
    public Set<Dependency<EntityStore>> getDependencies() {
        // Execute after the damage system
        return Set.of(
            new SystemTypeDependency<>(Order.AFTER, DamageSystem.class)
        );
    }

    @Override
    public void tick(
        float dt,
        int index,
        ArchetypeChunk<EntityStore> chunk,
        Store<EntityStore> store,
        CommandBuffer<EntityStore> buffer
    ) {
        // Get the Health component for this entity
        HealthComponent health = chunk.getComponent(index, HEALTH);

        // Regenerate 1 HP per second
        if (!health.isDead()) {
            health.heal(dt * 1.0f);
        }
    }
}
```

---

## Entities: Entity, LivingEntity, Player

### Entity Hierarchy

```
Component<EntityStore> (interface)
  |
  +-- Entity (abstract)
       |
       +-- LivingEntity (abstract)
       |    |
       |    +-- Player
       |    |
       |    +-- (other living entities)
       |
       +-- BlockEntity
       |
       +-- (other entity types)
```

### Entity

The base class for all game entities.

```java
public abstract class Entity implements Component<EntityStore> {
    protected int networkId = -1;
    protected World world;
    protected Ref<EntityStore> reference;
    protected final AtomicBoolean wasRemoved = new AtomicBoolean();

    // Codec for serialization
    public static final BuilderCodec<Entity> CODEC =
        BuilderCodec.abstractBuilder(Entity.class)
            .legacyVersioned()
            .codecVersion(5)
            .append(DISPLAY_NAME, ...)
            .append(UUID, ...)
            .build();

    // Remove the entity from the world
    public boolean remove();

    // Load the entity into a world
    public void loadIntoWorld(World world);

    // Reference to the entity in the ECS
    public Ref<EntityStore> getReference();

    // Convert to Holder for serialization/copying
    public Holder<EntityStore> toHolder();
}
```

### LivingEntity

An entity with an inventory and stats.

```java
public abstract class LivingEntity extends Entity {
    private final StatModifiersManager statModifiersManager = new StatModifiersManager();
    private Inventory inventory;
    protected double currentFallDistance;

    public static final BuilderCodec<LivingEntity> CODEC =
        BuilderCodec.abstractBuilder(LivingEntity.class, Entity.CODEC)
            .append(new KeyedCodec<>("Inventory", Inventory.CODEC), ...)
            .build();

    // Create the default inventory
    protected abstract Inventory createDefaultInventory();

    // Inventory management
    public Inventory getInventory();
    public Inventory setInventory(Inventory inventory);

    // Fall damage management
    public double getCurrentFallDistance();

    // Stat modifiers
    public StatModifiersManager getStatModifiersManager();
}
```

### Player

The connected player.

```java
public class Player extends LivingEntity implements CommandSender, PermissionHolder {
    private PlayerRef playerRef;
    private PlayerConfigData data;
    private final WorldMapTracker worldMapTracker;
    private final WindowManager windowManager;
    private final PageManager pageManager;
    private final HudManager hudManager;
    private HotbarManager hotbarManager;
    private GameMode gameMode;

    public static final BuilderCodec<Player> CODEC =
        BuilderCodec.builder(Player.class, Player::new, LivingEntity.CODEC)
            .append(PLAYER_CONFIG_DATA, ...)
            .append(GameMode, ...)
            .build();

    // ComponentType to identify players
    public static ComponentType<EntityStore, Player> getComponentType() {
        return EntityModule.get().getPlayerComponentType();
    }

    // Player initialization
    public void init(UUID uuid, PlayerRef playerRef);

    // GameMode management
    public GameMode getGameMode();
    public void setGameMode(GameMode gameMode);

    // UI managers
    public WindowManager getWindowManager();
    public PageManager getPageManager();
    public HudManager getHudManager();
}
```

---

## Important Built-in Components

### TransformComponent

The position and rotation of an entity.

```java
public class TransformComponent implements Component<EntityStore> {
    private final Vector3d position = new Vector3d();
    private final Vector3f rotation = new Vector3f();

    public static ComponentType<EntityStore, TransformComponent> getComponentType();

    public Vector3d getPosition();
    public Vector3f getRotation();
    public Transform getTransform();
}
```

### BoundingBox

The collision box of an entity.

```java
public class BoundingBox implements Component<EntityStore> {
    private final Box boundingBox = new Box();

    public static ComponentType<EntityStore, BoundingBox> getComponentType();

    public Box getBoundingBox();
    public void setBoundingBox(Box boundingBox);
}
```

### UUIDComponent

The persistent unique identifier of an entity.

```java
public final class UUIDComponent implements Component<EntityStore> {
    private UUID uuid;

    public static ComponentType<EntityStore, UUIDComponent> getComponentType();

    public UUID getUuid();

    public static UUIDComponent generateVersion3UUID();
    public static UUIDComponent randomUUID();
}
```

### NonTicking

Marks an entity so that it is not processed by TickingSystems.

```java
public class NonTicking<ECS_TYPE> implements Component<ECS_TYPE> {
    private static final NonTicking<?> INSTANCE = new NonTicking();

    public static <ECS_TYPE> NonTicking<ECS_TYPE> get();
}

// Usage: add this component to disable ticking
holder.addComponent(registry.getNonTickingComponentType(), NonTicking.get());
```

### NonSerialized

Marks an entity so that it is not saved.

```java
public class NonSerialized<ECS_TYPE> implements Component<ECS_TYPE> {
    private static final NonSerialized<?> INSTANCE = new NonSerialized();

    public static <ECS_TYPE> NonSerialized<ECS_TYPE> get();
}

// Usage: add this component to prevent saving
holder.addComponent(registry.getNonSerializedComponentType(), NonSerialized.get());
```

### Other Important Components

| Component | Description |
|-----------|-------------|
| `Velocity` | Entity velocity |
| `CollisionResultComponent` | Collision results |
| `ModelComponent` | Entity 3D model |
| `DisplayNameComponent` | Display name |
| `MovementStatesComponent` | Movement states (on ground, flying, etc.) |
| `KnockbackComponent` | Knockback after a hit |
| `DamageDataComponent` | Damage data received |
| `ProjectileComponent` | Component for projectiles |
| `EffectControllerComponent` | Active effects on the entity |

---

## CommandBuffer

The `CommandBuffer` allows deferred (thread-safe) modifications to the Store.

```java
public class CommandBuffer<ECS_TYPE> implements ComponentAccessor<ECS_TYPE> {
    private final Store<ECS_TYPE> store;
    private final Deque<Consumer<Store<ECS_TYPE>>> queue;

    // Add an action to execute later
    public void run(Consumer<Store<ECS_TYPE>> consumer);

    // Add an entity
    public Ref<ECS_TYPE> addEntity(Holder<ECS_TYPE> holder, AddReason reason);

    // Remove an entity
    public void removeEntity(Ref<ECS_TYPE> ref, RemoveReason reason);

    // Read a component (immediate access)
    public <T extends Component<ECS_TYPE>> T getComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType);

    // Add a component to an entity
    public <T extends Component<ECS_TYPE>> void addComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType, T component);

    // Remove a component from an entity
    public <T extends Component<ECS_TYPE>> void removeComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType);

    // Dispatch an event
    public <T extends EcsEvent> void dispatchEntityEvent(
        EntityEventType<ECS_TYPE, T> eventType, Ref<ECS_TYPE> ref, T event);

    public <T extends EcsEvent> void dispatchWorldEvent(
        WorldEventType<ECS_TYPE, T> eventType, T event);
}
```

---

## AddReason and RemoveReason

Enumerations indicating why an entity is added or removed.

```java
public enum AddReason {
    SPAWN,  // New entity created
    LOAD    // Entity loaded from save
}

public enum RemoveReason {
    REMOVE,  // Entity permanently removed
    UNLOAD   // Entity unloaded (saved)
}
```

---

## Data Flow

```
1. ENTITY CREATION
   +---------------+     +---------+     +--------+     +--------------+
   | Create Holder | --> | Add to  | --> | Store  | --> | RefSystems   |
   | with Components|     | Store   |     | assigns|     | onEntityAdded|
   +---------------+     +---------+     | Ref    |     +--------------+
                                          +--------+

2. TICK
   +--------+     +-----------------+     +------------------+
   | Store  | --> | For each System | --> | For each matching|
   | .tick()|     | (sorted)        |     | ArchetypeChunk   |
   +--------+     +-----------------+     +------------------+
                                                   |
                                                   v
                                          +------------------+
                                          | System.tick()    |
                                          | (with buffer)    |
                                          +------------------+

3. ARCHETYPE MODIFICATION (component add/remove)
   +-------------+     +------------------+     +------------------+
   | CommandBuffer| --> | Remove from old  | --> | Add to new       |
   | .addComponent|     | ArchetypeChunk   |     | ArchetypeChunk   |
   +-------------+     +------------------+     +------------------+

4. ENTITY REMOVAL
   +-------------+     +--------------+     +------------------+
   | CommandBuffer| --> | RefSystems   | --> | Remove from      |
   | .removeEntity|     | onEntityRemove|     | ArchetypeChunk   |
   +-------------+     +--------------+     +------------------+
```

---

## Best Practices

1. **Keep components simple**: Components should be simple data containers without complex logic.

2. **One responsibility per system**: Each system should have a single, clear responsibility.

3. **Use the CommandBuffer**: Never modify the Store directly during a tick. Always use the CommandBuffer.

4. **Efficient queries**: Use Archetypes rather than complex queries when possible.

5. **NonTicking for static entities**: Add `NonTicking` to entities that do not need to be updated.

6. **NonSerialized for temporary entities**: Add `NonSerialized` to entities that should not be saved.

7. **Explicit dependencies**: Always declare dependencies between systems to ensure correct execution order.

8. **Mandatory clone()**: Always implement `clone()` correctly for components that need to be copied.

---

## Additional Built-in Components Reference

The following sections document additional ECS components found in the decompiled server source code. These components provide essential functionality for entity behavior, networking, and rendering.

### Invulnerable

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `Invulnerable` component is a marker component (tag) that makes an entity immune to damage. It uses the singleton pattern - there is only one instance shared by all invulnerable entities.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/Invulnerable.java`

```java
public class Invulnerable implements Component<EntityStore> {
   public static final Invulnerable INSTANCE = new Invulnerable();
   public static final BuilderCodec<Invulnerable> CODEC =
       BuilderCodec.builder(Invulnerable.class, () -> INSTANCE).build();

   public static ComponentType<EntityStore, Invulnerable> getComponentType() {
      return EntityModule.get().getInvulnerableComponentType();
   }

   private Invulnerable() {}

   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Make an entity invulnerable
commandBuffer.addComponent(ref, Invulnerable.getComponentType(), Invulnerable.INSTANCE);

// Remove invulnerability
commandBuffer.removeComponent(ref, Invulnerable.getComponentType());

// Check if entity is invulnerable
Archetype<EntityStore> archetype = store.getArchetype(ref);
boolean isInvulnerable = archetype.contains(Invulnerable.getComponentType());
```

**Usage notes:**
- The component is automatically synced to clients via `InvulnerableSystems.EntityTrackerUpdate`
- When added, it queues a `ComponentUpdate` with type `ComponentUpdateType.Invulnerable` to all viewers
- When removed, it sends a remove notification to all viewing clients

---

### Intangible

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `Intangible` component is a marker component that makes an entity non-collidable. Other entities and projectiles will pass through intangible entities. Like `Invulnerable`, it uses the singleton pattern.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/Intangible.java`

```java
public class Intangible implements Component<EntityStore> {
   public static final Intangible INSTANCE = new Intangible();
   public static final BuilderCodec<Intangible> CODEC =
       BuilderCodec.builder(Intangible.class, () -> INSTANCE).build();

   public static ComponentType<EntityStore, Intangible> getComponentType() {
      return EntityModule.get().getIntangibleComponentType();
   }

   private Intangible() {}

   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Make an entity intangible (non-collidable)
holder.ensureComponent(Intangible.getComponentType());
// or
commandBuffer.addComponent(ref, Intangible.getComponentType(), Intangible.INSTANCE);

// Remove intangibility
commandBuffer.removeComponent(ref, Intangible.getComponentType());
```

**Usage notes:**
- Commonly used for dropped item entities to prevent collision with other items
- Synced to clients via `IntangibleSystems.EntityTrackerUpdate`
- Used in `ItemComponent.generateItemDrop()` to make dropped items intangible

---

### Interactable

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `Interactable` component marks an entity as interactable by players. This enables interaction events (like right-click actions) to be processed for the entity.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/Interactable.java`

```java
public class Interactable implements Component<EntityStore> {
   @Nonnull
   public static final Interactable INSTANCE = new Interactable();
   @Nonnull
   public static final BuilderCodec<Interactable> CODEC =
       BuilderCodec.builder(Interactable.class, () -> INSTANCE).build();

   public static ComponentType<EntityStore, Interactable> getComponentType() {
      return EntityModule.get().getInteractableComponentType();
   }

   private Interactable() {}

   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Make an entity interactable
holder.addComponent(Interactable.getComponentType(), Interactable.INSTANCE);

// Remove interactability
commandBuffer.removeComponent(ref, Interactable.getComponentType());
```

**Usage notes:**
- Used for NPCs, containers, and other entities that players can interact with
- The interaction logic is handled by separate systems that query for this component

---

### ItemComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

The `ItemComponent` represents a dropped item in the world. It contains the item stack data, pickup delays, merge delays, and provides utilities for creating item drops and handling pickups.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/ItemComponent.java`

```java
public class ItemComponent implements Component<EntityStore> {
   @Nonnull
   public static final BuilderCodec<ItemComponent> CODEC = BuilderCodec.builder(ItemComponent.class, ItemComponent::new)
      .append(new KeyedCodec<>("Item", ItemStack.CODEC), ...)
      .append(new KeyedCodec<>("StackDelay", Codec.FLOAT), ...)
      .append(new KeyedCodec<>("PickupDelay", Codec.FLOAT), ...)
      .append(new KeyedCodec<>("PickupThrottle", Codec.FLOAT), ...)
      .append(new KeyedCodec<>("RemovedByPlayerPickup", Codec.BOOLEAN), ...)
      .build();

   public static final float DEFAULT_PICKUP_DELAY = 0.5F;
   public static final float PICKUP_DELAY_DROPPED = 1.5F;
   public static final float PICKUP_THROTTLE = 0.25F;
   public static final float DEFAULT_MERGE_DELAY = 1.5F;

   @Nullable
   private ItemStack itemStack;
   private boolean isNetworkOutdated;
   private float mergeDelay = 1.5F;
   private float pickupDelay = 0.5F;
   private float pickupThrottle;
   private boolean removedByPlayerPickup;
   private float pickupRange = -1.0F;

   // ... methods
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `itemStack` | `ItemStack` | null | The item stack this entity represents |
| `mergeDelay` | float | 1.5 | Delay before items can merge (seconds) |
| `pickupDelay` | float | 0.5 | Delay before item can be picked up (seconds) |
| `pickupThrottle` | float | 0.25 | Cooldown between pickup attempts |
| `removedByPlayerPickup` | boolean | false | Whether item was removed by player pickup |
| `pickupRange` | float | -1.0 | Range for pickup (-1 = use config default) |

**How to create item drops:**

```java
// Create a single item drop
Holder<EntityStore> itemHolder = ItemComponent.generateItemDrop(
    accessor,           // ComponentAccessor
    itemStack,          // ItemStack to drop
    position,           // Vector3d position
    rotation,           // Vector3f rotation
    velocityX,          // float horizontal velocity
    velocityY,          // float vertical velocity (3.25F default)
    velocityZ           // float horizontal velocity
);
store.addEntity(itemHolder, AddReason.SPAWN);

// Create multiple item drops from a list
Holder<EntityStore>[] items = ItemComponent.generateItemDrops(
    accessor, itemStacks, position, rotation
);

// Add item to a container (handles partial pickup)
ItemStack pickedUp = ItemComponent.addToItemContainer(store, itemRef, itemContainer);
```

**Usage notes:**
- Automatically assigns `Intangible`, `Velocity`, `PhysicsValues`, `UUIDComponent`, and `DespawnComponent`
- Item lifetime defaults to 120 seconds (configurable via `ItemEntityConfig`)
- Can emit dynamic light if the item/block has a light property

---

### PlayerInput

**Package:** `com.hypixel.hytale.server.core.modules.entity.player`

The `PlayerInput` component handles player input updates including movement, rotation, and mount control. It queues input updates that are processed by player systems.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/player/PlayerInput.java`

```java
public class PlayerInput implements Component<EntityStore> {
   @Nonnull
   private final List<PlayerInput.InputUpdate> inputUpdateQueue = new ObjectArrayList<>();
   private int mountId;

   public static ComponentType<EntityStore, PlayerInput> getComponentType() {
      return EntityModule.get().getPlayerInputComponentType();
   }

   public void queue(PlayerInput.InputUpdate inputUpdate);
   @Nonnull
   public List<PlayerInput.InputUpdate> getMovementUpdateQueue();
   public int getMountId();
   public void setMountId(int mountId);
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `inputUpdateQueue` | `List<InputUpdate>` | Queue of pending input updates |
| `mountId` | int | Network ID of the mount entity (0 = not mounted) |

**Input Update Types:**

| Type | Description |
|------|-------------|
| `AbsoluteMovement` | Teleport to absolute position (x, y, z) |
| `RelativeMovement` | Move relative to current position |
| `WishMovement` | Desired movement direction |
| `SetBody` | Set body rotation (pitch, yaw, roll) |
| `SetHead` | Set head rotation (pitch, yaw, roll) |
| `SetMovementStates` | Set movement state flags |
| `SetClientVelocity` | Set velocity from client |
| `SetRiderMovementStates` | Set movement states while riding |

**How to use:**

```java
// Queue an absolute movement
PlayerInput input = store.getComponent(playerRef, PlayerInput.getComponentType());
input.queue(new PlayerInput.AbsoluteMovement(x, y, z));

// Queue a head rotation change
input.queue(new PlayerInput.SetHead(new Direction(pitch, yaw, roll)));
```

---

### NetworkId

**Package:** `com.hypixel.hytale.server.core.modules.entity.tracker`

The `NetworkId` component assigns a unique network identifier to an entity for client-server synchronization. This ID is used in network packets to reference entities.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/tracker/NetworkId.java`

```java
public final class NetworkId implements Component<EntityStore> {
   private final int id;

   @Nonnull
   public static ComponentType<EntityStore, NetworkId> getComponentType() {
      return EntityModule.get().getNetworkIdComponentType();
   }

   public NetworkId(int id) {
      this.id = id;
   }

   public int getId() {
      return this.id;
   }

   @Nonnull
   @Override
   public Component<EntityStore> clone() {
      return this;  // Immutable - returns same instance
   }
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | int | Unique network identifier for the entity |

**How to add:**

```java
// Get next network ID from world and assign to entity
int networkId = world.getExternalData().takeNextNetworkId();
holder.addComponent(NetworkId.getComponentType(), new NetworkId(networkId));

// Or during entity generation
holder.addComponent(NetworkId.getComponentType(),
    new NetworkId(ref.getStore().getExternalData().takeNextNetworkId()));
```

**Usage notes:**
- Network IDs are assigned automatically by the entity tracker system for tracked entities
- The component is immutable - `clone()` returns the same instance
- Used extensively in packet serialization for entity references

---

### Frozen

**Package:** `com.hypixel.hytale.server.core.entity`

The `Frozen` component is a marker component that stops an entity from moving or being affected by physics. Uses the singleton pattern.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/entity/Frozen.java`

```java
public class Frozen implements Component<EntityStore> {
   public static final BuilderCodec<Frozen> CODEC =
       BuilderCodec.builder(Frozen.class, Frozen::get).build();
   private static final Frozen INSTANCE = new Frozen();

   public static ComponentType<EntityStore, Frozen> getComponentType() {
      return EntityModule.get().getFrozenComponentType();
   }

   public static Frozen get() {
      return INSTANCE;
   }

   private Frozen() {}

   @Override
   public Component<EntityStore> clone() {
      return get();
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Freeze an entity
commandBuffer.addComponent(ref, Frozen.getComponentType(), Frozen.get());

// Unfreeze an entity
commandBuffer.removeComponent(ref, Frozen.getComponentType());
```

**Usage notes:**
- Useful for cutscenes, dialogue, or pausing entities
- Does not make the entity invulnerable - combine with `Invulnerable` if needed

---

### Teleport

**Package:** `com.hypixel.hytale.server.core.modules.entity.teleport`

The `Teleport` component is used to teleport an entity to a new position, rotation, and optionally a different world. It is a transient component that is automatically removed after the teleport is processed.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/teleport/Teleport.java`

```java
public class Teleport implements Component<EntityStore> {
   @Nullable
   private final World world;
   @Nonnull
   private final Vector3d position = new Vector3d();
   @Nonnull
   private final Vector3f rotation = new Vector3f();
   @Nullable
   private Vector3f headRotation;
   private boolean resetVelocity = true;

   @Nonnull
   public static ComponentType<EntityStore, Teleport> getComponentType() {
      return EntityModule.get().getTeleportComponentType();
   }

   // Constructors
   public Teleport(@Nullable World world, @Nonnull Vector3d position, @Nonnull Vector3f rotation);
   public Teleport(@Nonnull Vector3d position, @Nonnull Vector3f rotation);
   public Teleport(@Nullable World world, @Nonnull Transform transform);
   public Teleport(@Nonnull Transform transform);

   // Fluent modifiers
   @Nonnull
   public Teleport withHeadRotation(@Nonnull Vector3f headRotation);
   public Teleport withResetRoll();
   public Teleport withoutVelocityReset();

   // Getters
   @Nullable
   public World getWorld();
   @Nonnull
   public Vector3d getPosition();
   @Nonnull
   public Vector3f getRotation();
   @Nullable
   public Vector3f getHeadRotation();
   public boolean isResetVelocity();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `world` | `World` | null | Target world (null = same world) |
| `position` | `Vector3d` | - | Target position |
| `rotation` | `Vector3f` | - | Target body rotation |
| `headRotation` | `Vector3f` | null | Target head rotation (optional) |
| `resetVelocity` | boolean | true | Whether to reset velocity after teleport |

**How to teleport an entity:**

```java
// Teleport to position in same world
commandBuffer.addComponent(ref, Teleport.getComponentType(),
    new Teleport(new Vector3d(100, 64, 200), new Vector3f(0, 90, 0)));

// Teleport to a different world
commandBuffer.addComponent(ref, Teleport.getComponentType(),
    new Teleport(targetWorld, position, rotation));

// Teleport with head rotation and without resetting velocity
Teleport teleport = new Teleport(position, rotation)
    .withHeadRotation(headRotation)
    .withoutVelocityReset();
commandBuffer.addComponent(ref, Teleport.getComponentType(), teleport);
```

**Usage notes:**
- The `Teleport` component is processed by `TeleportSystems.MoveSystem` (for entities) or `TeleportSystems.PlayerMoveSystem` (for players)
- For players, teleportation sends a `ClientTeleport` packet and waits for acknowledgment
- The component is automatically removed after processing
- Cross-world teleportation moves the entity between stores

---

### EntityScaleComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `EntityScaleComponent` controls the visual scale of an entity. This affects the rendered size of the entity's model on clients.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/EntityScaleComponent.java`

```java
public class EntityScaleComponent implements Component<EntityStore> {
   public static final BuilderCodec<EntityScaleComponent> CODEC =
       BuilderCodec.builder(EntityScaleComponent.class, EntityScaleComponent::new)
          .addField(new KeyedCodec<>("Scale", Codec.FLOAT),
              (o, scale) -> o.scale = scale, o -> o.scale)
          .build();

   private float scale = 1.0F;
   private boolean isNetworkOutdated = true;

   public static ComponentType<EntityStore, EntityScaleComponent> getComponentType() {
      return EntityModule.get().getEntityScaleComponentType();
   }

   public EntityScaleComponent() {}
   public EntityScaleComponent(float scale) {
      this.scale = scale;
   }

   public float getScale();
   public void setScale(float scale);
   public boolean consumeNetworkOutdated();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scale` | float | 1.0 | Scale multiplier (1.0 = normal size) |
| `isNetworkOutdated` | boolean | true | Internal flag for network sync |

**How to use:**

```java
// Create entity with custom scale
holder.addComponent(EntityScaleComponent.getComponentType(),
    new EntityScaleComponent(2.0f));  // Double size

// Modify scale at runtime
EntityScaleComponent scaleComponent = store.getComponent(ref,
    EntityScaleComponent.getComponentType());
scaleComponent.setScale(0.5f);  // Half size
```

**Usage notes:**
- Changes to scale are automatically synchronized to clients
- Only affects visual rendering, not collision/hitbox
- Scale of 0 or negative values may cause undefined behavior

---

### HitboxCollision

**Package:** `com.hypixel.hytale.server.core.modules.entity.hitboxcollision`

The `HitboxCollision` component defines how an entity's hitbox interacts with other entities. It references a `HitboxCollisionConfig` asset that defines collision behavior.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/hitboxcollision/HitboxCollision.java`

```java
public class HitboxCollision implements Component<EntityStore> {
   public static final BuilderCodec<HitboxCollision> CODEC =
       BuilderCodec.builder(HitboxCollision.class, HitboxCollision::new)
          .append(new KeyedCodec<>("HitboxCollisionConfigIndex", Codec.INTEGER), ...)
          .build();

   private int hitboxCollisionConfigIndex;
   private boolean isNetworkOutdated = true;

   public static ComponentType<EntityStore, HitboxCollision> getComponentType() {
      return EntityModule.get().getHitboxCollisionComponentType();
   }

   public HitboxCollision(@Nonnull HitboxCollisionConfig hitboxCollisionConfig) {
      this.hitboxCollisionConfigIndex =
          HitboxCollisionConfig.getAssetMap().getIndexOrDefault(hitboxCollisionConfig.getId(), -1);
   }

   public int getHitboxCollisionConfigIndex();
   public void setHitboxCollisionConfigIndex(int hitboxCollisionConfigIndex);
   public boolean consumeNetworkOutdated();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `hitboxCollisionConfigIndex` | int | - | Index into `HitboxCollisionConfig` asset map |
| `isNetworkOutdated` | boolean | true | Internal flag for network sync |

**HitboxCollisionConfig properties:**

| Property | Type | Description |
|----------|------|-------------|
| `CollisionType` | `CollisionType` | `Hard` (block movement) or `Soft` (slow down) |
| `SoftCollisionOffsetRatio` | float | Movement ratio when passing through soft collision |

**How to use:**

```java
// Get a hitbox collision config from assets
HitboxCollisionConfig config = HitboxCollisionConfig.getAssetMap().getAsset("mymod:soft_hitbox");

// Add hitbox collision to an entity
holder.addComponent(HitboxCollision.getComponentType(), new HitboxCollision(config));

// Modify hitbox collision at runtime
HitboxCollision hitbox = store.getComponent(ref, HitboxCollision.getComponentType());
hitbox.setHitboxCollisionConfigIndex(newConfigIndex);
```

**Usage notes:**
- Used for entity-to-entity collision (not block collision)
- `Hard` collision type blocks movement completely
- `Soft` collision type allows passing through with reduced speed

---

### Nameplate

**Package:** `com.hypixel.hytale.server.core.entity.nameplate`

The `Nameplate` component displays a floating text label above an entity. This is commonly used for player names, NPC names, or custom labels.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/entity/nameplate/Nameplate.java`

```java
public class Nameplate implements Component<EntityStore> {
   @Nonnull
   public static final BuilderCodec<Nameplate> CODEC =
       BuilderCodec.builder(Nameplate.class, Nameplate::new)
          .append(new KeyedCodec<>("Text", Codec.STRING),
              (nameplate, s) -> nameplate.text = s, nameplate -> nameplate.text)
          .documentation("The contents to display as the nameplate text.")
          .addValidator(Validators.nonNull())
          .build();

   @Nonnull
   private String text = "";
   private boolean isNetworkOutdated = true;

   @Nonnull
   public static ComponentType<EntityStore, Nameplate> getComponentType() {
      return EntityModule.get().getNameplateComponentType();
   }

   public Nameplate() {}
   public Nameplate(@Nonnull String text) {
      this.text = text;
   }

   @Nonnull
   public String getText();
   public void setText(@Nonnull String text);
   public boolean consumeNetworkOutdated();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | String | "" | The text to display above the entity |
| `isNetworkOutdated` | boolean | true | Internal flag for network sync |

**How to use:**

```java
// Create entity with a nameplate
holder.addComponent(Nameplate.getComponentType(), new Nameplate("Shop Keeper"));

// Modify nameplate text at runtime
Nameplate nameplate = store.getComponent(ref, Nameplate.getComponentType());
nameplate.setText("New Name");  // Only updates if text changed

// Remove nameplate
commandBuffer.removeComponent(ref, Nameplate.getComponentType());
```

**Usage notes:**
- Text changes are automatically synced to clients when modified
- The `setText` method only marks the component as outdated if the text actually changes
- Empty string displays no nameplate but keeps the component

---

### DynamicLight

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `DynamicLight` component makes an entity emit light. This creates a moving light source that illuminates the surrounding area.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/DynamicLight.java`

```java
public class DynamicLight implements Component<EntityStore> {
   private ColorLight colorLight = new ColorLight();
   private boolean isNetworkOutdated = true;

   public static ComponentType<EntityStore, DynamicLight> getComponentType() {
      return EntityModule.get().getDynamicLightComponentType();
   }

   public DynamicLight() {}
   public DynamicLight(ColorLight colorLight) {
      this.colorLight = colorLight;
   }

   public ColorLight getColorLight();
   public void setColorLight(ColorLight colorLight);
   public boolean consumeNetworkOutdated();
}
```

**ColorLight properties:**

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `radius` | byte | 0-255 | Light radius in blocks |
| `red` | byte | 0-255 | Red color component |
| `green` | byte | 0-255 | Green color component |
| `blue` | byte | 0-255 | Blue color component |

**How to use:**

```java
// Create a red dynamic light
ColorLight redLight = new ColorLight((byte)15, (byte)255, (byte)0, (byte)0);
holder.addComponent(DynamicLight.getComponentType(), new DynamicLight(redLight));

// Create a white torch-like light
ColorLight torchLight = new ColorLight((byte)12, (byte)255, (byte)200, (byte)100);
holder.addComponent(DynamicLight.getComponentType(), new DynamicLight(torchLight));

// Modify light at runtime
DynamicLight light = store.getComponent(ref, DynamicLight.getComponentType());
light.setColorLight(new ColorLight((byte)10, (byte)0, (byte)255, (byte)0));  // Green light

// Remove dynamic light
commandBuffer.removeComponent(ref, DynamicLight.getComponentType());
```

**Usage notes:**
- Light changes are automatically synced to clients
- For persistent lights (saved with the entity), use `PersistentDynamicLight` instead
- `DynamicLightSystems.Setup` automatically creates `DynamicLight` from `PersistentDynamicLight` on load
- Dropped items automatically emit light if the item/block has a light property (see `ItemComponent.computeDynamicLight()`)

---

### ItemPhysicsComponent (Deprecated)

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

The `ItemPhysicsComponent` is a deprecated component that was used to store physics calculations for dropped items. It contains scaled velocity and collision results. This component has been superseded by newer physics systems.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/ItemPhysicsComponent.java`

```java
@Deprecated
public class ItemPhysicsComponent implements Component<EntityStore> {
   public Vector3d scaledVelocity = new Vector3d();
   public CollisionResult collisionResult = new CollisionResult();

   public static ComponentType<EntityStore, ItemPhysicsComponent> getComponentType() {
      return EntityModule.get().getItemPhysicsComponentType();
   }

   public ItemPhysicsComponent() {}

   public ItemPhysicsComponent(Vector3d scaledVelocity, CollisionResult collisionResult) {
      this.scaledVelocity = scaledVelocity;
      this.collisionResult = collisionResult;
   }

   @Nonnull
   @Override
   public Component<EntityStore> clone() {
      return new ItemPhysicsComponent(this.scaledVelocity, this.collisionResult);
   }
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `scaledVelocity` | `Vector3d` | The scaled velocity vector for the item |
| `collisionResult` | `CollisionResult` | The result of collision calculations |

**Usage notes:**
- This component is deprecated and should not be used in new code
- Use `Velocity` and `PhysicsValues` components instead for item physics

---

### PickupItemComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

The `PickupItemComponent` handles the animation and state when an item is being picked up by an entity. It manages the travel animation from the item's position to the target entity over a configurable duration.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/PickupItemComponent.java`

```java
public class PickupItemComponent implements Component<EntityStore> {
   public static final float PICKUP_TRAVEL_TIME_DEFAULT = 0.15F;
   @Nonnull
   public static final BuilderCodec<PickupItemComponent> CODEC =
       BuilderCodec.builder(PickupItemComponent.class, PickupItemComponent::new).build();

   private Ref<EntityStore> targetRef;
   private Vector3d startPosition;
   private float originalLifeTime;
   private float lifeTime = 0.15F;
   private boolean finished = false;

   @Nonnull
   public static ComponentType<EntityStore, PickupItemComponent> getComponentType() {
      return EntityModule.get().getPickupItemComponentType();
   }

   // Constructors
   public PickupItemComponent() {}
   public PickupItemComponent(@Nonnull Ref<EntityStore> targetRef, @Nonnull Vector3d startPosition);
   public PickupItemComponent(@Nonnull Ref<EntityStore> targetRef, @Nonnull Vector3d startPosition, float lifeTime);

   // Methods
   public boolean hasFinished();
   public void setFinished(boolean finished);
   public void decreaseLifetime(float amount);
   public float getLifeTime();
   public float getOriginalLifeTime();
   public void setInitialLifeTime(float lifeTimeS);
   @Nonnull public Vector3d getStartPosition();
   @Nonnull public Ref<EntityStore> getTargetRef();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `targetRef` | `Ref<EntityStore>` | null | Reference to the entity picking up the item |
| `startPosition` | `Vector3d` | null | Starting position for the pickup animation |
| `originalLifeTime` | float | - | Original duration of the pickup animation |
| `lifeTime` | float | 0.15 | Remaining time for the pickup animation (seconds) |
| `finished` | boolean | false | Whether the pickup animation has completed |

**How to use:**

```java
// Initiate item pickup animation
PickupItemComponent pickup = new PickupItemComponent(
    playerRef,                          // Entity picking up the item
    itemPosition,                       // Starting position
    0.15f                               // Animation duration in seconds
);
commandBuffer.addComponent(itemRef, PickupItemComponent.getComponentType(), pickup);

// Check if pickup is complete
PickupItemComponent pickup = store.getComponent(itemRef, PickupItemComponent.getComponentType());
if (pickup.hasFinished()) {
    // Remove item and add to inventory
}
```

**Usage notes:**
- The component is processed by `PickupItemSystem` which interpolates the item position
- Default travel time is 0.15 seconds (150ms)
- Once finished, the system handles transferring the item to the target's inventory

---

### PreventItemMerging

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

The `PreventItemMerging` component is a marker component (tag) that prevents a dropped item from being merged with other nearby identical items. Uses the singleton pattern.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/PreventItemMerging.java`

```java
public class PreventItemMerging implements Component<EntityStore> {
   @Nonnull
   public static final PreventItemMerging INSTANCE = new PreventItemMerging();
   @Nonnull
   public static final BuilderCodec<PreventItemMerging> CODEC =
       BuilderCodec.builder(PreventItemMerging.class, () -> INSTANCE).build();

   @Nonnull
   public static ComponentType<EntityStore, PreventItemMerging> getComponentType() {
      return EntityModule.get().getPreventItemMergingType();
   }

   private PreventItemMerging() {}

   @Nonnull
   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Prevent an item from merging with others
holder.addComponent(PreventItemMerging.getComponentType(), PreventItemMerging.INSTANCE);
// or
commandBuffer.addComponent(itemRef, PreventItemMerging.getComponentType(), PreventItemMerging.INSTANCE);

// Allow merging again
commandBuffer.removeComponent(itemRef, PreventItemMerging.getComponentType());
```

**Usage notes:**
- Useful for quest items, unique drops, or items that should remain separate
- The `ItemMergeSystem` checks for this component before attempting to merge items

---

### PreventPickup

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

The `PreventPickup` component is a marker component (tag) that prevents a dropped item from being picked up by any entity. Uses the singleton pattern.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/PreventPickup.java`

```java
public class PreventPickup implements Component<EntityStore> {
   @Nonnull
   public static final PreventPickup INSTANCE = new PreventPickup();
   @Nonnull
   public static final BuilderCodec<PreventPickup> CODEC =
       BuilderCodec.builder(PreventPickup.class, () -> INSTANCE).build();

   @Nonnull
   public static ComponentType<EntityStore, PreventPickup> getComponentType() {
      return EntityModule.get().getPreventPickupComponentType();
   }

   private PreventPickup() {}

   @Nonnull
   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Prevent an item from being picked up
holder.addComponent(PreventPickup.getComponentType(), PreventPickup.INSTANCE);
// or
commandBuffer.addComponent(itemRef, PreventPickup.getComponentType(), PreventPickup.INSTANCE);

// Allow pickup again
commandBuffer.removeComponent(itemRef, PreventPickup.getComponentType());
```

**Usage notes:**
- Useful for decorative items, items during cutscenes, or owner-restricted items
- Different from `ItemComponent.pickupDelay` which is temporary - this is permanent until removed

---

### PhysicsValues

**Package:** `com.hypixel.hytale.server.core.modules.physics.component`

The `PhysicsValues` component stores the physical properties of an entity that affect how it responds to physics simulation. This includes mass, drag coefficient, and gravity direction.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/physics/component/PhysicsValues.java`

```java
public class PhysicsValues implements Component<EntityStore> {
   @Nonnull
   public static final BuilderCodec<PhysicsValues> CODEC = BuilderCodec.builder(PhysicsValues.class, PhysicsValues::new)
      .append(new KeyedCodec<>("Mass", Codec.DOUBLE), ...)
      .addValidator(Validators.greaterThan(ZERO))
      .append(new KeyedCodec<>("DragCoefficient", Codec.DOUBLE), ...)
      .addValidator(Validators.greaterThanOrEqual(ZERO))
      .append(new KeyedCodec<>("InvertedGravity", Codec.BOOLEAN), ...)
      .build();

   private static final double DEFAULT_MASS = 1.0;
   private static final double DEFAULT_DRAG_COEFFICIENT = 0.5;
   private static final boolean DEFAULT_INVERTED_GRAVITY = false;

   protected double mass;
   protected double dragCoefficient;
   protected boolean invertedGravity;

   @Nonnull
   public static ComponentType<EntityStore, PhysicsValues> getComponentType() {
      return EntityModule.get().getPhysicsValuesComponentType();
   }

   // Constructors
   public PhysicsValues();  // Uses defaults
   public PhysicsValues(@Nonnull PhysicsValues other);  // Copy constructor
   public PhysicsValues(double mass, double dragCoefficient, boolean invertedGravity);

   // Methods
   public void replaceValues(@Nonnull PhysicsValues other);
   public void resetToDefault();
   public void scale(float scale);
   public double getMass();
   public double getDragCoefficient();
   public boolean isInvertedGravity();
   @Nonnull public static PhysicsValues getDefault();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mass` | double | 1.0 | Mass of the entity (must be > 0) |
| `dragCoefficient` | double | 0.5 | Air resistance coefficient (must be >= 0) |
| `invertedGravity` | boolean | false | Whether gravity is inverted for this entity |

**How to use:**

```java
// Create entity with custom physics
PhysicsValues physics = new PhysicsValues(2.0, 0.3, false);  // Heavy, low drag
holder.addComponent(PhysicsValues.getComponentType(), physics);

// Create a floating entity (inverted gravity)
PhysicsValues floatingPhysics = new PhysicsValues(0.5, 0.8, true);
holder.addComponent(PhysicsValues.getComponentType(), floatingPhysics);

// Modify physics at runtime
PhysicsValues physics = store.getComponent(ref, PhysicsValues.getComponentType());
physics.scale(2.0f);  // Double mass and drag

// Reset to defaults
physics.resetToDefault();
```

**Usage notes:**
- Mass affects how forces (including gravity) accelerate the entity
- Higher drag coefficient means the entity slows down faster in air
- Inverted gravity makes the entity fall upward - useful for special effects
- Used automatically for dropped items via `ItemComponent.generateItemDrop()`

---

### PlayerSettings

**Package:** `com.hypixel.hytale.server.core.modules.entity.player`

The `PlayerSettings` component stores player preferences and settings, including item pickup locations and creative mode settings. It is implemented as a Java record for immutability.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/player/PlayerSettings.java`

```java
public record PlayerSettings(
   boolean showEntityMarkers,
   @Nonnull PickupLocation armorItemsPreferredPickupLocation,
   @Nonnull PickupLocation weaponAndToolItemsPreferredPickupLocation,
   @Nonnull PickupLocation usableItemsItemsPreferredPickupLocation,
   @Nonnull PickupLocation solidBlockItemsPreferredPickupLocation,
   @Nonnull PickupLocation miscItemsPreferredPickupLocation,
   PlayerCreativeSettings creativeSettings
) implements Component<EntityStore> {

   @Nonnull
   public static ComponentType<EntityStore, PlayerSettings> getComponentType() {
      return EntityModule.get().getPlayerSettingsComponentType();
   }

   @Nonnull
   public static PlayerSettings defaults() {
      return INSTANCE;  // Returns default instance
   }
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showEntityMarkers` | boolean | false | Whether to show debug entity markers |
| `armorItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Where armor items go when picked up |
| `weaponAndToolItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Where weapons/tools go when picked up |
| `usableItemsItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Where consumables go when picked up |
| `solidBlockItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Where blocks go when picked up |
| `miscItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Where misc items go when picked up |
| `creativeSettings` | `PlayerCreativeSettings` | - | Creative mode specific settings |

**PlayerCreativeSettings:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `allowNPCDetection` | boolean | false | Whether NPCs can detect/target the player |
| `respondToHit` | boolean | false | Whether the player responds to being hit |

**How to use:**

```java
// Get default settings
PlayerSettings settings = PlayerSettings.defaults();

// Create custom settings
PlayerSettings customSettings = new PlayerSettings(
    true,                       // showEntityMarkers
    PickupLocation.Inventory,   // armor -> inventory
    PickupLocation.Hotbar,      // weapons -> hotbar
    PickupLocation.Inventory,   // usables -> inventory
    PickupLocation.Inventory,   // blocks -> inventory
    PickupLocation.Inventory,   // misc -> inventory
    new PlayerCreativeSettings(true, false)  // creative settings
);
commandBuffer.addComponent(playerRef, PlayerSettings.getComponentType(), customSettings);
```

**Usage notes:**
- Settings are typically sent from the client and applied to the player entity
- PickupLocation determines where items are placed in the player's inventory
- Creative settings control gameplay behavior in creative mode

---

### ChunkTracker

**Package:** `com.hypixel.hytale.server.core.modules.entity.player`

The `ChunkTracker` component manages which chunks are loaded and visible to a player. It handles chunk loading/unloading, view radius, and chunk streaming rate limiting.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/player/ChunkTracker.java`

```java
public class ChunkTracker implements Component<EntityStore> {
   public static final int MAX_CHUNKS_PER_SECOND_LOCAL = 256;
   public static final int MAX_CHUNKS_PER_SECOND_LAN = 128;
   public static final int MAX_CHUNKS_PER_SECOND = 36;
   public static final int MAX_CHUNKS_PER_TICK = 4;
   public static final int MIN_LOADED_CHUNKS_RADIUS = 2;
   public static final int MAX_HOT_LOADED_CHUNKS_RADIUS = 8;

   private int chunkViewRadius;
   private int maxChunksPerSecond;
   private int maxChunksPerTick;
   private int minLoadedChunksRadius;
   private int maxHotLoadedChunksRadius;
   private int sentViewRadius;
   private int hotRadius;
   private int lastChunkX;
   private int lastChunkZ;
   private boolean readyForChunks;

   public static ComponentType<EntityStore, ChunkTracker> getComponentType() {
      return EntityModule.get().getChunkTrackerComponentType();
   }

   // Key methods
   public void tick(@Nonnull Ref<EntityStore> playerRef, float dt, @Nonnull CommandBuffer<EntityStore> commandBuffer);
   public void unloadAll(@Nonnull PlayerRef playerRefComponent);
   public void clear();
   public boolean isLoaded(long indexChunk);
   public boolean shouldBeVisible(long chunkCoordinates);
   public ChunkVisibility getChunkVisibility(long indexChunk);
   public void setReadyForChunks(boolean readyForChunks);
   public boolean isReadyForChunks();

   // Configuration
   public void setMaxChunksPerSecond(int maxChunksPerSecond);
   public void setDefaultMaxChunksPerSecond(@Nonnull PlayerRef playerRef);
   public void setMaxChunksPerTick(int maxChunksPerTick);
   public void setMinLoadedChunksRadius(int minLoadedChunksRadius);
   public void setMaxHotLoadedChunksRadius(int maxHotLoadedChunksRadius);

   // Stats
   public int getLoadedChunksCount();
   public int getLoadingChunksCount();

   public enum ChunkVisibility { NONE, HOT, COLD }
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `chunkViewRadius` | int | - | Player's view distance in chunks |
| `maxChunksPerSecond` | int | 36 (remote) | Maximum chunks to load per second |
| `maxChunksPerTick` | int | 4 | Maximum chunks to load per tick |
| `minLoadedChunksRadius` | int | 2 | Minimum radius of loaded chunks |
| `maxHotLoadedChunksRadius` | int | 8 | Maximum radius for "hot" (ticking) chunks |
| `sentViewRadius` | int | 0 | Current radius of sent chunks |
| `hotRadius` | int | 0 | Current radius of hot chunks |
| `readyForChunks` | boolean | false | Whether player is ready to receive chunks |

**ChunkVisibility enum:**

| Value | Description |
|-------|-------------|
| `NONE` | Chunk is not visible to the player |
| `HOT` | Chunk is visible and actively ticking |
| `COLD` | Chunk is visible but not ticking |

**How to use:**

```java
// Get chunk tracker for a player
ChunkTracker tracker = store.getComponent(playerRef, ChunkTracker.getComponentType());

// Check if a chunk is loaded for this player
long chunkIndex = ChunkUtil.indexChunk(chunkX, chunkZ);
if (tracker.isLoaded(chunkIndex)) {
    // Chunk is visible to player
}

// Configure chunk loading rate
tracker.setMaxChunksPerSecond(64);
tracker.setMaxChunksPerTick(8);

// Get chunk visibility
ChunkTracker.ChunkVisibility visibility = tracker.getChunkVisibility(chunkIndex);
if (visibility == ChunkTracker.ChunkVisibility.HOT) {
    // Chunk is actively ticking
}

// Clear all loaded chunks (for teleport/world change)
tracker.clear();
```

**Usage notes:**
- Chunk loading is rate-limited to prevent network congestion
- Local connections get 256 chunks/second, LAN gets 128, remote gets 36
- "Hot" chunks are actively ticking; "cold" chunks are visible but static
- The spiral iterator ensures chunks closest to the player load first

---

### ActiveAnimationComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `ActiveAnimationComponent` tracks which animations are currently playing on an entity across different animation slots. It enables network synchronization of animation states.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/ActiveAnimationComponent.java`

```java
public class ActiveAnimationComponent implements Component<EntityStore> {
   private final String[] activeAnimations = new String[AnimationSlot.VALUES.length];
   private boolean isNetworkOutdated = false;

   public static ComponentType<EntityStore, ActiveAnimationComponent> getComponentType() {
      return EntityModule.get().getActiveAnimationComponentType();
   }

   public ActiveAnimationComponent() {}
   public ActiveAnimationComponent(String[] activeAnimations);

   public String[] getActiveAnimations();
   public void setPlayingAnimation(AnimationSlot slot, @Nullable String animation);
   public boolean consumeNetworkOutdated();
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `activeAnimations` | `String[]` | Array of animation names indexed by AnimationSlot |
| `isNetworkOutdated` | boolean | Flag for network synchronization |

**How to use:**

```java
// Create entity with animation component
holder.addComponent(ActiveAnimationComponent.getComponentType(), new ActiveAnimationComponent());

// Set an animation on a specific slot
ActiveAnimationComponent anim = store.getComponent(ref, ActiveAnimationComponent.getComponentType());
anim.setPlayingAnimation(AnimationSlot.PRIMARY, "walk");
anim.setPlayingAnimation(AnimationSlot.SECONDARY, "wave");

// Clear an animation
anim.setPlayingAnimation(AnimationSlot.PRIMARY, null);

// Get all active animations
String[] animations = anim.getActiveAnimations();
```

**Usage notes:**
- Animation slots allow multiple animations to play simultaneously (e.g., walking + waving)
- Animation changes are automatically synced to clients when marked as outdated
- Null animation values indicate no animation playing on that slot

---

### MovementAudioComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `MovementAudioComponent` manages audio feedback for entity movement, including footstep sounds and movement-in-block sounds (like walking through water or grass).

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/MovementAudioComponent.java`

```java
public class MovementAudioComponent implements Component<EntityStore> {
   public static float NO_REPEAT = -1.0F;

   private final ShouldHearPredicate shouldHearPredicate = new ShouldHearPredicate();
   private int lastInsideBlockTypeId = 0;
   private float nextMoveInRepeat = NO_REPEAT;

   public static ComponentType<EntityStore, MovementAudioComponent> getComponentType() {
      return EntityModule.get().getMovementAudioComponentType();
   }

   @Nonnull
   public ShouldHearPredicate getShouldHearPredicate(Ref<EntityStore> ref);
   public int getLastInsideBlockTypeId();
   public void setLastInsideBlockTypeId(int lastInsideBlockTypeId);
   public boolean canMoveInRepeat();
   public boolean tickMoveInRepeat(float dt);
   public void setNextMoveInRepeat(float nextMoveInRepeat);

   public static class ShouldHearPredicate implements Predicate<Ref<EntityStore>> {
      // Filters out the owner from hearing their own sounds
   }
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `lastInsideBlockTypeId` | int | 0 | Block type ID the entity is currently inside |
| `nextMoveInRepeat` | float | -1.0 | Timer for repeating movement sounds |

**How to use:**

```java
// Add movement audio to an entity
holder.addComponent(MovementAudioComponent.getComponentType(), new MovementAudioComponent());

// Update the block the entity is inside
MovementAudioComponent audio = store.getComponent(ref, MovementAudioComponent.getComponentType());
audio.setLastInsideBlockTypeId(waterBlockTypeId);

// Set up repeating sound (e.g., splashing in water)
audio.setNextMoveInRepeat(0.5f);  // Repeat every 0.5 seconds

// Check if it's time to play the sound again
if (audio.canMoveInRepeat() && audio.tickMoveInRepeat(deltaTime)) {
    // Play the movement sound
    audio.setNextMoveInRepeat(0.5f);  // Reset timer
}
```

**Usage notes:**
- The `ShouldHearPredicate` prevents entities from hearing their own movement sounds
- Used for ambient sounds like walking through water, tall grass, etc.
- Set `nextMoveInRepeat` to `NO_REPEAT` (-1.0) to disable repeating sounds

---

### RespondToHit

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `RespondToHit` component is a marker component (tag) that indicates an entity should respond to being hit with visual/audio feedback. Uses the singleton pattern.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/RespondToHit.java`

```java
public class RespondToHit implements Component<EntityStore> {
   public static final RespondToHit INSTANCE = new RespondToHit();
   public static final BuilderCodec<RespondToHit> CODEC =
       BuilderCodec.builder(RespondToHit.class, () -> INSTANCE).build();

   public static ComponentType<EntityStore, RespondToHit> getComponentType() {
      return EntityModule.get().getRespondToHitComponentType();
   }

   private RespondToHit() {}

   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Make entity respond to hits (show damage feedback)
holder.addComponent(RespondToHit.getComponentType(), RespondToHit.INSTANCE);
// or
commandBuffer.addComponent(ref, RespondToHit.getComponentType(), RespondToHit.INSTANCE);

// Disable hit response
commandBuffer.removeComponent(ref, RespondToHit.getComponentType());

// Check if entity responds to hits
Archetype<EntityStore> archetype = store.getArchetype(ref);
boolean respondsToHit = archetype.contains(RespondToHit.getComponentType());
```

**Usage notes:**
- Used to enable hit feedback animations, sounds, and effects
- Related to `PlayerCreativeSettings.respondToHit` for player-specific settings
- Entities without this component may still take damage but won't show feedback

---

### RotateObjectComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `RotateObjectComponent` makes an entity continuously rotate around its Y-axis. This is useful for display items, decorative objects, or collectibles.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/RotateObjectComponent.java`

```java
public class RotateObjectComponent implements Component<EntityStore> {
   @Nonnull
   public static final BuilderCodec<RotateObjectComponent> CODEC =
       BuilderCodec.builder(RotateObjectComponent.class, RotateObjectComponent::new)
          .append(new KeyedCodec<>("RotationSpeed", Codec.FLOAT), ...)
          .build();

   private float rotationSpeed;

   @Nonnull
   public static ComponentType<EntityStore, RotateObjectComponent> getComponentType() {
      return EntityModule.get().getRotateObjectComponentType();
   }

   public RotateObjectComponent() {}
   public RotateObjectComponent(float rotationSpeed);

   public void setRotationSpeed(float rotationSpeed);
   public float getRotationSpeed();
}
```

**Properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `rotationSpeed` | float | 0.0 | Rotation speed in degrees per second |

**How to use:**

```java
// Create a slowly rotating display item
RotateObjectComponent rotate = new RotateObjectComponent(45.0f);  // 45 deg/sec
holder.addComponent(RotateObjectComponent.getComponentType(), rotate);

// Create a fast spinning collectible
holder.addComponent(RotateObjectComponent.getComponentType(),
    new RotateObjectComponent(180.0f));  // Half rotation per second

// Modify rotation speed at runtime
RotateObjectComponent rotate = store.getComponent(ref, RotateObjectComponent.getComponentType());
rotate.setRotationSpeed(90.0f);

// Stop rotation
rotate.setRotationSpeed(0.0f);
// or remove the component
commandBuffer.removeComponent(ref, RotateObjectComponent.getComponentType());
```

**Usage notes:**
- Positive values rotate counter-clockwise (viewed from above)
- Negative values rotate clockwise
- Commonly used for dropped items to make them more visible
- The actual rotation is applied by a system that updates `TransformComponent`

---

### FromPrefab

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `FromPrefab` component is a marker component (tag) that indicates an entity was spawned from a prefab definition. Uses the singleton pattern.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/FromPrefab.java`

```java
public class FromPrefab implements Component<EntityStore> {
   public static final FromPrefab INSTANCE = new FromPrefab();
   public static final BuilderCodec<FromPrefab> CODEC =
       BuilderCodec.builder(FromPrefab.class, () -> INSTANCE).build();

   public static ComponentType<EntityStore, FromPrefab> getComponentType() {
      return EntityModule.get().getFromPrefabComponentType();
   }

   private FromPrefab() {}

   @Override
   public Component<EntityStore> clone() {
      return INSTANCE;
   }
}
```

**Properties:**
- None (marker component)

**How to add/remove:**

```java
// Mark entity as spawned from prefab
holder.addComponent(FromPrefab.getComponentType(), FromPrefab.INSTANCE);

// Check if entity is from a prefab
Archetype<EntityStore> archetype = store.getArchetype(ref);
boolean isFromPrefab = archetype.contains(FromPrefab.getComponentType());
```

**Usage notes:**
- Used to distinguish between entities spawned from prefabs vs. dynamically created
- Helps with entity management and cleanup
- Prefab entities may have special serialization or respawn behavior

---

### FromWorldGen

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

The `FromWorldGen` component marks an entity as being generated by the world generation system. It stores the world generation ID to track which world gen system created it.

**Source file:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/FromWorldGen.java`

```java
public class FromWorldGen implements Component<EntityStore> {
   public static final BuilderCodec<FromWorldGen> CODEC =
       BuilderCodec.builder(FromWorldGen.class, FromWorldGen::new)
          .append(new KeyedCodec<>("WorldGenId", Codec.INTEGER), ...)
          .build();

   private int worldGenId;

   public static ComponentType<EntityStore, FromWorldGen> getComponentType() {
      return EntityModule.get().getFromWorldGenComponentType();
   }

   private FromWorldGen() {}
   public FromWorldGen(int worldGenId);

   public int getWorldGenId();
}
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `worldGenId` | int | ID of the world generation system that created this entity |

**How to use:**

```java
// Mark entity as generated by world gen
FromWorldGen worldGen = new FromWorldGen(generatorId);
holder.addComponent(FromWorldGen.getComponentType(), worldGen);

// Check if entity was generated
FromWorldGen worldGen = store.getComponent(ref, FromWorldGen.getComponentType());
if (worldGen != null) {
    int generatorId = worldGen.getWorldGenId();
    // Handle world-generated entity
}
```

**Usage notes:**
- Used for entities like naturally spawning creatures, structures, or decorations
- The `worldGenId` can be used to identify which generator created the entity
- Helps prevent re-generating entities that have already been spawned
- Related to `WorldGenId` component which tracks chunk-level generation state
