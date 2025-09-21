# 🐱 Cat API

A Node.js multi-device API built with Hono for monitoring and controlling locally Tuya-based smart cat feeders and automatic litter boxes. This API provides comprehensive device management, meal plan control, litter monitoring, and real-time device scanning across multiple devices simultaneously.

## 🚀 Features

### 📱 Multi-Device Management

- **Device Status**: Real-time status monitoring for all connected devices
- **Connection Management**: Connect/disconnect all devices or individual devices
- **Device Types**: Support for feeders and litter boxes with type-specific endpoints

### 🍽️ Smart Feeder Control

- **Meal Plan Management**: Create, read, and update feeding schedules with Base64 encoding/decoding and caching
- **Manual Feeding**: Trigger immediate feeding sessions with customizable portions
- **Feeder status**: Retrieve detailed feeding logs with parsed timestamps and portion tracking
- **Multi-Feeder Support**: Manage multiple feeders independently

### 🚽 Litter Box Monitoring

- **Comprehensive Status**: Monitor litter level, cleaning cycles, sensor data, and system state
- **Smart Controls**: Trigger cleaning cycles, configure sleep modes, and adjust settings
- **Sensor Analytics**: Track defecation frequency, duration, and maintenance alerts
- **Preference Management**: Control lighting, sounds, child lock, and kitten mode

### 🔍 Advanced Diagnostics

- **DPS Scanning**: Discover available device data points with configurable ranges and timeouts
- **Real-time Monitoring**: Live device data updates and event tracking
- **Device Analytics**: Comprehensive device information and capability discovery

## 📋 Prerequisites

