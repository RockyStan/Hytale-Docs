---
id: crafting-guide
title: Crafting Guide
sidebar_label: Crafting
sidebar_position: 7
description: Guide to Hytale's crafting system - benches, recipes, and fieldcraft
---

# Crafting Guide

Welcome to the crafting guide for Hytale. Unlike traditional grid-based crafting systems, Hytale uses a **recipe-based crafting system** with specialized benches and categories.

:::note Early Access
Hytale is currently in Early Access. Crafting mechanics and recipes may change as the game develops.
:::

## How Crafting Works

Hytale's crafting system does **not** use a crafting grid. Instead, crafting works through:

1. **Recipes** - Each craftable item has a defined recipe with required materials
2. **Benches** - Specialized crafting stations for different item types
3. **Fieldcraft** - Portable crafting accessible from your inventory
4. **Categories** - Recipes are organized into categories for easy navigation

### The Crafting Process

1. Open a crafting bench or access Fieldcraft from your inventory
2. Browse recipes by category
3. Select a recipe you want to craft
4. If you have the required materials, craft the item
5. Some recipes require time to complete

## Bench Types

Hytale features four types of crafting stations:

| Bench Type | Description |
|------------|-------------|
| **Crafting** | Standard crafting with categories and sub-categories |
| **Processing** | Fuel-based processing (furnaces, smelters) |
| **Diagram Crafting** | Visual diagram-based crafting interface |
| **Structural Crafting** | Building and structure crafting with block variants |

### Bench Tiers

Benches can be upgraded through tiers, providing benefits:

- **Reduced crafting time** - Higher tiers craft faster
- **Extra input slots** - More materials can be queued
- **Extra output slots** - More outputs can be stored

## Fieldcraft (Portable Crafting)

Fieldcraft is the portable crafting system you can access anywhere from your inventory. It's designed for basic recipes you might need while exploring.

- Access via your inventory
- Limited to simpler recipes
- Instant crafting (no wait time)
- No bench required

## Recipe Structure

Each recipe in Hytale consists of:

| Component | Description |
|-----------|-------------|
| **Input Materials** | Required items/resources to craft |
| **Primary Output** | The main item you receive |
| **Secondary Outputs** | Additional items sometimes produced |
| **Bench Requirement** | Which bench and tier is needed |
| **Crafting Time** | How long the craft takes |
| **Knowledge Required** | Whether you must learn the recipe first |

### Material Types

Recipes can accept materials in different ways:

- **Specific Item** - Only a specific item works
- **Resource Type** - Any item of that resource type (e.g., any wood)
- **Item Tag** - Items with a matching tag

## Recipe Learning

Some recipes must be discovered or learned before you can craft them.

### Ways to Learn Recipes

- **Discovery** - Find and interact with items in the world
- **Recipe Items** - Consume special items that teach recipes
- **Progression** - Unlock through world progression (Memories system)

## Crafting Tips

### Getting Started

1. **Access Fieldcraft** - Open your inventory to find portable crafting
2. **Find a Bench** - Locate crafting stations in the world or craft one
3. **Check Categories** - Browse through categories to find what you need
4. **Gather Materials** - The recipe will show required items

### Material Storage

Benches can automatically pull materials from nearby chests:

- Horizontal search radius: 7 blocks
- Vertical search radius: 3 blocks
- Maximum chests searched: 100

Keep your materials organized in chests near your crafting stations for convenience.

## See Also

- [Crafting System (Technical)](/docs/api/server-internals/modules/crafting-system) - Detailed technical documentation
- [Items](/docs/modding/data-assets/items/overview) - Item definitions and properties

---

*This guide covers the core crafting mechanics. Specific recipes and items are still being documented as Hytale develops during Early Access.*
