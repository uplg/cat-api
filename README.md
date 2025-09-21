# 🐱 Cat API

A Node.js API built with Hono for monitoring and controlling locally Tuya-based smart cat feeders. This API provides comprehensive meal plan management, feeding controls, and real-time device monitoring.

## 🚀 Features

- **Meal Plan Management**: Create, read, and update feeding schedules with Base64 encoding/decoding
- **Manual Feeding**: Trigger immediate feeding sessions
- **Real-time Monitoring**: Listen for device reports and feeding activities
- **Device Scanning**: Discover available device data points (DPS)
- **Feed History**: Retrieve detailed feeding logs (only last one, you need to save it somewhere to get an history like in the SmartLife app)

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

| Method | Endpoint | Description            |
| ------ | -------- | ---------------------- |
| `POST` | `/feed`  | Trigger manual feeding |

**Example:**

```bash
curl -X POST http://localhost:3000/feed
```

### 📊 Device Information

| Method | Endpoint        | Description                                              |
| ------ | --------------- | -------------------------------------------------------- |
| `GET`  | `/scan-dps`     | Scan all available device data points (may need changes) |
| `GET`  | `/feed-history` | Get detailed feeding history                             |

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
curl http://localhost:3000/scan-dps
```

## 🔍 Troubleshooting

### Common Issues

1. **Device Connection Failed**

   - Verify device IP address and network connectivity
   - Check if device is powered on and connected to WiFi
   - Ensure firewall allows connections on the specified port

2. **Invalid Credentials**

   - Double-check `TUYA_DEVICE_ID` and `TUYA_DEVICE_KEY`
   - Verify device version (usually 3.4 or 3.5 for feeder devices)

3. **Meal Plan Not Reading**
   - The device may not have a meal plan retrieved yet, DPS don't expose the raw data so we need to update (and then it's saved on instance)
   - Try setting a meal plan first using the POST endpoint

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
