---
id: ecs
title: Systeme ECS (Entity Component System)
sidebar_label: ECS
sidebar_position: 6
description: Documentation complete du systeme ECS du serveur Hytale
---

# Entity Component System (ECS)

:::info Documentation v2 - Vérifiée
Cette documentation a été vérifiée par rapport au code source décompilé du serveur en utilisant une analyse multi-agent. Toutes les informations incluent des références aux fichiers sources.
:::

## Qu'est-ce qu'un ECS ?

Un **Entity Component System** est un pattern d'architecture logicielle couramment utilise dans le developpement de jeux. Il est fondamentalement different de la programmation orientee objet traditionnelle et offre des avantages significatifs en termes de performance et de flexibilite.

### Le probleme avec la POO traditionnelle

En programmation orientee objet traditionnelle, vous pourriez creer une hierarchie de classes comme ceci :

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

Cela semble logique, mais des problemes apparaissent rapidement :
- Que faire si un Player peut devenir un Vehicle (comme une monture) ?
- Que faire si un Item a besoin de points de vie et peut etre attaque ?
- Ajouter de nouveaux comportements necessite de modifier la hierarchie de classes

### La solution ECS

L'ECS decompose tout en trois concepts simples :

| Concept | Ce que c'est | Exemple |
|---------|--------------|---------|
| **Entity** | Juste un numero d'ID | Entite #42 |
| **Component** | Donnees pures attachees aux entites | `Position(x: 10, y: 5, z: 20)`, `Health(current: 80, max: 100)` |
| **System** | Logique qui traite les entites avec des composants specifiques | "A chaque tick, reduire la faim des entites avec le composant Hunger" |

**Pensez-y comme un tableur :**

| ID Entite | Position | Vie | Inventaire | IA | Joueur |
|-----------|----------|-----|------------|----|----|
| 1 | (10, 5, 20) | 100/100 | 64 items | - | Oui |
| 2 | (50, 10, 30) | 50/80 | - | Hostile | - |
| 3 | (0, 0, 0) | - | 10 items | - | - |

- Entite 1 est un Joueur avec position, vie et inventaire
- Entite 2 est un Ennemi avec position, vie et IA
- Entite 3 est un Coffre avec juste position et inventaire

### Pourquoi Hytale utilise l'ECS

1. **Performance** : Les entites avec les memes composants sont stockees ensemble en memoire (favorable au cache)
2. **Flexibilite** : Ajouter/supprimer des comportements a l'execution en ajoutant/supprimant des composants
3. **Parallelisation** : Les systemes peuvent s'executer sur differents coeurs CPU simultanement
4. **Modularite** : Les systemes sont independants et peuvent etre ajoutes/supprimes facilement

### Analogie du monde reel

Imaginez que vous organisez une fete et que vous suivez les invites :

- **Approche POO** : Creer differentes classes pour "Invite VIP", "Invite Regulier", "Staff", etc. Que faire pour un VIP qui est aussi Staff ?
- **Approche ECS** : Chaque personne (entite) a des tags/composants : "ABadgeVIP", "EstStaff", "BesoinParking", etc. Vous pouvez melanger librement.

---

## Implementation ECS d'Hytale

Cette documentation decrit le systeme ECS (Entity Component System) utilise par le serveur Hytale. Ce systeme est responsable de la gestion des entites, de leurs composants et des systemes qui les traitent.

## Architecture Generale

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
|  | ArchetypeChunk  |  | ArchetypeChunk  |  | ArchetypeChunk  |  (groupes entites)  |
|  | [Entity,Entity] |  | [Entity,Entity] |  | [Entity,Entity] |                     |
|  +-----------------+  +-----------------+  +-----------------+                     |
|                                                                                    |
|  +-----------------+  +-----------------+  +-----------------+                     |
|  |    Resource     |  |    Resource     |  |    Resource     |  (donnees globales) |
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

## Concepts Fondamentaux

### 1. Component

Un `Component` est une unite de donnees attachee a une entite. Il ne contient pas de logique, seulement des donnees.

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

**Exemple de composant simple:**

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

Le `ComponentType` est un identifiant unique pour un type de composant dans le registre.

```java
public class ComponentType<ECS_TYPE, T extends Component<ECS_TYPE>>
    implements Comparable<ComponentType<ECS_TYPE, ?>>, Query<ECS_TYPE> {

    private ComponentRegistry<ECS_TYPE> registry;
    private Class<? super T> tClass;
    private int index;  // Index unique dans le registre

    public int getIndex() { return this.index; }
    public Class<? super T> getTypeClass() { return this.tClass; }
}
```

### 3. Archetype

Un `Archetype` represente un ensemble unique de types de composants. Toutes les entites partageant le meme archetype sont stockees ensemble pour optimiser les performances.

```java
public class Archetype<ECS_TYPE> implements Query<ECS_TYPE> {
    private final int minIndex;
    private final int count;
    private final ComponentType<ECS_TYPE, ?>[] componentTypes;

    // Creer un archetype
    public static <ECS_TYPE> Archetype<ECS_TYPE> of(ComponentType<ECS_TYPE, ?>... componentTypes);

    // Ajouter un composant a l'archetype
    public static <ECS_TYPE, T extends Component<ECS_TYPE>> Archetype<ECS_TYPE> add(
        Archetype<ECS_TYPE> archetype, ComponentType<ECS_TYPE, T> componentType);

    // Supprimer un composant de l'archetype
    public static <ECS_TYPE, T extends Component<ECS_TYPE>> Archetype<ECS_TYPE> remove(
        Archetype<ECS_TYPE> archetype, ComponentType<ECS_TYPE, T> componentType);

    // Verifier si l'archetype contient un type de composant
    public boolean contains(ComponentType<ECS_TYPE, ?> componentType);
}
```

### 4. ArchetypeChunk

Un `ArchetypeChunk` stocke toutes les entites qui partagent le meme archetype. C'est une structure de donnees optimisee pour l'acces cache.

```java
public class ArchetypeChunk<ECS_TYPE> {
    protected final Store<ECS_TYPE> store;
    protected final Archetype<ECS_TYPE> archetype;
    protected int entitiesSize;
    protected Ref<ECS_TYPE>[] refs;           // References aux entites
    protected Component<ECS_TYPE>[][] components;  // Donnees des composants

    // Obtenir un composant pour une entite a un index donne
    public <T extends Component<ECS_TYPE>> T getComponent(
        int index, ComponentType<ECS_TYPE, T> componentType);

    // Definir un composant
    public <T extends Component<ECS_TYPE>> void setComponent(
        int index, ComponentType<ECS_TYPE, T> componentType, T component);

    // Ajouter une entite
    public int addEntity(Ref<ECS_TYPE> ref, Holder<ECS_TYPE> holder);

    // Supprimer une entite
    public Holder<ECS_TYPE> removeEntity(int entityIndex, Holder<ECS_TYPE> target);
}
```

### 5. Holder (EntityHolder)

Le `Holder` est un conteneur temporaire pour les composants d'une entite avant qu'elle ne soit ajoutee au Store.

```java
public class Holder<ECS_TYPE> {
    private Archetype<ECS_TYPE> archetype;
    private Component<ECS_TYPE>[] components;

    // Ajouter un composant
    public <T extends Component<ECS_TYPE>> void addComponent(
        ComponentType<ECS_TYPE, T> componentType, T component);

    // Obtenir un composant
    public <T extends Component<ECS_TYPE>> T getComponent(
        ComponentType<ECS_TYPE, T> componentType);

    // Supprimer un composant
    public <T extends Component<ECS_TYPE>> void removeComponent(
        ComponentType<ECS_TYPE, T> componentType);

    // S'assurer qu'un composant existe (le creer si absent)
    public <T extends Component<ECS_TYPE>> void ensureComponent(
        ComponentType<ECS_TYPE, T> componentType);
}
```

### 6. Ref (Entity Reference)

`Ref` est une reference a une entite dans le Store. Elle contient l'index de l'entite et peut etre invalidee.

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

Le `Store` est le conteneur principal qui gere toutes les entites et leurs composants.

