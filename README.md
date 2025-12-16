# 🐱 Cat API

A Node.js multi-device API built with Elysia for monitoring and controlling locally Tuya-based smart cat feeders and automatic litter boxes. This API provides comprehensive device management, meal plan control, litter monitoring, and real-time device scanning across multiple devices simultaneously.

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

### 💧 Smart Fountain Control

- **Real-time Monitoring**: Track water level, filter life, pump runtime, and UV operation
- **Light Control**: Turn the fountain light on/off remotely
- **Maintenance Resets**: Reset water time, filter life, and pump runtime counters
- **UV Management**: Control UV sterilization light and set runtime schedules
- **Eco Mode**: Switch between energy-saving modes for optimal efficiency
- **Alert System**: Monitor low water and no water warnings
- **Multi-Fountain Support**: Manage multiple fountains independently

### 🔍 Advanced Diagnostics

- **DPS Scanning**: Discover available device data points with configurable ranges and timeouts
- **Real-time Monitoring**: Live device data updates and event tracking
- **Device Analytics**: Comprehensive device information and capability discovery

## 📋 Prerequisites

- Bun latest (https://bun.com)
- One or more Tuya-compatible smart cat feeders/fountains/automatic litter boxes
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
     },
     {
      "name": "Pixi Smart Fountain",
      "id": "your_fountain_device_id",
      "key": "your_fountain_device_key",
      "category": "cwysj",
      "product_name": "Pixi Smart Fountain",
      "ip": "192.168.1.44",
      "version": "3.3"
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

### OpenAPI

OpenAPI documentation (interactive) is available at `http://localhost:3000/openapi`

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

- **Framework**: Elysia (fast and ergonomic framework leveraging bun)
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
