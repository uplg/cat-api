# 🐱 Cat Monitor

A full-stack application for monitoring and controlling Tuya-based smart cat devices locally. Built with **Elysia** (backend) and **React** (frontend), it provides comprehensive device management for smart feeders, fountains, and automatic litter boxes.

![Cat Monitor](https://img.shields.io/badge/Made%20with-Bun-f472b6?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square)

## 🚀 Features

### 🖥️ Modern Web Interface

- **Dashboard**: Real-time overview of all connected devices
- **Device Control**: Intuitive controls for each device type
- **Meal Planning**: Visual meal schedule management for feeders
- **Multi-language**: Support for English and French (i18n)
- **Responsive Design**: Works on desktop and mobile

### 📱 Multi-Device Management

- **Device Status**: Real-time status monitoring for all connected devices
- **Connection Management**: Connect/disconnect all devices or individual devices
- **Device Types**: Support for feeders, fountains and litter boxes with type-specific endpoints

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

- [Bun](https://bun.sh) (latest version)
- [Docker](https://docker.com) & Docker Compose (for production deployment)
- One or more Tuya-compatible smart cat devices (feeders, fountains, litter boxes)
- Device credentials (ID, Key, IP) for each device

## 🛠️ Installation

### Development Setup

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
   git clone https://github.com/uplg/cat-monitor.git
   cd cat-monitor
   ```

3. **Install dependencies**

   ```bash
   # Install backend dependencies
   bun install

   # Install frontend dependencies
   cd frontend && bun install && cd ..
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

5. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file:

   ```env
   # API Server port
   PORT=3000

   # JWT Secret for authentication (generate a secure random string)
   JWT_SECRET=your-super-secret-jwt-key-change-me

   # Optional: Admin credentials
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ```

6. **Start the development server**

   ```bash
   # Start both backend and frontend in development mode
   bun run dev
   ```

   Or start them separately:

   ```bash
   # Backend only (port 3000)
   bun run dev:backend

   # Frontend only (port 5173)
   bun run dev:frontend
   ```

   - **Backend API**: `http://localhost:3000`
   - **Frontend**: `http://localhost:5173`
   - **OpenAPI Docs**: `http://localhost:3000/openapi`

---

## 🐳 Production Deployment (Docker)

The recommended way to deploy Cat Monitor in production is using Docker Compose.

### Quick Start

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

The application will be available at `http://localhost` (port 80).

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                       │
│                                                          │
│   ┌──────────────┐          ┌──────────────────────┐   │
│   │   Frontend   │   /api   │       Backend        │   │
│   │    (nginx)   │ ──────▶  │      (Elysia)        │   │
│   │    :80       │          │       :3000          │   │
│   └──────────────┘          └──────────────────────┘   │
│          │                            │                 │
└──────────┼────────────────────────────┼─────────────────┘
           │                            │
           ▼                            ▼
      Web Browser               Tuya IoT Devices
```

### Services

| Service    | Description                          | Port |
| ---------- | ------------------------------------ | ---- |
| `frontend` | React app served via nginx           | 80   |
| `backend`  | Elysia API server (internal network) | 3000 |

### Configuration

The `docker-compose.yml` mounts configuration files from the host:

- `devices.json` - Device configurations
- `meal-plans.json` - Cached meal plans
- `.env` - Environment variables

### Build Backend Only

If you only need the API server:

```bash
docker build -t cat-monitor-api .
docker run -p 3000:3000 \
  -v $(pwd)/devices.json:/app/devices.json \
  -v $(pwd)/meal-plans.json:/app/meal-plans.json \
  --env-file .env \
  cat-monitor-api
```

---

## 📚 API Documentation

### OpenAPI

Interactive API documentation is available at `http://localhost:3000/openapi`

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

### Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Backend  | Elysia, Bun, TuyAPI                     |
| Frontend | React 19, Vite, TailwindCSS, TypeScript |
| UI       | Radix UI, Lucide Icons                  |
| State    | TanStack Query (React Query)            |
| i18n     | i18next                                 |
| Routing  | React Router v7                         |
| Deploy   | Docker, nginx                           |
```

### Key Features

- **Framework**: Elysia (fast and ergonomic framework leveraging Bun)
- **Device Communication**: TuyAPI for Tuya device protocol
- **Meal Plan Encoding**: Custom Base64 binary format
- **Real-time**: Event-driven architecture with persistent connections
- **Authentication**: JWT-based auth with protected routes

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

## 🌐 Internationalization

The frontend supports multiple languages:

- 🇬🇧 English (default)
- 🇫🇷 Français

Language is auto-detected from browser settings, or can be changed manually in the UI.

To add a new language, create a new JSON file in `frontend/src/i18n/locales/` and register it in `frontend/src/i18n/index.ts`.

## Special Thanks

- [TuyAPI](https://github.com/codetheweb/tuyapi) for the device communication library
- [Tinytuya](https://github.com/jasonacox/tinytuya) for the wizard, helped a lot debugging version and discovering device capabilities

---

**Happy monitoring! 🐱🍽️💧🚽**