```java
public class Store<ECS_TYPE> implements ComponentAccessor<ECS_TYPE> {
    private final ComponentRegistry<ECS_TYPE> registry;
    private final ECS_TYPE externalData;
    private Ref<ECS_TYPE>[] refs;
    private ArchetypeChunk<ECS_TYPE>[] archetypeChunks;
    private Resource<ECS_TYPE>[] resources;

    // Ajouter une entite
    public Ref<ECS_TYPE> addEntity(Holder<ECS_TYPE> holder, AddReason reason);

    // Supprimer une entite
    public void removeEntity(Ref<ECS_TYPE> ref, RemoveReason reason);

    // Obtenir un composant
    public <T extends Component<ECS_TYPE>> T getComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType);

    // Obtenir l'archetype d'une entite
    public Archetype<ECS_TYPE> getArchetype(Ref<ECS_TYPE> ref);

    // Obtenir une ressource globale
    public <T extends Resource<ECS_TYPE>> T getResource(ResourceType<ECS_TYPE, T> resourceType);
}
```

### 8. Resource

Une `Resource` est une donnee globale partagee par tout le Store (contrairement aux Components qui sont par entite).

```java
public interface Resource<ECS_TYPE> extends Cloneable {
    Resource<ECS_TYPE> clone();
}
```

---

## ComponentRegistry

Le `ComponentRegistry` est le registre central qui gere tous les types de composants, systemes et ressources.

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
|  Systems (tries par dependance):                                  |
|  +------------------+  +------------------+  +------------------+ |
|  | System[0]        |  | System[1]        |  | System[2]        | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
```

### Enregistrement des Composants

```java
// Composant sans serialisation
ComponentType<EntityStore, MyComponent> MY_COMPONENT =
    registry.registerComponent(MyComponent.class, MyComponent::new);

// Composant avec serialisation (Codec)
ComponentType<EntityStore, TransformComponent> TRANSFORM =
    registry.registerComponent(TransformComponent.class, "Transform", TransformComponent.CODEC);
```

### Enregistrement des Resources

```java
// Resource sans serialisation
ResourceType<EntityStore, MyResource> MY_RESOURCE =
    registry.registerResource(MyResource.class, MyResource::new);

// Resource avec serialisation
ResourceType<EntityStore, MyResource> MY_RESOURCE =
    registry.registerResource(MyResource.class, "MyResource", MyResource.CODEC);
```

### Composants Built-in Speciaux

```java
// Marque une entite comme ne devant pas etre tickee
ComponentType<ECS_TYPE, NonTicking<ECS_TYPE>> nonTickingComponentType;

// Marque une entite comme ne devant pas etre serialisee
ComponentType<ECS_TYPE, NonSerialized<ECS_TYPE>> nonSerializedComponentType;

// Stocke les composants inconnus lors de la deserialisation
ComponentType<ECS_TYPE, UnknownComponents<ECS_TYPE>> unknownComponentType;
```

---

## Creer un Composant Personnalise

### Etape 1: Definir la classe du composant

```java
public class HealthComponent implements Component<EntityStore> {

    // Codec pour la serialisation
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

    // Getters et setters
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

    // OBLIGATOIRE: Implementation de clone()
    @Override
    public Component<EntityStore> clone() {
        return new HealthComponent(this.maxHealth, this.currentHealth);
    }
}
```

### Etape 2: Enregistrer le composant

```java
// Dans votre module ou systeme d'initialisation
public class MyModule {
    private static ComponentType<EntityStore, HealthComponent> HEALTH_COMPONENT_TYPE;

    public static void init(ComponentRegistry<EntityStore> registry) {
        // Enregistrement avec serialisation
        HEALTH_COMPONENT_TYPE = registry.registerComponent(
            HealthComponent.class,
            "Health",           // ID unique pour la serialisation
            HealthComponent.CODEC
        );
    }

    public static ComponentType<EntityStore, HealthComponent> getHealthComponentType() {
        return HEALTH_COMPONENT_TYPE;
    }
}
```

### Etape 3: Utiliser le composant

```java
// Creer une entite avec le composant
Holder<EntityStore> holder = registry.newHolder();
holder.addComponent(MyModule.getHealthComponentType(), new HealthComponent(100, 100));
Ref<EntityStore> entityRef = store.addEntity(holder, AddReason.SPAWN);

// Acceder au composant
HealthComponent health = store.getComponent(entityRef, MyModule.getHealthComponentType());
health.damage(25);

// Verifier si l'entite a le composant
Archetype<EntityStore> archetype = store.getArchetype(entityRef);
if (archetype.contains(MyModule.getHealthComponentType())) {
    // L'entite a un composant Health
}
```

---

## Systeme de Queries

Les Queries permettent de filtrer les entites en fonction de leurs composants.

### Interface Query

```java
public interface Query<ECS_TYPE> {
    // Teste si un archetype correspond a la query
    boolean test(Archetype<ECS_TYPE> archetype);

    // Verifie si la query depend d'un type de composant specifique
    boolean requiresComponentType(ComponentType<ECS_TYPE, ?> componentType);

    // Methodes de creation (factory methods)
    static <ECS_TYPE> AnyQuery<ECS_TYPE> any();           // Correspond a tout
    static <ECS_TYPE> NotQuery<ECS_TYPE> not(Query<ECS_TYPE> query);  // Negation
    static <ECS_TYPE> AndQuery<ECS_TYPE> and(Query<ECS_TYPE>... queries);  // ET logique
    static <ECS_TYPE> OrQuery<ECS_TYPE> or(Query<ECS_TYPE>... queries);   // OU logique
}
```

### Types de Queries

```
Query (interface)
  |
  +-- Archetype (un archetype est aussi une query)
  |
  +-- ComponentType (un ComponentType est aussi une query)
  |
  +-- AnyQuery (correspond a tout)
  |
  +-- NotQuery (negation)
  |
  +-- AndQuery (ET logique)
  |
  +-- OrQuery (OU logique)
  |
  +-- ExactArchetypeQuery (archetype exact)
  |
  +-- ReadWriteArchetypeQuery (interface)
       |
       +-- ReadWriteQuery (implementation)
