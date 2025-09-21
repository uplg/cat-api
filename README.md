# 🐱 Cat API

A Node.js API built with Hono for monitoring and controlling locally Tuya-based smart cat feeders / automatic litters. This API provides comprehensive meal plan management, feeding controls, litter status and real-time device monitoring.

## 🚀 Features

- **Meal Plan Management**: Create, read, and update feeding schedules with Base64 encoding/decoding
- **Manual Feeding**: Trigger immediate feeding sessions
- **Real-time Monitoring**: Listen for device reports and feeding activities
- **Device Scanning**: Discover available device data points (DPS)
- **Feed History**: Retrieve detailed feeding logs (only last one, you need to save it somewhere to get an history like in the SmartLife app)
- **Litter Status**: Get current litter box status (e.g., litter level, cleaning in progress)

## 📋 Prerequisites

- Node.js 22+
- A Tuya-compatible smart cat feeder
- Device credentials (ID, Key, IP, Port)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/uplg/cat-api.git
   cd cat-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file with your device credentials:

   ```env
   TUYA_DEVICE_ID=your_device_id
   TUYA_DEVICE_KEY=your_device_key
   TUYA_DEVICE_IP=your_device_ip
   TUYA_DEVICE_PORT=6668
   TUYA_DEVICE_VERSION=3.4
   # API Server port
   PORT=3000
   ```

   To retrieve the device key (aka localkey) you need an account on Tuya cloud (free), create there : https://iot.tuya.com

   Then you need to create a project, define the correct datacenter and add your device to it, the simplest way is to scan the QRCode using Smart Life app.

   Then use the API Explorer > Device management > Query device details, paste your device id (got from devices list under your project), and you should see the device details including the localkey.

   **Note**: The localkey changes each time the iot device is reset or removed from your SmartLife account.

4. **Start the server**
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### 🏠 General

| Method | Endpoint | Description                             |
| ------ | -------- | --------------------------------------- |
| `GET`  | `/`      | API information and available endpoints |

### 🍽️ Feeding Control

| Method | Endpoint        | Description              |
| ------ | --------------- | ------------------------ |
| `POST` | `/feed`         | Trigger manual feeding   |
| `GET`  | `/feed-history` | Get last feeding history |

**Example (1 portion):**

```bash
curl -X POST http://localhost:3000/feed
```

**Example with custom portion (max 12):**

```bash
curl -X POST http://localhost:3000/feed \
  -H "Content-Type: application/json" \
  -d '{"portion": 2}'
```

**Get feeding history:**

```bash
curl http://localhost:3000/feed-history
```

**Response example:**

```json
{
  "success": true,
  "feed_history": {
    "raw": "R:0  C:1  T:1758453557",
    "parsed": {
      "remaining": "0",
      "count": "1",
      "timestamp": "1758453557",
      "timestamp_readable": "2025-09-21T11:19:17.000Z"
    }
  },
  "message": "Feed history retrieved and analyzed"
}
```

### 🗓️ Meal Plan Management

| Method | Endpoint     | Description                      |
| ------ | ------------ | -------------------------------- |
| `GET`  | `/meal-plan` | Get current meal plan            |
| `POST` | `/meal-plan` | Set new meal plan (max 10 plans) |

**Set Meal Plan Example:**

```bash
curl -X POST http://localhost:3000/meal-plan \
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

### 🎧 Real-time Monitoring

| Method | Endpoint            | Description                                    |
| ------ | ------------------- | ---------------------------------------------- |
| `POST` | `/start-listening`  | Start persistent connection for device reports |
| `POST` | `/stop-listening`   | Stop persistent connection                     |
| `GET`  | `/listening-status` | Check listening status                         |

**Start Monitoring:**

```bash
curl -X POST http://localhost:3000/start-listening
```

### 📊 Device Information

| Method | Endpoint    | Description                                     |
| ------ | ----------- | ----------------------------------------------- |
| `GET`  | `/scan-dps` | Scan device data points with configurable range |

#### DPS Scanning Options

The `/scan-dps` endpoint supports query parameters for flexible scanning:

| Parameter | Default | Description                     |
| --------- | ------- | ------------------------------- |
| `start`   | `1`     | Starting DPS number             |
| `end`     | `255`   | Ending DPS number               |
| `timeout` | `3000`  | Timeout per DPS in milliseconds |

**Examples:**

```bash
# Full scan (default: DPS 1-255, 3000ms timeout)
curl http://localhost:3000/scan-dps