- Bun latest (https://bun.com)
- One or more Tuya-compatible smart cat feeders and/or automatic litter boxes
- Device credentials (ID, Key, IP) for each device

## 🛠️ Installation

1. **Getting Device Credentials**

   To retrieve device credentials, you need a Tuya Cloud account (free):

   1. Create an account at https://iot.tuya.com
   2. Create a project and select the correct datacenter
   3. Add your devices (easiest way: scan QR code with Smart Life app)
   4. Use API Explorer > Device Management > Query device details
   5. Get the device ID from the devices list and retrieve the local key

   **Note**: The local key changes when the device is reset or removed from Smart Life.

2. **Clone the repository**

   ```bash
   git clone https://github.com/uplg/cat-api.git
   cd cat-api
   ```

3. **Install dependencies**

   ```bash
   bun install
   ```

4. **Device Configuration**

   Create a `devices.json` file in the root directory with your device configurations:

   ```json
   [
     {
       "name": "Pixi Smart Feeder",
       "id": "your_feeder_device_id",
       "key": "your_feeder_device_key",
       "category": "cwwsq",
       "product_name": "Pixi Smart Feeder",
       "ip": "192.168.1.174",
       "version": "3.4"
     },
     {
       "name": "Cat Litter Box",
       "id": "your_litter_device_id",
       "key": "your_litter_device_key",
       "category": "msp",
       "product_name": "Cat Litter Box",
       "ip": "192.168.1.145",
       "version": "3.5"
     }
   ]
   ```

   **Device Configuration Fields:**

   - `name`: Friendly name for your device
   - `id`: Tuya device ID
   - `key`: Tuya device local key
   - `category`: Device category (cwwsq for feeders, msp for litter boxes)
   - `product_name`: Product name from Tuya
   - `ip`: Local IP address of the device
   - `version`: Tuya protocol version (usually 3.4 or 3.5)

5. **Environment Setup (Optional)**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file for server settings:

   ```env
   # API Server port
   PORT=3000
   ```

6. **Start the server**

   ```bash
   bun start
   ```

The API will be available at `http://localhost:3000`

### Docker (deployment)

Build the Docker image:

```bash
docker build -t cat-api .
```

Run the container:

```bash
docker run -p 3000:3000 cat-api
```

### 📚 API Endpoints

### 🏠 General

| Method | Endpoint | Description                             |
| ------ | -------- | --------------------------------------- |
| `GET`  | `/`      | API information and available endpoints |

### 📱 Device Management

| Method | Endpoint                | Description                                     |
| ------ | ----------------------- | ----------------------------------------------- |
| `GET`  | `/devices`              | List all configured devices                     |
| `POST` | `/devices/connect`      | Connect to all devices (monitor devices events) |
| `POST` | `/devices/disconnect`   | Disconnect from all devices                     |
| `GET`  | `/devices/:id/status`   | Get specific device status                      |
| `GET`  | `/devices/:id/scan-dps` | Scan device data points (DPS) @debug            |

#### List All Devices

```bash
curl http://localhost:3000/devices
```

**Response:**

```json
{
  "success": true,
  "devices": [
    {
      "id": "bfa64c250eb410189dy9gq",
      "name": "Pixi Smart Feeder",
      "type": "feeder",
      "product_name": "Pixi Smart Feeder",
      "model": "43752-022",
      "ip": "192.168.1.174",
      "version": "3.4",
      "connected": false,
      "last_data": {}
    }
  ],
  "total": 1,
  "message": "Devices list retrieved successfully"
}
```

#### Connect/Disconnect Devices

```bash
# Connect all devices
curl -X POST http://localhost:3000/devices/connect

# Disconnect all devices
curl -X POST http://localhost:3000/devices/disconnect
```

### 🍽️ Feeder Control (Multi-Device)

| Method | Endpoint                        | Description                                                                                 |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `POST` | `/devices/:id/feeder/feed`      | Trigger manual feeding                                                                      |
| `GET`  | `/devices/:id/feeder/status`    | Get feeder status                                                                           |
| `GET`  | `/devices/:id/feeder/meal-plan` | Get current meal plan (cached may be outdated if updated outside the API eg. SmartLife App) |
| `POST` | `/devices/:id/feeder/meal-plan` | Set new meal plan                                                                           |

#### Manual Feeding

```bash
# Feed 1 portion (default)
curl -X POST http://localhost:3000/devices/bfa64c250eb410189dy9gq/feeder/feed

# Feed custom portion (max 12)
curl -X POST http://localhost:3000/devices/bfa64c250eb410189dy9gq/feeder/feed \
  -H "Content-Type: application/json" \
  -d '{"portion": 3}'
```

#### Get Feeder Status

```bash
curl http://localhost:3000/devices/bfa64c250eb410189dy9gq/feeder/status
```

**Response:**

```json
{
  "success": true,
  "device": { "id": "bfa64c250eb410189dy9gq", "name": "Pixi Smart Feeder" },
  "parsed_status": {
    "feeding": {
      "manual_feed_enabled": true,
      "last_feed_size": "2 portions",
      "last_feed_report": 2,
      "quick_feed_available": false
    },
    "settings": { "sound_enabled": false, "alexa_feed_enabled": false },
    "system": {
      "fault_status": true,
      "powered_by": "AC Power",
      "ip_address": "192.168.1.174"
    },
    "history": {
      "raw": "R:0  C:2  T:1758482158",
      "parsed": {
        "remaining": "0",
        "count": "2",
        "timestamp": "1758482158",
        "timestamp_readable": "2025-09-21T19:15:58.000Z"
      }
    }
  },
  "raw_dps": { "3": 2, "14": 1, "...": "..." },
  "message": "Feeder status retrieved successfully"
}
```

#### Meal Plan Management

```bash
# Get current meal plan
curl http://localhost:3000/devices/bfa64c250eb410189dy9gq/feeder/meal-plan

# Set new meal plan
curl -X POST http://localhost:3000/devices/bfa64c250eb410189dy9gq/feeder/meal-plan \
  -H "Content-Type: application/json" \
  -d '{
    "meal_plan": [
      {
        "days_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "time": "08:00",
        "portion": 2,
        "status": "Enabled"
      },
      {
        "days_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "time": "18:00",
        "portion": 1,
        "status": "Enabled"
      }
    ]
  }'
```

### 🚽 Litter Box Control (Multi-Device)

| Method | Endpoint                           | Description                |
| ------ | ---------------------------------- | -------------------------- |
| `GET`  | `/devices/:id/litter-box/status`   | Get comprehensive status   |
| `POST` | `/devices/:id/litter-box/clean`    | Trigger manual cleaning    |
| `POST` | `/devices/:id/litter-box/settings` | Update litter box settings |

#### Get Litter Box Status

```bash
curl http://localhost:3000/devices/bfe88591a492929ab380tm/litter-box/status
```

**Response:**

```json
{
  "success": true,
  "device": {
    "id": "bfe88591a492929ab380tm",
    "name": "Cat Litter Box"
  },
  "parsed_status": {
    "clean_delay": {
      "seconds": 121,
      "formatted": "2:01"
    },
    "sleep_mode": {
      "enabled": true,
      "start_time_minutes": 1410,
      "start_time_formatted": "23:30",
      "end_time_minutes": 420,
      "end_time_formatted": "07:00"
    },
    "sensors": {
      "defecation_duration": 23,
      "defecation_frequency": 2,
      "fault_alarm": 0,
      "litter_level": "half"
    },
    "system": {
      "state": "satnd_by",
      "cleaning_in_progress": false,
      "maintenance_required": false
    },
    "settings": {
      "lighting": true,
      "child_lock": false,
      "prompt_sound": true,
      "kitten_mode": false,
      "automatic_homing": true
    }
  },
  "raw_dps": { "101": 121, "102": true, "...": "..." }
}
```

#### Manual Cleaning

```bash
curl -X POST http://localhost:3000/devices/bfe88591a492929ab380tm/litter-box/clean
```

#### Update Settings

```bash
curl -X POST http://localhost:3000/devices/bfe88591a492929ab380tm/litter-box/settings \
  -H "Content-Type: application/json" \
  -d '{
    "clean_delay": 180,
    "sleep_mode": {
      "enabled": true,
      "start_time": "23:00",
      "end_time": "07:30"
    },
    "preferences": {
      "lighting": false,
      "kitten_mode": true
    }
  }'
```

### 🔍 Device Diagnostics

#### DPS Scanning

```bash
# Full scan (default: DPS 1-255, 3000ms timeout)
curl http://localhost:3000/devices/bfa64c250eb410189dy9gq/scan-dps

# Quick scan with custom range
curl "http://localhost:3000/devices/bfa64c250eb410189dy9gq/scan-dps?start=1&end=120&timeout=1000"
```

**Query Parameters:**

| Parameter | Default | Description                     |
| --------- | ------- | ------------------------------- |
| `start`   | `1`     | Starting DPS number             |
| `end`     | `255`   | Ending DPS number               |
| `timeout` | `3000`  | Timeout per DPS in milliseconds |

**Response:**

```json
{
  "success": true,
  "scan_range": "1-255",
  "scanned_count": 255,
  "found_count": 2,
  "available_dps": {
    "3": {
      "value": 1,
      "type": "number"
    },
    "104": {
      "value": "R:0  C:1  T:1758453557",
      "type": "string",
      "length": 22
    }
  },
  "message": "DPS scan completed: 2 active DPS found out of 255 scanned"
}
```

## 📋 Meal Plan Format

### JSON Structure

```json
{
  "days_of_week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  "time": "HH:MM",
  "portion": 1-12,
  "status": "Enabled" | "Disabled"
}
```

### Days of Week

- Use full day names: `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, `Sunday`
- Can specify any combination of days

### Time Format

- 24-hour format: `HH:MM` (e.g., `08:00`, `18:30`)

### Portions

- Integer value from 1 to 12
- Represents the number of portions to dispense

### Status

- `"Enabled"`: Meal will be dispensed
- `"Disabled"`: Meal is scheduled but won't be dispensed

## 🔧 Device Data Points (DPS)

### 🍽️ Smart Feeder DPS Reference

| DPS | Name               | Type         | Access | Description                                           | Example Value                       |
| --- | ------------------ | ------------ | ------ | ----------------------------------------------------- | ----------------------------------- |
| 1   | meal_plan          | Raw (Base64) | R/W    | Feeding schedule data (encoded binary format)         | `"AQEBAgEBAwEBBAEBBQEBBgEBBwEB"`    |
| 2   | quick_feed         | Boolean      | W      | Quick feeding trigger                                 | `true`, `false`                     |
| 3   | manual_feed        | Integer      | W      | Manual feeding trigger (1-12 portions)                | `1`, `2`, `3`                       |
| 9   | factory_reset      | Boolean      | W      | Factory reset trigger (true: reset, false: no reset)  | `true`, `false`                     |
| 14  | fault              | Boolean      | R      | Fault alarm (0 or 1?)                                 | `0`, `1`                            |
| 15  | feed_report        | Integer      | R      | Portions distributed                                  | `0`, `1`, `2`...                    |
| 101 | feed_size          | Integer      | R      | Feed size distributed                                 | `1份`, `2份` (1 portion, 2 portion) |
| 102 | manual_feed_switch | Boolean      | R/W    | Manual feed switch (true: enabled, false: disabled)   | `true`, `false`                     |
| 103 | sound_switch       | Boolean      | R/W    | Sound switch (true: enabled, false: disabled)         | `true`, `false`                     |
| 104 | feed_history       | String       | R      | Feeding history logs with timestamp and count         | `"R:0  C:1  T:1758453557"`          |
| 105 | powered_by         | String       | R      | Powered by (e.g., "Tuya")                             | `"Tuya"`                            |
| 106 | feed_by_alexa      | Boolean      | R/W    | Feed by Alexa switch (true: enabled, false: disabled) | `true`, `false`                     |
| 107 | ip_address         | String       | R      | IP address of the device                              | `"192.168.1.100"`                   |

**DPS Access Types:**

- **R**: Read-only (device reports status)
- **W**: Write-only (send commands to device)
- **R/W**: Read/Write (bidirectional communication)

### 🚽 Smart Litter Box DPS Reference

| DPS | Name                   | Type    | Access | Description                                    | Example Value                                            |
| --- | ---------------------- | ------- | ------ | ---------------------------------------------- | -------------------------------------------------------- |
| 101 | clean_delay            | Number  | R/W    | Delay before automatic cleaning (seconds)      | `121` (2:01 minutes)                                     |
| 102 | sleep_mode_active      | Boolean | R/W    | Sleep mode enabled/disabled                    | `true`, `false`                                          |
| 103 | sleep_mode_start       | Number  | R/W    | Sleep mode start time (minutes since midnight) | `1410` (23:30)                                           |
| 104 | sleep_mode_end         | Number  | R/W    | Sleep mode end time (minutes since midnight)   | `420` (07:00)                                            |
| 105 | defecation_frequency   | Number  | R      | Daily defecation count                         | `2`, `3`, `5`                                            |
| 106 | defecation_duration    | Number  | R      | Last defecation duration (seconds)             | `23`, `45`, `67`                                         |
| 107 | cleaning_in_progress   | Boolean | R      | Cleaning cycle active status                   | `true`, `false`                                          |
| 108 | maintenance_required   | Boolean | R      | Maintenance alert status                       | `true`, `false`                                          |
| 109 | system_state           | String  | R      | Current system operational state               | `"satnd_by"`, `"clumping"`, `"cat_inside"`, `"cleaning"` |
| 110 | child_lock             | Boolean | R/W    | Child safety lock enabled                      | `true`, `false`                                          |
| 111 | kitten_mode            | Boolean | R/W    | Kitten mode for smaller cats                   | `true`, `false`                                          |
| 112 | litter_level           | String  | R      | Current litter level indicator                 | `"half"`, `"full"`, `"low"`                              |
| 113 | reset_sand_level       | Boolean | W      | Reset litter level indicator                   | `true` (trigger action)                                  |
| 114 | fault_alarm            | Number  | R      | System fault/error code                        | `0` (no error), `1`, `2`, etc.                           |
| 115 | reset_factory_settings | Boolean | W      | Factory reset trigger (⚠️ Use with caution)    | `true` (trigger action)                                  |
| 116 | lighting_enabled       | Boolean | R/W    | Internal lighting control                      | `true`, `false`                                          |
| 117 | prompt_sound_enabled   | Boolean | R/W    | Audio prompts and notifications                | `true`, `false`                                          |
| 118 | weight_unit            | String  | R/W    | Weight measurement unit                        | `"kg"`, `"lb"`                                           |
| 119 | automatic_homing       | Boolean | R/W    | Auto-return to home position after cleaning    | `true`, `false`                                          |

### 🔍 DPS Discovery Tips

When scanning for DPS on new devices:

1. **Common Ranges by Device Type:**

   - **Feeders**: DPS 1-10, 100-110
   - **Litter Boxes**: DPS 100-120
   - **General**: DPS 1-5 (basic controls)

2. **Scanning Strategy:**

   ```bash
   # Quick scan
   curl "http://localhost:3000/devices/YOUR_DEVICE_ID/scan-dps?start=1&end=120&timeout=1000"

   # Full discovery scan (slower)
   curl "http://localhost:3000/devices/YOUR_DEVICE_ID/scan-dps"
   ```

3. **Understanding DPS Values:**
   - **Numbers**: Usually settings, counters, or time values
   - **Booleans**: On/off switches, status indicators
   - **Strings**: Complex data, states, or encoded information
   - **Base64**: Binary data like meal plans or configurations

## 📡 Real-time Events

The multi-device API provides real-time monitoring capabilities:

- **Device Connection**: Automatic detection of device status changes
- **Feeding Activities**: When feeding occurs (manual or scheduled)
- **Device Status**: Connection and disconnection events

## 🧪 Testing

### Test Manual Feeding

```bash
# Replace with your actual device ID
curl -X POST http://localhost:3000/devices/bfa64c250eb410189dy9gq/feeder/feed
```

### Check Device Status

```bash
# List all devices first
curl http://localhost:3000/devices

# Full device scan (may take longer) - replace with your device ID
curl http://localhost:3000/devices/bfa64c250eb410189dy9gq/scan-dps

# Quick device discovery
curl "http://localhost:3000/devices/bfa64c250eb410189dy9gq/scan-dps?start=1&end=150&timeout=1000"
```

## 🔍 Troubleshooting

### Common Issues

1. **Device Connection Failed**

   - Verify device IP address and network connectivity
   - Check if device is powered on and connected to WiFi
   - Retry the request, Tuya devices don't support multi devices connected at the same time (it might be your phone as an example), else it's probably a wrong protocol version (3.3 instead of 3.4 as an example)

2. **ECONNRESET**

   - Double-check `id` and `key` in device.json
   - Verify device version (usually 3.3, 3.4 or 3.5 for recent tuya devices)

3. **Meal Plan Not Reading**

   - The device may not have a meal plan retrieved yet, DPS don't expose the raw data so we need to update (and then it's saved on instance)
   - Try setting a meal plan first using the POST endpoint

4. **DPS Scan Taking Too Long**
   - Use smaller ranges: `?start=1&end=50` instead of full scan
   - Reduce timeout: `?timeout=1000` for faster scanning
   - Target known DPS ranges for your device type

### Debug Mode

The API includes comprehensive logging. Check the console output for:

- Device connection status
- DPS scan results
- Meal plan encoding/decoding details
- Real-time event reports

## 🏗️ Architecture

- **Framework**: Hono (lightweight web framework)
- **Device Communication**: TuyAPI for Tuya device protocol
- **Meal Plan Encoding**: Custom Base64 binary format
- **Real-time**: Event-driven architecture with persistent connections

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:

- Check the troubleshooting section
- Leave an issue (try to add as much details as possible)

## Special Thanks

- [TuyAPI](https://github.com/codetheweb/tuyapi) for the device communication library
- [Tinytuya](https://github.com/jasonacox/tinytuya) for his wizard, helped a lot debugging version and discovering device capabilities

---

**Happy feeding! 🐱🍽️**