```

### ReadWriteQuery

La `ReadWriteQuery` distingue les composants en lecture seule des composants modifies.

```java
public class ReadWriteQuery<ECS_TYPE> implements ReadWriteArchetypeQuery<ECS_TYPE> {
    private final Archetype<ECS_TYPE> read;   // Composants lus
    private final Archetype<ECS_TYPE> write;  // Composants modifies

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

### Exemples d'utilisation

```java
// Query simple: toutes les entites avec TransformComponent
Query<EntityStore> hasTransform = TransformComponent.getComponentType();

// Query combinee: entites avec Transform ET Health
Query<EntityStore> query = Query.and(
    TransformComponent.getComponentType(),
    MyModule.getHealthComponentType()
);

// Query avec negation: entites avec Transform mais SANS Health
Query<EntityStore> query = Query.and(
    TransformComponent.getComponentType(),
    Query.not(MyModule.getHealthComponentType())
);

// Archetype comme query
Archetype<EntityStore> archetype = Archetype.of(
    TransformComponent.getComponentType(),
    BoundingBox.getComponentType()
);
// Teste si une entite a AU MOINS ces composants

// ReadWriteQuery pour un systeme qui lit Transform et modifie Health
ReadWriteQuery<EntityStore> query = new ReadWriteQuery<>(
    Archetype.of(TransformComponent.getComponentType()),  // Lecture
    Archetype.of(MyModule.getHealthComponentType())       // Ecriture
);
```

---

## Systems et SystemGroups

### Hierarchie des Systems

```
ISystem (interface)
  |
  +-- System (classe de base abstraite)
       |
       +-- QuerySystem (interface) - systemes qui filtrent par archetype
       |    |
       |    +-- RefSystem - callback sur ajout/suppression d'entites
       |    |
       |    +-- HolderSystem - callback sur holder avant ajout
       |    |
       |    +-- TickingSystem
       |         |
       |         +-- ArchetypeTickingSystem
       |              |
       |              +-- EntityTickingSystem
       |
       +-- EventSystem
            |
            +-- EntityEventSystem - evenements sur entites
            |
            +-- WorldEventSystem - evenements globaux
```

### ISystem

Interface de base pour tous les systemes.

```java
public interface ISystem<ECS_TYPE> {
    // Callbacks de cycle de vie
    default void onSystemRegistered() {}
    default void onSystemUnregistered() {}

    // Groupe auquel appartient ce systeme
    default SystemGroup<ECS_TYPE> getGroup() { return null; }

    // Dependances pour l'ordre d'execution
    default Set<Dependency<ECS_TYPE>> getDependencies() {
        return Collections.emptySet();
    }
}
```

### System (classe de base)

```java
public abstract class System<ECS_TYPE> implements ISystem<ECS_TYPE> {

    // Enregistrer un composant lie a ce systeme
    protected <T extends Component<ECS_TYPE>> ComponentType<ECS_TYPE, T> registerComponent(
        Class<? super T> tClass, Supplier<T> supplier);

    protected <T extends Component<ECS_TYPE>> ComponentType<ECS_TYPE, T> registerComponent(
        Class<? super T> tClass, String id, BuilderCodec<T> codec);

    // Enregistrer une resource liee a ce systeme
    public <T extends Resource<ECS_TYPE>> ResourceType<ECS_TYPE, T> registerResource(
        Class<? super T> tClass, Supplier<T> supplier);
}
```

### TickingSystem

Systeme execute a chaque tick.

```java
public abstract class TickingSystem<ECS_TYPE> extends System<ECS_TYPE>
    implements TickableSystem<ECS_TYPE> {

    // dt = delta time (temps ecoule), systemIndex = index du systeme
    public abstract void tick(float dt, int systemIndex, Store<ECS_TYPE> store);
}
```

### ArchetypeTickingSystem

Systeme tick qui filtre par archetype.

```java
public abstract class ArchetypeTickingSystem<ECS_TYPE> extends TickingSystem<ECS_TYPE>
    implements QuerySystem<ECS_TYPE> {

    // Query pour filtrer les entites
    public abstract Query<ECS_TYPE> getQuery();

    // Tick sur chaque ArchetypeChunk correspondant
    public abstract void tick(
        float dt,
        ArchetypeChunk<ECS_TYPE> archetypeChunk,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );
}
```

### EntityTickingSystem

Systeme tick qui itere sur chaque entite.

```java
public abstract class EntityTickingSystem<ECS_TYPE> extends ArchetypeTickingSystem<ECS_TYPE> {

    // Tick sur une entite specifique
    public abstract void tick(
        float dt,
        int index,                         // Index dans l'ArchetypeChunk
        ArchetypeChunk<ECS_TYPE> archetypeChunk,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );

    // Support du parallelisme
    public boolean isParallel(int archetypeChunkSize, int taskCount) {
        return false;
    }
}
```

### RefSystem

Systeme qui reagit a l'ajout/suppression d'entites.

```java
public abstract class RefSystem<ECS_TYPE> extends System<ECS_TYPE>
    implements QuerySystem<ECS_TYPE> {

    // Query pour filtrer les entites concernees
    public abstract Query<ECS_TYPE> getQuery();

    // Appele quand une entite correspondant a la query est ajoutee
    public abstract void onEntityAdded(
        Ref<ECS_TYPE> ref,
        AddReason reason,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );

    // Appele quand une entite correspondant a la query est supprimee
    public abstract void onEntityRemove(
        Ref<ECS_TYPE> ref,
        RemoveReason reason,
        Store<ECS_TYPE> store,
        CommandBuffer<ECS_TYPE> commandBuffer
    );
}
```

### SystemGroup

Groupe de systemes pour organiser l'ordre d'execution.

```java
public class SystemGroup<ECS_TYPE> {
    private final ComponentRegistry<ECS_TYPE> registry;
    private final int index;
    private final Set<Dependency<ECS_TYPE>> dependencies;
}
```

### Dependencies (Ordre d'execution)

```java
public enum Order {
    BEFORE,  // Execute avant la dependance
    AFTER    // Execute apres la dependance
}

public abstract class Dependency<ECS_TYPE> {
    protected final Order order;
    protected final int priority;

    public Dependency(Order order, int priority);
    public Dependency(Order order, OrderPriority priority);
}

// Types de dependances
// - SystemDependency: dependance sur un systeme specifique
// - SystemTypeDependency: dependance sur un type de systeme
// - SystemGroupDependency: dependance sur un groupe de systemes
// - RootDependency: dependance racine
```

---

## Exemple Complet: Creer un System

```java
public class HealthRegenSystem extends EntityTickingSystem<EntityStore> {

    private static ComponentType<EntityStore, HealthComponent> HEALTH;

    // Query: entites avec Health
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
        // Executer apres le systeme de dommages
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
        // Obtenir le composant Health pour cette entite
        HealthComponent health = chunk.getComponent(index, HEALTH);

        // Regenerer 1 HP par seconde
        if (!health.isDead()) {
            health.heal(dt * 1.0f);
        }
    }
}
```

---

## Entites: Entity, LivingEntity, Player

### Hierarchie des Entites

```
Component<EntityStore> (interface)
  |
  +-- Entity (abstraite)
       |
       +-- LivingEntity (abstraite)
       |    |
       |    +-- Player
       |    |
       |    +-- (autres entites vivantes)
       |
       +-- BlockEntity
       |
       +-- (autres types d'entites)
```

### Entity

Classe de base pour toutes les entites du jeu.

```java
public abstract class Entity implements Component<EntityStore> {
    protected int networkId = -1;
    protected World world;
    protected Ref<EntityStore> reference;
    protected final AtomicBoolean wasRemoved = new AtomicBoolean();

    // Codec pour la serialisation
    public static final BuilderCodec<Entity> CODEC =
        BuilderCodec.abstractBuilder(Entity.class)
            .legacyVersioned()
            .codecVersion(5)
            .append(DISPLAY_NAME, ...)
            .append(UUID, ...)
            .build();

    // Supprimer l'entite du monde
    public boolean remove();

    // Charger l'entite dans un monde
    public void loadIntoWorld(World world);

    // Reference a l'entite dans l'ECS
    public Ref<EntityStore> getReference();

    // Convertir en Holder pour serialisation/copie
    public Holder<EntityStore> toHolder();
}
```

### LivingEntity

Entite avec un inventaire et des statistiques.

```java
public abstract class LivingEntity extends Entity {
    private final StatModifiersManager statModifiersManager = new StatModifiersManager();
    private Inventory inventory;
    protected double currentFallDistance;

    public static final BuilderCodec<LivingEntity> CODEC =
        BuilderCodec.abstractBuilder(LivingEntity.class, Entity.CODEC)
            .append(new KeyedCodec<>("Inventory", Inventory.CODEC), ...)
            .build();

    // Creer l'inventaire par defaut
    protected abstract Inventory createDefaultInventory();

    // Gestion de l'inventaire
    public Inventory getInventory();
    public Inventory setInventory(Inventory inventory);

    // Gestion des degats de chute
    public double getCurrentFallDistance();

    // Modificateurs de statistiques
    public StatModifiersManager getStatModifiersManager();
}
```

### Player

Le joueur connecte.

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

    // ComponentType pour identifier les joueurs
    public static ComponentType<EntityStore, Player> getComponentType() {
        return EntityModule.get().getPlayerComponentType();
    }

    // Initialisation du joueur
    public void init(UUID uuid, PlayerRef playerRef);

    // Gestion du GameMode
    public GameMode getGameMode();
    public void setGameMode(GameMode gameMode);

    // Gestionnaires d'interface utilisateur
    public WindowManager getWindowManager();
    public PageManager getPageManager();
    public HudManager getHudManager();
}
```

---

## Composants Built-in Importants

### TransformComponent

Position et rotation de l'entite.

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

Boite de collision de l'entite.

```java
public class BoundingBox implements Component<EntityStore> {
    private final Box boundingBox = new Box();

    public static ComponentType<EntityStore, BoundingBox> getComponentType();

    public Box getBoundingBox();
    public void setBoundingBox(Box boundingBox);
}
```

### UUIDComponent

Identifiant unique persistant de l'entite.

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

Marque une entite pour qu'elle ne soit pas traitee par les TickingSystems.

```java
public class NonTicking<ECS_TYPE> implements Component<ECS_TYPE> {
    private static final NonTicking<?> INSTANCE = new NonTicking();

    public static <ECS_TYPE> NonTicking<ECS_TYPE> get();
}

// Utilisation: ajouter ce composant pour desactiver le tick
holder.addComponent(registry.getNonTickingComponentType(), NonTicking.get());
```

### NonSerialized

Marque une entite pour qu'elle ne soit pas sauvegardee.

```java
public class NonSerialized<ECS_TYPE> implements Component<ECS_TYPE> {
    private static final NonSerialized<?> INSTANCE = new NonSerialized();

    public static <ECS_TYPE> NonSerialized<ECS_TYPE> get();
}