# Quick scan of common DPS range
curl "http://localhost:3000/scan-dps?start=1&end=120&timeout=1000"
```

**Response Format:**

```json
{
  "success": true,
  "scan_range": "1-255",
  "scanned_count": 255,
  "found_count": 5,
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
  "errors_count": 0,
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

| DPS | Name         | Type         | Description            |
| --- | ------------ | ------------ | ---------------------- |
| 1   | meal_plan    | Raw (Base64) | Feeding schedule data  |
| 3   | manual_feed  | Integer      | Manual feeding trigger |
| 104 | feed_history | String       | Feeding history logs   |

## 📡 Real-time Events

When listening mode is active, the API automatically logs:

- **Meal Plan Changes**: When the device reports meal plan updates
- **Feeding Activities**: When feeding occurs (manual or scheduled)
- **Device Status**: Connection and disconnection events

## 🧪 Testing

### Test Manual Feeding

```bash
curl -X POST http://localhost:3000/feed
```

### Check Device Status

```bash
# Full device scan (may take longer)
curl http://localhost:3000/scan-dps

# Quick device discovery
curl "http://localhost:3000/scan-dps?start=1&end=150&timeout=1000"


```

## 🧹 Cat Litter Box Control

The API includes specialized endpoints for controlling Tuya-based smart cat litter boxes. These endpoints provide comprehensive monitoring and control capabilities.

### 📊 Status Monitoring

| Endpoint             | Method | Description                                    |
| -------------------- | ------ | ---------------------------------------------- |
| `/litter-box/status` | GET    | Get complete litter box status and sensor data |

#### Get litter box status

```bash
curl http://localhost:3000/litter-box/status
```

**Response format:**

```json
{
  "success": true,
  "raw_dps": {
    "101": 121,
    "102": true,
    "103": 1410,
    "104": 660,
    "105": 1,
    "106": 28,
    "107": false,
    "108": false,
    "109": "stand_by",
    "110": false,
    "111": false,
    "112": "half",
    "114": 0,
    "116": true,
    "117": true,
    "119": true
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
      "defecation_duration": 23
    },
    "system": {
      "state": "satnd_by",
      "cleaning_in_progress": false,
      "maintenance_required": false,
      "kitten_mode": false,
      "automatic_homing": true,
      "defecation_frequency": 2,
      "hourly_cycle_count": 0
    },
    "settings": {
      "lighting": true,
      "child_lock": false,
      "prompt_sound": true
    },
    "litter_level": "half"
  },
  "message": "Litter box status retrieved successfully"
}
```

### 🧹 Cleaning Control

| Endpoint            | Method | Description                   |
| ------------------- | ------ | ----------------------------- |
| `/litter-box/clean` | POST   | Trigger manual cleaning cycle |

#### Trigger manual cleaning

```bash
curl -X POST http://localhost:3000/litter-box/clean
```

**Response:**

```json
{
  "success": true,
  "message": "Manual cleaning cycle triggered",
  "action": "Cleaning started"
}
```

### 📋 DPS Reference

The litter box uses the following DPS (Data Point System) values:

> **Note:** Mappings marked with ⚠️ are probably incorrect based on observed behavior and need further investigation.

| DPS | Description             | Type    | Example                                                                               |
| --- | ----------------------- | ------- | ------------------------------------------------------------------------------------- |
| 101 | Clean delay             | Number  | 121 (seconds, 2:01)                                                                   |
| 102 | Sleep mode active       | Boolean | true                                                                                  |
| 103 | Sleep mode start time   | Number  | 1410 (minutes since midnight, 23:30)                                                  |
| 104 | Sleep mode end time     | Number  | 420 (minutes since midnight, 07:00)                                                   |
| 105 | Defecation frequency    | Number  | 2 (daily count of defecations) |
| 106 | Defecation duration     | Number  | 23 (seconds - timer measuring defecation duration) |
| 107 | Cleaning in progress    | Boolean | false                                                                                 |
| 108 | Maintenance required    | Boolean | false                                                                                 |
| 109 | System state            | String  | "stand_by"                                                                            |
| 110 | Child lock              | Boolean | false                                                                                 |
| 111 | Kitten mode active      | Boolean | false                                                                                 |
| 112 | Litter level            | String  | "half"                                                                                |
| 114 | Cycle count ⚠️          | Number  | 0 (probably wrong - mapped as hourly_cycle_count but doesn't increment)               |
| 116 | Lighting enabled        | Boolean | true                                                                                  |
| 117 | Prompt sound enabled    | Boolean | true                                                                                  |
| 119 | Automatic homing active | Boolean | true                                                                                  |

## 🔍 Troubleshooting

### Common Issues

1. **Device Connection Failed**

   - Verify device IP address and network connectivity
   - Check if device is powered on and connected to WiFi
   - If that worked before a disconnect error might have occured, restart the API, else it's probably a wrong protocol version (3.3 instead of 3.4 as an example)

2. **Invalid Credentials | ECONNRESET**

   - Double-check `TUYA_DEVICE_ID` and `TUYA_DEVICE_KEY`
   - Verify device version (usually 3.4 or 3.5 for feeder devices)

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
