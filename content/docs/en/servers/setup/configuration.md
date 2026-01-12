---
id: configuration
title: Server Configuration
sidebar_label: Configuration
sidebar_position: 3
description: Complete guide to configuring your Hytale server
---

# Server Configuration

This guide covers all configuration options for your Hytale server.

## server.properties

The main configuration file for your server.

```properties
# Server identity
server-name=My Hytale Server

# Network settings
port=5520

# Player settings
max-players=50

# World settings
view-distance=12
```

## Network Configuration

### Protocol Details

| Setting | Value |
|---------|-------|
| Protocol | **QUIC** |
| Port | **UDP 5520** |
| TCP Required | No |

:::info QUIC Protocol
Hytale uses the QUIC protocol which runs entirely over UDP. You only need to open UDP port 5520 - no TCP port forwarding is required.
:::

## Key Settings

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| `server-name` | Display name shown in server list | My Server | |
| `port` | Network port (UDP) | 5520 | QUIC protocol |
| `max-players` | Maximum concurrent players | 50 | Adjust based on hardware |
| `view-distance` | Render distance in chunks | 10 | Max recommended: 12 |

## View Distance

View distance significantly impacts server performance.

| View Distance | Blocks | Equivalent (Minecraft) | Performance Impact |
|---------------|--------|------------------------|-------------------|
| 6 chunks | 192 blocks | 12 chunks | Low |
| 10 chunks | 320 blocks | 20 chunks | Medium |
| **12 chunks** | **384 blocks** | **24 chunks** | **Recommended max** |

:::warning Performance Impact
Doubling view distance quadruples the data the server must handle. For servers with many players, keep view distance at 12 or below.
:::

## Java Configuration

### Recommended JVM Arguments

```bash
java -Xms4G -Xmx8G \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -jar hytale-server.jar
```

### Memory Allocation by Player Count

| Players | -Xms | -Xmx |
|---------|------|------|
| 1-10 | 4G | 4G |
| 25-50 | 8G | 12G |
| 50+ | 16G | 16G+ |

:::tip Java Version
Hytale requires **Java 25**. We recommend using [Adoptium](https://adoptium.net/) (formerly AdoptOpenJDK) for best compatibility and performance.
:::

## Example Configurations

### Small Private Server (1-10 players)

```properties
server-name=My Private Server
port=5520
max-players=10
view-distance=12
```

```bash
java -Xms4G -Xmx4G -jar hytale-server.jar
```

### Medium Community Server (25-50 players)

```properties
server-name=Community Server
port=5520
max-players=50
view-distance=10
```

```bash
java -Xms8G -Xmx12G -XX:+UseG1GC -jar hytale-server.jar
```

### Large Public Server (50+ players)

```properties
server-name=Public Server
port=5520
max-players=100
view-distance=8
```

```bash
java -Xms16G -Xmx16G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -jar hytale-server.jar
```

## Firewall Configuration

### Linux (UFW)

```bash
# Allow Hytale server port
sudo ufw allow 5520/udp
```

### Linux (iptables)

```bash
# Allow Hytale server port
sudo iptables -A INPUT -p udp --dport 5520 -j ACCEPT
```

### Windows Firewall

```powershell
# Allow Hytale server port
New-NetFirewallRule -DisplayName "Hytale Server" -Direction Inbound -Protocol UDP -LocalPort 5520 -Action Allow
```