// Utilisation: ajouter ce composant pour empecher la sauvegarde
holder.addComponent(registry.getNonSerializedComponentType(), NonSerialized.get());
```

### Autres Composants Importants

| Composant | Description |
|-----------|-------------|
| `Velocity` | Vitesse de l'entite |
| `CollisionResultComponent` | Resultat des collisions |
| `ModelComponent` | Modele 3D de l'entite |
| `DisplayNameComponent` | Nom affiche |
| `MovementStatesComponent` | Etats de mouvement (au sol, en vol, etc.) |
| `KnockbackComponent` | Recul apres un coup |
| `DamageDataComponent` | Donnees de dommages recus |
| `ProjectileComponent` | Composant pour les projectiles |
| `EffectControllerComponent` | Effets actifs sur l'entite |

---

## CommandBuffer

Le `CommandBuffer` permet de modifier le Store de maniere differee (thread-safe).

```java
public class CommandBuffer<ECS_TYPE> implements ComponentAccessor<ECS_TYPE> {
    private final Store<ECS_TYPE> store;
    private final Deque<Consumer<Store<ECS_TYPE>>> queue;

    // Ajouter une action a executer plus tard
    public void run(Consumer<Store<ECS_TYPE>> consumer);

    // Ajouter une entite
    public Ref<ECS_TYPE> addEntity(Holder<ECS_TYPE> holder, AddReason reason);

    // Supprimer une entite
    public void removeEntity(Ref<ECS_TYPE> ref, RemoveReason reason);

    // Lire un composant (acces immediat)
    public <T extends Component<ECS_TYPE>> T getComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType);

    // Ajouter un composant a une entite
    public <T extends Component<ECS_TYPE>> void addComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType, T component);

    // Supprimer un composant d'une entite
    public <T extends Component<ECS_TYPE>> void removeComponent(
        Ref<ECS_TYPE> ref, ComponentType<ECS_TYPE, T> componentType);

    // Dispatcher un evenement
    public <T extends EcsEvent> void dispatchEntityEvent(
        EntityEventType<ECS_TYPE, T> eventType, Ref<ECS_TYPE> ref, T event);

    public <T extends EcsEvent> void dispatchWorldEvent(
        WorldEventType<ECS_TYPE, T> eventType, T event);
}
```

---

## AddReason et RemoveReason

Enumerations indiquant pourquoi une entite est ajoutee ou supprimee.

```java
public enum AddReason {
    SPAWN,  // Nouvelle entite creee
    LOAD    // Entite chargee depuis la sauvegarde
}

public enum RemoveReason {
    REMOVE,  // Entite supprimee definitivement
    UNLOAD   // Entite dechargee (sauvegardee)
}
```

---

## Flux de Donnees

```
1. CREATION D'ENTITE
   +---------------+     +---------+     +--------+     +--------------+
   | Creer Holder  | --> | Ajouter | --> | Store  | --> | RefSystems   |
   | avec Components|     | au Store|     | assigne|     | onEntityAdded|
   +---------------+     +---------+     | Ref    |     +--------------+
                                          +--------+

2. TICK
   +--------+     +-----------------+     +------------------+
   | Store  | --> | Pour chaque     | --> | Pour chaque      |
   | .tick()|     | System (trie)   |     | ArchetypeChunk   |
   +--------+     +-----------------+     | correspondant    |
                                          +------------------+
                                                   |
                                                   v
                                          +------------------+
                                          | System.tick()    |
                                          | (avec buffer)    |
                                          +------------------+

3. MODIFICATION D'ARCHETYPE (ajout/suppression de composant)
   +-------------+     +------------------+     +------------------+
   | CommandBuffer| --> | Retirer de       | --> | Ajouter au nouvel|
   | .addComponent|     | l'ancien Chunk   |     | ArchetypeChunk   |
   +-------------+     +------------------+     +------------------+

4. SUPPRESSION D'ENTITE
   +-------------+     +--------------+     +------------------+
   | CommandBuffer| --> | RefSystems   | --> | Retirer de       |
   | .removeEntity|     | onEntityRemove|     | l'ArchetypeChunk |
   +-------------+     +--------------+     +------------------+
```

---

## Bonnes Pratiques

1. **Composants simples**: Gardez les composants comme de simples conteneurs de donnees sans logique complexe.

2. **Un System par responsabilite**: Chaque System devrait avoir une seule responsabilite claire.

3. **Utilisez le CommandBuffer**: Ne modifiez jamais directement le Store pendant un tick. Utilisez toujours le CommandBuffer.

4. **Queries efficaces**: Utilisez des Archetypes plutot que des queries complexes quand c'est possible.

5. **NonTicking pour les entites statiques**: Ajoutez `NonTicking` aux entites qui n'ont pas besoin d'etre mises a jour.

6. **NonSerialized pour les entites temporaires**: Ajoutez `NonSerialized` aux entites qui ne doivent pas etre sauvegardees.

7. **Dependances explicites**: Declarez toujours les dependances entre systemes pour garantir l'ordre d'execution correct.

8. **Clone() obligatoire**: Implementez toujours correctement `clone()` pour les composants qui doivent etre copies.

---

## Reference des Composants Built-in Additionnels

Les sections suivantes documentent des composants ECS additionnels trouves dans le code source decompile du serveur. Ces composants fournissent des fonctionnalites essentielles pour le comportement des entites, le reseau et le rendu.

### Invulnerable

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `Invulnerable` est un composant marqueur (tag) qui rend une entite immune aux degats. Il utilise le pattern singleton - il n'y a qu'une seule instance partagee par toutes les entites invulnerables.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/Invulnerable.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Rendre une entite invulnerable
commandBuffer.addComponent(ref, Invulnerable.getComponentType(), Invulnerable.INSTANCE);

// Supprimer l'invulnerabilite
commandBuffer.removeComponent(ref, Invulnerable.getComponentType());

// Verifier si l'entite est invulnerable
Archetype<EntityStore> archetype = store.getArchetype(ref);
boolean isInvulnerable = archetype.contains(Invulnerable.getComponentType());
```

**Notes d'utilisation:**
- Le composant est automatiquement synchronise aux clients via `InvulnerableSystems.EntityTrackerUpdate`
- Lors de l'ajout, il met en file d'attente un `ComponentUpdate` de type `ComponentUpdateType.Invulnerable` pour tous les observateurs
- Lors de la suppression, il envoie une notification de suppression a tous les clients observant

---

### Intangible

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `Intangible` est un composant marqueur qui rend une entite non-collisionnable. Les autres entites et projectiles passeront a travers les entites intangibles. Comme `Invulnerable`, il utilise le pattern singleton.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/Intangible.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Rendre une entite intangible (non-collisionnable)
holder.ensureComponent(Intangible.getComponentType());
// ou
commandBuffer.addComponent(ref, Intangible.getComponentType(), Intangible.INSTANCE);

// Supprimer l'intangibilite
commandBuffer.removeComponent(ref, Intangible.getComponentType());
```

**Notes d'utilisation:**
- Couramment utilise pour les entites d'objets tombes pour eviter les collisions avec d'autres objets
- Synchronise aux clients via `IntangibleSystems.EntityTrackerUpdate`
- Utilise dans `ItemComponent.generateItemDrop()` pour rendre les objets tombes intangibles

---

### Interactable

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `Interactable` marque une entite comme interactible par les joueurs. Cela permet aux evenements d'interaction (comme les actions de clic droit) d'etre traites pour l'entite.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/Interactable.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Rendre une entite interactible
holder.addComponent(Interactable.getComponentType(), Interactable.INSTANCE);

// Supprimer l'interactivite
commandBuffer.removeComponent(ref, Interactable.getComponentType());
```

**Notes d'utilisation:**
- Utilise pour les PNJ, conteneurs et autres entites avec lesquelles les joueurs peuvent interagir
- La logique d'interaction est geree par des systemes separes qui interrogent ce composant

---

### ItemComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

Le composant `ItemComponent` represente un objet tombe dans le monde. Il contient les donnees de la pile d'objets, les delais de ramassage, les delais de fusion et fournit des utilitaires pour creer des objets tombes et gerer le ramassage.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/ItemComponent.java`

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

   // ... methodes
}
```

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `itemStack` | `ItemStack` | null | La pile d'objets que cette entite represente |
| `mergeDelay` | float | 1.5 | Delai avant que les objets puissent fusionner (secondes) |
| `pickupDelay` | float | 0.5 | Delai avant que l'objet puisse etre ramasse (secondes) |
| `pickupThrottle` | float | 0.25 | Temps de recharge entre les tentatives de ramassage |
| `removedByPlayerPickup` | boolean | false | Si l'objet a ete supprime par ramassage joueur |
| `pickupRange` | float | -1.0 | Portee de ramassage (-1 = utiliser la valeur par defaut) |

**Comment creer des objets tombes:**

```java
// Creer un seul objet tombe
Holder<EntityStore> itemHolder = ItemComponent.generateItemDrop(
    accessor,           // ComponentAccessor
    itemStack,          // ItemStack a faire tomber
    position,           // Position Vector3d
    rotation,           // Rotation Vector3f
    velocityX,          // Velocite horizontale float
    velocityY,          // Velocite verticale float (3.25F par defaut)
    velocityZ           // Velocite horizontale float
);
store.addEntity(itemHolder, AddReason.SPAWN);

// Creer plusieurs objets tombes depuis une liste
Holder<EntityStore>[] items = ItemComponent.generateItemDrops(
    accessor, itemStacks, position, rotation
);

// Ajouter un objet a un conteneur (gere le ramassage partiel)
ItemStack pickedUp = ItemComponent.addToItemContainer(store, itemRef, itemContainer);
```

**Notes d'utilisation:**
- Assigne automatiquement `Intangible`, `Velocity`, `PhysicsValues`, `UUIDComponent` et `DespawnComponent`
- La duree de vie de l'objet est de 120 secondes par defaut (configurable via `ItemEntityConfig`)
- Peut emettre de la lumiere dynamique si l'objet/bloc a une propriete de lumiere

---

### PlayerInput

**Package:** `com.hypixel.hytale.server.core.modules.entity.player`

Le composant `PlayerInput` gere les mises a jour d'entree du joueur incluant le mouvement, la rotation et le controle de monture. Il met en file d'attente les mises a jour d'entree qui sont traitees par les systemes joueur.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/player/PlayerInput.java`

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

**Proprietes:**

| Propriete | Type | Description |
|-----------|------|-------------|
| `inputUpdateQueue` | `List<InputUpdate>` | File d'attente des mises a jour d'entree en attente |
| `mountId` | int | ID reseau de l'entite monture (0 = non monte) |

**Types de mise a jour d'entree:**

| Type | Description |
|------|-------------|
| `AbsoluteMovement` | Teleporter a une position absolue (x, y, z) |
| `RelativeMovement` | Se deplacer relativement a la position actuelle |
| `WishMovement` | Direction de deplacement souhaitee |
| `SetBody` | Definir la rotation du corps (pitch, yaw, roll) |
| `SetHead` | Definir la rotation de la tete (pitch, yaw, roll) |
| `SetMovementStates` | Definir les drapeaux d'etat de mouvement |
| `SetClientVelocity` | Definir la velocite depuis le client |
| `SetRiderMovementStates` | Definir les etats de mouvement en montant |

**Comment utiliser:**

```java
// Mettre en file d'attente un mouvement absolu
PlayerInput input = store.getComponent(playerRef, PlayerInput.getComponentType());
input.queue(new PlayerInput.AbsoluteMovement(x, y, z));

// Mettre en file d'attente un changement de rotation de tete
input.queue(new PlayerInput.SetHead(new Direction(pitch, yaw, roll)));
```

---

### NetworkId

**Package:** `com.hypixel.hytale.server.core.modules.entity.tracker`

Le composant `NetworkId` assigne un identifiant reseau unique a une entite pour la synchronisation client-serveur. Cet ID est utilise dans les paquets reseau pour referencer les entites.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/tracker/NetworkId.java`

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
      return this;  // Immuable - retourne la meme instance
   }
}
```

**Proprietes:**

| Propriete | Type | Description |
|-----------|------|-------------|
| `id` | int | Identifiant reseau unique pour l'entite |

**Comment ajouter:**

```java
// Obtenir le prochain ID reseau du monde et l'assigner a l'entite
int networkId = world.getExternalData().takeNextNetworkId();
holder.addComponent(NetworkId.getComponentType(), new NetworkId(networkId));

// Ou pendant la generation d'entite
holder.addComponent(NetworkId.getComponentType(),
    new NetworkId(ref.getStore().getExternalData().takeNextNetworkId()));
```

**Notes d'utilisation:**
- Les ID reseau sont assignes automatiquement par le systeme de suivi d'entites pour les entites suivies
- Le composant est immuable - `clone()` retourne la meme instance
- Utilise extensivement dans la serialisation de paquets pour les references d'entites

---

### Frozen

**Package:** `com.hypixel.hytale.server.core.entity`

Le composant `Frozen` est un composant marqueur qui empeche une entite de se deplacer ou d'etre affectee par la physique. Utilise le pattern singleton.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/entity/Frozen.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Geler une entite
commandBuffer.addComponent(ref, Frozen.getComponentType(), Frozen.get());

// Degeler une entite
commandBuffer.removeComponent(ref, Frozen.getComponentType());
```

**Notes d'utilisation:**
- Utile pour les cinematiques, dialogues ou pour mettre des entites en pause
- Ne rend pas l'entite invulnerable - combiner avec `Invulnerable` si necessaire

---

### Teleport

**Package:** `com.hypixel.hytale.server.core.modules.entity.teleport`

Le composant `Teleport` est utilise pour teleporter une entite vers une nouvelle position, rotation et optionnellement un monde different. C'est un composant transitoire qui est automatiquement supprime apres le traitement de la teleportation.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/teleport/Teleport.java`

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

   // Constructeurs
   public Teleport(@Nullable World world, @Nonnull Vector3d position, @Nonnull Vector3f rotation);
   public Teleport(@Nonnull Vector3d position, @Nonnull Vector3f rotation);
   public Teleport(@Nullable World world, @Nonnull Transform transform);
   public Teleport(@Nonnull Transform transform);

   // Modificateurs fluents
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

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `world` | `World` | null | Monde cible (null = meme monde) |
| `position` | `Vector3d` | - | Position cible |
| `rotation` | `Vector3f` | - | Rotation du corps cible |
| `headRotation` | `Vector3f` | null | Rotation de la tete cible (optionnel) |
| `resetVelocity` | boolean | true | Si la velocite doit etre reinitialise apres la teleportation |

**Comment teleporter une entite:**

```java
// Teleporter a une position dans le meme monde
commandBuffer.addComponent(ref, Teleport.getComponentType(),
    new Teleport(new Vector3d(100, 64, 200), new Vector3f(0, 90, 0)));

// Teleporter vers un monde different
commandBuffer.addComponent(ref, Teleport.getComponentType(),
    new Teleport(targetWorld, position, rotation));

// Teleporter avec rotation de tete et sans reinitialiser la velocite
Teleport teleport = new Teleport(position, rotation)
    .withHeadRotation(headRotation)
    .withoutVelocityReset();
commandBuffer.addComponent(ref, Teleport.getComponentType(), teleport);
```

**Notes d'utilisation:**
- Le composant `Teleport` est traite par `TeleportSystems.MoveSystem` (pour les entites) ou `TeleportSystems.PlayerMoveSystem` (pour les joueurs)
- Pour les joueurs, la teleportation envoie un paquet `ClientTeleport` et attend un accusé de reception
- Le composant est automatiquement supprime apres le traitement
- La teleportation inter-monde deplace l'entite entre les stores

---

### EntityScaleComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `EntityScaleComponent` controle l'echelle visuelle d'une entite. Cela affecte la taille rendue du modele de l'entite sur les clients.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/EntityScaleComponent.java`

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

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `scale` | float | 1.0 | Multiplicateur d'echelle (1.0 = taille normale) |
| `isNetworkOutdated` | boolean | true | Drapeau interne pour la synchronisation reseau |

**Comment utiliser:**

```java
// Creer une entite avec une echelle personnalisee
holder.addComponent(EntityScaleComponent.getComponentType(),
    new EntityScaleComponent(2.0f));  // Double taille

// Modifier l'echelle a l'execution
EntityScaleComponent scaleComponent = store.getComponent(ref,
    EntityScaleComponent.getComponentType());
scaleComponent.setScale(0.5f);  // Demi taille
```

**Notes d'utilisation:**
- Les changements d'echelle sont automatiquement synchronises aux clients
- N'affecte que le rendu visuel, pas la collision/hitbox
- Une echelle de 0 ou negative peut causer un comportement indefini

---

### HitboxCollision

**Package:** `com.hypixel.hytale.server.core.modules.entity.hitboxcollision`

Le composant `HitboxCollision` definit comment la hitbox d'une entite interagit avec d'autres entites. Il reference un asset `HitboxCollisionConfig` qui definit le comportement de collision.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/hitboxcollision/HitboxCollision.java`

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

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `hitboxCollisionConfigIndex` | int | - | Index dans la map d'assets `HitboxCollisionConfig` |
| `isNetworkOutdated` | boolean | true | Drapeau interne pour la synchronisation reseau |

**Proprietes de HitboxCollisionConfig:**

| Propriete | Type | Description |
|-----------|------|-------------|
| `CollisionType` | `CollisionType` | `Hard` (bloque le mouvement) ou `Soft` (ralentit) |
| `SoftCollisionOffsetRatio` | float | Ratio de mouvement lors du passage a travers une collision douce |

**Comment utiliser:**

```java
// Obtenir une config de collision hitbox depuis les assets
HitboxCollisionConfig config = HitboxCollisionConfig.getAssetMap().getAsset("mymod:soft_hitbox");

// Ajouter une collision hitbox a une entite
holder.addComponent(HitboxCollision.getComponentType(), new HitboxCollision(config));

// Modifier la collision hitbox a l'execution
HitboxCollision hitbox = store.getComponent(ref, HitboxCollision.getComponentType());
hitbox.setHitboxCollisionConfigIndex(newConfigIndex);
```

**Notes d'utilisation:**
- Utilise pour la collision entite-a-entite (pas la collision avec les blocs)
- Le type de collision `Hard` bloque completement le mouvement
- Le type de collision `Soft` permet de passer a travers avec une vitesse reduite

---

### Nameplate

**Package:** `com.hypixel.hytale.server.core.entity.nameplate`

Le composant `Nameplate` affiche une etiquette de texte flottante au-dessus d'une entite. Ceci est couramment utilise pour les noms de joueurs, les noms de PNJ ou les etiquettes personnalisees.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/entity/nameplate/Nameplate.java`

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

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `text` | String | "" | Le texte a afficher au-dessus de l'entite |
| `isNetworkOutdated` | boolean | true | Drapeau interne pour la synchronisation reseau |

**Comment utiliser:**

```java
// Creer une entite avec un nameplate
holder.addComponent(Nameplate.getComponentType(), new Nameplate("Marchand"));

// Modifier le texte du nameplate a l'execution
Nameplate nameplate = store.getComponent(ref, Nameplate.getComponentType());
nameplate.setText("Nouveau Nom");  // Ne met a jour que si le texte a change

// Supprimer le nameplate
commandBuffer.removeComponent(ref, Nameplate.getComponentType());
```

**Notes d'utilisation:**
- Les changements de texte sont automatiquement synchronises aux clients lorsqu'ils sont modifies
- La methode `setText` ne marque le composant comme obsolete que si le texte change reellement
- Une chaine vide n'affiche pas de nameplate mais conserve le composant

---

### DynamicLight

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `DynamicLight` fait qu'une entite emet de la lumiere. Cela cree une source de lumiere mobile qui illumine la zone environnante.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/DynamicLight.java`

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

**Proprietes de ColorLight:**

| Propriete | Type | Plage | Description |
|-----------|------|-------|-------------|
| `radius` | byte | 0-255 | Rayon de lumiere en blocs |
| `red` | byte | 0-255 | Composante de couleur rouge |
| `green` | byte | 0-255 | Composante de couleur verte |
| `blue` | byte | 0-255 | Composante de couleur bleue |

**Comment utiliser:**

```java
// Creer une lumiere dynamique rouge
ColorLight redLight = new ColorLight((byte)15, (byte)255, (byte)0, (byte)0);
holder.addComponent(DynamicLight.getComponentType(), new DynamicLight(redLight));

// Creer une lumiere type torche blanche
ColorLight torchLight = new ColorLight((byte)12, (byte)255, (byte)200, (byte)100);
holder.addComponent(DynamicLight.getComponentType(), new DynamicLight(torchLight));

// Modifier la lumiere a l'execution
DynamicLight light = store.getComponent(ref, DynamicLight.getComponentType());
light.setColorLight(new ColorLight((byte)10, (byte)0, (byte)255, (byte)0));  // Lumiere verte

// Supprimer la lumiere dynamique
commandBuffer.removeComponent(ref, DynamicLight.getComponentType());
```

**Notes d'utilisation:**
- Les changements de lumiere sont automatiquement synchronises aux clients
- Pour les lumieres persistantes (sauvegardees avec l'entite), utilisez `PersistentDynamicLight` a la place
- `DynamicLightSystems.Setup` cree automatiquement `DynamicLight` depuis `PersistentDynamicLight` au chargement
- Les objets tombes emettent automatiquement de la lumiere si l'objet/bloc a une propriete de lumiere (voir `ItemComponent.computeDynamicLight()`)

---

### ItemPhysicsComponent (Deprecie)

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

Le composant `ItemPhysicsComponent` est un composant deprecie qui etait utilise pour stocker les calculs de physique des objets tombes. Il contient la velocite mise a l'echelle et les resultats de collision. Ce composant a ete remplace par des systemes de physique plus recents.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/ItemPhysicsComponent.java`

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

**Proprietes:**

| Propriete | Type | Description |
|-----------|------|-------------|
| `scaledVelocity` | `Vector3d` | Le vecteur de velocite mis a l'echelle pour l'objet |
| `collisionResult` | `CollisionResult` | Le resultat des calculs de collision |

**Notes d'utilisation:**
- Ce composant est deprecie et ne devrait pas etre utilise dans le nouveau code
- Utilisez les composants `Velocity` et `PhysicsValues` a la place pour la physique des objets

---

### PickupItemComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

Le composant `PickupItemComponent` gere l'animation et l'etat lorsqu'un objet est ramasse par une entite. Il gere l'animation de deplacement de la position de l'objet vers l'entite cible sur une duree configurable.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/PickupItemComponent.java`

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

   // Constructeurs
   public PickupItemComponent() {}
   public PickupItemComponent(@Nonnull Ref<EntityStore> targetRef, @Nonnull Vector3d startPosition);
   public PickupItemComponent(@Nonnull Ref<EntityStore> targetRef, @Nonnull Vector3d startPosition, float lifeTime);

   // Methodes
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

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `targetRef` | `Ref<EntityStore>` | null | Reference a l'entite qui ramasse l'objet |
| `startPosition` | `Vector3d` | null | Position de depart pour l'animation de ramassage |
| `originalLifeTime` | float | - | Duree originale de l'animation de ramassage |
| `lifeTime` | float | 0.15 | Temps restant pour l'animation de ramassage (secondes) |
| `finished` | boolean | false | Si l'animation de ramassage est terminee |

**Comment utiliser:**

```java
// Initier l'animation de ramassage d'objet
PickupItemComponent pickup = new PickupItemComponent(
    playerRef,                          // Entite ramassant l'objet
    itemPosition,                       // Position de depart
    0.15f                               // Duree de l'animation en secondes
);
commandBuffer.addComponent(itemRef, PickupItemComponent.getComponentType(), pickup);

// Verifier si le ramassage est termine
PickupItemComponent pickup = store.getComponent(itemRef, PickupItemComponent.getComponentType());
if (pickup.hasFinished()) {
    // Supprimer l'objet et l'ajouter a l'inventaire
}
```

**Notes d'utilisation:**
- Le composant est traite par `PickupItemSystem` qui interpole la position de l'objet
- Le temps de deplacement par defaut est de 0.15 secondes (150ms)
- Une fois termine, le systeme gere le transfert de l'objet vers l'inventaire de la cible

---

### PreventItemMerging

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

Le composant `PreventItemMerging` est un composant marqueur (tag) qui empeche un objet tombe d'etre fusionne avec d'autres objets identiques a proximite. Utilise le pattern singleton.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/PreventItemMerging.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Empecher un objet de fusionner avec d'autres
holder.addComponent(PreventItemMerging.getComponentType(), PreventItemMerging.INSTANCE);
// ou
commandBuffer.addComponent(itemRef, PreventItemMerging.getComponentType(), PreventItemMerging.INSTANCE);

// Permettre a nouveau la fusion
commandBuffer.removeComponent(itemRef, PreventItemMerging.getComponentType());
```

**Notes d'utilisation:**
- Utile pour les objets de quete, les drops uniques, ou les objets qui doivent rester separes
- Le `ItemMergeSystem` verifie ce composant avant de tenter de fusionner des objets

---

### PreventPickup

**Package:** `com.hypixel.hytale.server.core.modules.entity.item`

Le composant `PreventPickup` est un composant marqueur (tag) qui empeche un objet tombe d'etre ramasse par n'importe quelle entite. Utilise le pattern singleton.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/item/PreventPickup.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Empecher un objet d'etre ramasse
holder.addComponent(PreventPickup.getComponentType(), PreventPickup.INSTANCE);
// ou
commandBuffer.addComponent(itemRef, PreventPickup.getComponentType(), PreventPickup.INSTANCE);

// Permettre a nouveau le ramassage
commandBuffer.removeComponent(itemRef, PreventPickup.getComponentType());
```

**Notes d'utilisation:**
- Utile pour les objets decoratifs, les objets pendant les cinematiques, ou les objets restreints au proprietaire
- Different de `ItemComponent.pickupDelay` qui est temporaire - celui-ci est permanent jusqu'a suppression

---

### PhysicsValues

**Package:** `com.hypixel.hytale.server.core.modules.physics.component`

Le composant `PhysicsValues` stocke les proprietes physiques d'une entite qui affectent sa reponse a la simulation physique. Cela inclut la masse, le coefficient de trainee et la direction de la gravite.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/physics/component/PhysicsValues.java`

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

   // Constructeurs
   public PhysicsValues();  // Utilise les valeurs par defaut
   public PhysicsValues(@Nonnull PhysicsValues other);  // Constructeur de copie
   public PhysicsValues(double mass, double dragCoefficient, boolean invertedGravity);

   // Methodes
   public void replaceValues(@Nonnull PhysicsValues other);
   public void resetToDefault();
   public void scale(float scale);
   public double getMass();
   public double getDragCoefficient();
   public boolean isInvertedGravity();
   @Nonnull public static PhysicsValues getDefault();
}
```

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `mass` | double | 1.0 | Masse de l'entite (doit etre > 0) |
| `dragCoefficient` | double | 0.5 | Coefficient de resistance de l'air (doit etre >= 0) |
| `invertedGravity` | boolean | false | Si la gravite est inversee pour cette entite |

**Comment utiliser:**

```java
// Creer une entite avec une physique personnalisee
PhysicsValues physics = new PhysicsValues(2.0, 0.3, false);  // Lourd, faible trainee
holder.addComponent(PhysicsValues.getComponentType(), physics);

// Creer une entite flottante (gravite inversee)
PhysicsValues floatingPhysics = new PhysicsValues(0.5, 0.8, true);
holder.addComponent(PhysicsValues.getComponentType(), floatingPhysics);

// Modifier la physique a l'execution
PhysicsValues physics = store.getComponent(ref, PhysicsValues.getComponentType());
physics.scale(2.0f);  // Double la masse et la trainee

// Reinitialiser aux valeurs par defaut
physics.resetToDefault();
```

**Notes d'utilisation:**
- La masse affecte comment les forces (y compris la gravite) accelerent l'entite
- Un coefficient de trainee plus eleve signifie que l'entite ralentit plus vite dans l'air
- La gravite inversee fait tomber l'entite vers le haut - utile pour les effets speciaux
- Utilise automatiquement pour les objets tombes via `ItemComponent.generateItemDrop()`

---

### PlayerSettings

**Package:** `com.hypixel.hytale.server.core.modules.entity.player`

Le composant `PlayerSettings` stocke les preferences et parametres du joueur, y compris les emplacements de ramassage d'objets et les parametres du mode creatif. Il est implemente comme un record Java pour l'immutabilite.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/player/PlayerSettings.java`

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
      return INSTANCE;  // Retourne l'instance par defaut
   }
}
```

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `showEntityMarkers` | boolean | false | Afficher les marqueurs d'entites de debug |
| `armorItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Ou vont les armures ramassees |
| `weaponAndToolItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Ou vont les armes/outils ramasses |
| `usableItemsItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Ou vont les consommables ramasses |
| `solidBlockItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Ou vont les blocs ramasses |
| `miscItemsPreferredPickupLocation` | `PickupLocation` | Hotbar | Ou vont les objets divers ramasses |
| `creativeSettings` | `PlayerCreativeSettings` | - | Parametres specifiques au mode creatif |

**PlayerCreativeSettings:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `allowNPCDetection` | boolean | false | Si les PNJ peuvent detecter/cibler le joueur |
| `respondToHit` | boolean | false | Si le joueur reagit aux coups recus |

**Comment utiliser:**

```java
// Obtenir les parametres par defaut
PlayerSettings settings = PlayerSettings.defaults();

// Creer des parametres personnalises
PlayerSettings customSettings = new PlayerSettings(
    true,                       // showEntityMarkers
    PickupLocation.Inventory,   // armure -> inventaire
    PickupLocation.Hotbar,      // armes -> hotbar
    PickupLocation.Inventory,   // consommables -> inventaire
    PickupLocation.Inventory,   // blocs -> inventaire
    PickupLocation.Inventory,   // divers -> inventaire
    new PlayerCreativeSettings(true, false)  // parametres creatif
);
commandBuffer.addComponent(playerRef, PlayerSettings.getComponentType(), customSettings);
```

**Notes d'utilisation:**
- Les parametres sont generalement envoyes depuis le client et appliques a l'entite joueur
- PickupLocation determine ou les objets sont places dans l'inventaire du joueur
- Les parametres creatif controlent le comportement de jeu en mode creatif

---

### ChunkTracker

**Package:** `com.hypixel.hytale.server.core.modules.entity.player`

Le composant `ChunkTracker` gere quels chunks sont charges et visibles pour un joueur. Il gere le chargement/dechargement des chunks, le rayon de vue et la limitation du debit de streaming des chunks.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/player/ChunkTracker.java`

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

   // Methodes principales
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

   // Statistiques
   public int getLoadedChunksCount();
   public int getLoadingChunksCount();

   public enum ChunkVisibility { NONE, HOT, COLD }
}
```

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `chunkViewRadius` | int | - | Distance de vue du joueur en chunks |
| `maxChunksPerSecond` | int | 36 (distant) | Maximum de chunks a charger par seconde |
| `maxChunksPerTick` | int | 4 | Maximum de chunks a charger par tick |
| `minLoadedChunksRadius` | int | 2 | Rayon minimum de chunks charges |
| `maxHotLoadedChunksRadius` | int | 8 | Rayon maximum pour les chunks "hot" (actifs) |
| `sentViewRadius` | int | 0 | Rayon actuel des chunks envoyes |
| `hotRadius` | int | 0 | Rayon actuel des chunks hot |
| `readyForChunks` | boolean | false | Si le joueur est pret a recevoir des chunks |

**Enum ChunkVisibility:**

| Valeur | Description |
|--------|-------------|
| `NONE` | Le chunk n'est pas visible pour le joueur |
| `HOT` | Le chunk est visible et activement en tick |
| `COLD` | Le chunk est visible mais pas en tick |

**Comment utiliser:**

```java
// Obtenir le chunk tracker d'un joueur
ChunkTracker tracker = store.getComponent(playerRef, ChunkTracker.getComponentType());

// Verifier si un chunk est charge pour ce joueur
long chunkIndex = ChunkUtil.indexChunk(chunkX, chunkZ);
if (tracker.isLoaded(chunkIndex)) {
    // Le chunk est visible pour le joueur
}

// Configurer le debit de chargement des chunks
tracker.setMaxChunksPerSecond(64);
tracker.setMaxChunksPerTick(8);

// Obtenir la visibilite d'un chunk
ChunkTracker.ChunkVisibility visibility = tracker.getChunkVisibility(chunkIndex);
if (visibility == ChunkTracker.ChunkVisibility.HOT) {
    // Le chunk est activement en tick
}

// Effacer tous les chunks charges (pour teleportation/changement de monde)
tracker.clear();
```

**Notes d'utilisation:**
- Le chargement des chunks est limite en debit pour eviter la congestion reseau
- Les connexions locales obtiennent 256 chunks/seconde, LAN obtient 128, distant obtient 36
- Les chunks "Hot" sont activement en tick ; les chunks "cold" sont visibles mais statiques
- L'iterateur en spirale assure que les chunks les plus proches du joueur se chargent en premier

---

### ActiveAnimationComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `ActiveAnimationComponent` suit quelles animations sont actuellement en cours sur une entite a travers differents slots d'animation. Il permet la synchronisation reseau des etats d'animation.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/ActiveAnimationComponent.java`

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

**Proprietes:**

| Propriete | Type | Description |
|-----------|------|-------------|
| `activeAnimations` | `String[]` | Tableau de noms d'animations indexe par AnimationSlot |
| `isNetworkOutdated` | boolean | Drapeau pour la synchronisation reseau |

**Comment utiliser:**

```java
// Creer une entite avec un composant d'animation
holder.addComponent(ActiveAnimationComponent.getComponentType(), new ActiveAnimationComponent());

// Definir une animation sur un slot specifique
ActiveAnimationComponent anim = store.getComponent(ref, ActiveAnimationComponent.getComponentType());
anim.setPlayingAnimation(AnimationSlot.PRIMARY, "walk");
anim.setPlayingAnimation(AnimationSlot.SECONDARY, "wave");

// Effacer une animation
anim.setPlayingAnimation(AnimationSlot.PRIMARY, null);

// Obtenir toutes les animations actives
String[] animations = anim.getActiveAnimations();
```

**Notes d'utilisation:**
- Les slots d'animation permettent a plusieurs animations de jouer simultanement (ex: marcher + saluer)
- Les changements d'animation sont automatiquement synchronises aux clients lorsque marques comme obsoletes
- Les valeurs d'animation null indiquent qu'aucune animation ne joue sur ce slot

---

### MovementAudioComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `MovementAudioComponent` gere le retour audio pour le mouvement des entites, y compris les sons de pas et les sons de mouvement dans les blocs (comme marcher dans l'eau ou l'herbe).

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/MovementAudioComponent.java`

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
      // Filtre le proprietaire pour qu'il n'entende pas ses propres sons
   }
}
```

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `lastInsideBlockTypeId` | int | 0 | ID du type de bloc dans lequel l'entite se trouve |
| `nextMoveInRepeat` | float | -1.0 | Timer pour les sons de mouvement repetitifs |

**Comment utiliser:**

```java
// Ajouter l'audio de mouvement a une entite
holder.addComponent(MovementAudioComponent.getComponentType(), new MovementAudioComponent());

// Mettre a jour le bloc dans lequel l'entite se trouve
MovementAudioComponent audio = store.getComponent(ref, MovementAudioComponent.getComponentType());
audio.setLastInsideBlockTypeId(waterBlockTypeId);

// Configurer un son repetitif (ex: eclaboussures dans l'eau)
audio.setNextMoveInRepeat(0.5f);  // Repeter toutes les 0.5 secondes

// Verifier s'il est temps de jouer le son a nouveau
if (audio.canMoveInRepeat() && audio.tickMoveInRepeat(deltaTime)) {
    // Jouer le son de mouvement
    audio.setNextMoveInRepeat(0.5f);  // Reinitialiser le timer
}
```

**Notes d'utilisation:**
- Le `ShouldHearPredicate` empeche les entites d'entendre leurs propres sons de mouvement
- Utilise pour les sons ambiants comme marcher dans l'eau, les hautes herbes, etc.
- Definir `nextMoveInRepeat` a `NO_REPEAT` (-1.0) pour desactiver les sons repetitifs

---

### RespondToHit

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `RespondToHit` est un composant marqueur (tag) qui indique qu'une entite devrait reagir aux coups avec un retour visuel/audio. Utilise le pattern singleton.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/RespondToHit.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Faire reagir l'entite aux coups (montrer le retour de degats)
holder.addComponent(RespondToHit.getComponentType(), RespondToHit.INSTANCE);
// ou
commandBuffer.addComponent(ref, RespondToHit.getComponentType(), RespondToHit.INSTANCE);

// Desactiver la reponse aux coups
commandBuffer.removeComponent(ref, RespondToHit.getComponentType());

// Verifier si l'entite reagit aux coups
Archetype<EntityStore> archetype = store.getArchetype(ref);
boolean respondsToHit = archetype.contains(RespondToHit.getComponentType());
```

**Notes d'utilisation:**
- Utilise pour activer les animations, sons et effets de retour de coup
- Lie a `PlayerCreativeSettings.respondToHit` pour les parametres specifiques au joueur
- Les entites sans ce composant peuvent quand meme subir des degats mais ne montreront pas de retour

---

### RotateObjectComponent

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `RotateObjectComponent` fait qu'une entite tourne continuellement autour de son axe Y. Utile pour les objets d'affichage, les objets decoratifs ou les collectibles.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/RotateObjectComponent.java`

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

**Proprietes:**

| Propriete | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `rotationSpeed` | float | 0.0 | Vitesse de rotation en degres par seconde |

**Comment utiliser:**

```java
// Creer un objet d'affichage tournant lentement
RotateObjectComponent rotate = new RotateObjectComponent(45.0f);  // 45 deg/sec
holder.addComponent(RotateObjectComponent.getComponentType(), rotate);

// Creer un collectible tournant rapidement
holder.addComponent(RotateObjectComponent.getComponentType(),
    new RotateObjectComponent(180.0f));  // Demi-rotation par seconde

// Modifier la vitesse de rotation a l'execution
RotateObjectComponent rotate = store.getComponent(ref, RotateObjectComponent.getComponentType());
rotate.setRotationSpeed(90.0f);

// Arreter la rotation
rotate.setRotationSpeed(0.0f);
// ou supprimer le composant
commandBuffer.removeComponent(ref, RotateObjectComponent.getComponentType());
```

**Notes d'utilisation:**
- Les valeurs positives tournent dans le sens anti-horaire (vu du dessus)
- Les valeurs negatives tournent dans le sens horaire
- Couramment utilise pour les objets tombes pour les rendre plus visibles
- La rotation reelle est appliquee par un systeme qui met a jour `TransformComponent`

---

### FromPrefab

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `FromPrefab` est un composant marqueur (tag) qui indique qu'une entite a ete generee a partir d'une definition de prefab. Utilise le pattern singleton.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/FromPrefab.java`

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

**Proprietes:**
- Aucune (composant marqueur)

**Comment ajouter/supprimer:**

```java
// Marquer l'entite comme generee depuis un prefab
holder.addComponent(FromPrefab.getComponentType(), FromPrefab.INSTANCE);

// Verifier si l'entite vient d'un prefab
Archetype<EntityStore> archetype = store.getArchetype(ref);
boolean isFromPrefab = archetype.contains(FromPrefab.getComponentType());
```

**Notes d'utilisation:**
- Utilise pour distinguer les entites generees depuis des prefabs vs. creees dynamiquement
- Aide a la gestion et au nettoyage des entites
- Les entites prefab peuvent avoir une serialisation ou un comportement de reapparition special

---

### FromWorldGen

**Package:** `com.hypixel.hytale.server.core.modules.entity.component`

Le composant `FromWorldGen` marque une entite comme etant generee par le systeme de generation du monde. Il stocke l'ID de generation du monde pour suivre quel systeme de world gen l'a cree.

**Fichier source:** `server-analyzer/decompiled/com/hypixel/hytale/server/core/modules/entity/component/FromWorldGen.java`

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

**Proprietes:**

| Propriete | Type | Description |
|-----------|------|-------------|
| `worldGenId` | int | ID du systeme de generation du monde qui a cree cette entite |

**Comment utiliser:**

```java
// Marquer l'entite comme generee par world gen
FromWorldGen worldGen = new FromWorldGen(generatorId);
holder.addComponent(FromWorldGen.getComponentType(), worldGen);

// Verifier si l'entite a ete generee
FromWorldGen worldGen = store.getComponent(ref, FromWorldGen.getComponentType());
if (worldGen != null) {
    int generatorId = worldGen.getWorldGenId();
    // Gerer l'entite generee par le monde
}
```

**Notes d'utilisation:**
- Utilise pour les entites comme les creatures apparaissant naturellement, les structures ou les decorations
- Le `worldGenId` peut etre utilise pour identifier quel generateur a cree l'entite
- Aide a eviter de re-generer des entites qui ont deja ete apparues
- Lie au composant `WorldGenId` qui suit l'etat de generation au niveau du chunk
