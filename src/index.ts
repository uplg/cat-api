import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { DeviceManager } from "./utils/DeviceManager";
import { createDeviceRoutes } from "./routes/devices";
import { createFeederRoutes } from "./routes/feeder";
import { createLitterBoxRoutes } from "./routes/litter-box";

dotenv.config();

const app = new Hono();

// 🌐 CORS Configuration
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔧 Device Manager Initialization
const deviceManager = new DeviceManager();

(async () => {
  await deviceManager.initializeDevices();
  console.log("🚀 Device manager initialized");
})();

// 🏠 Root Endpoint
app.get("/", (c) => {
  return c.json({
    message: "🐱 Cat Monitor API",
    version: "1.0.0",
    description: "Multi-device API for cat feeders and litter boxes",
    endpoints: [
      "GET /",
      "GET /devices",
      "POST /devices/connect",
      "POST /devices/disconnect",
      "GET /devices/:deviceId/status",
      "POST /devices/:deviceId/feeder/feed",
      "GET /devices/:deviceId/feeder/status",
      "GET /devices/:deviceId/feeder/meal-plan",
      "POST /devices/:deviceId/feeder/meal-plan",
      "GET /devices/:deviceId/litter-box/status",
      "POST /devices/:deviceId/litter-box/clean",
      "POST /devices/:deviceId/litter-box/settings",
      "GET /devices/:deviceId/scan-dps",
    ],
  });
});

// 📱 Route Modules
app.route("/devices", createDeviceRoutes(deviceManager));
app.route("/devices", createFeederRoutes(deviceManager));
app.route("/devices", createLitterBoxRoutes(deviceManager));

// 🚀 Server Configuration

const port = Number(process.env.PORT || 3000);
console.log(`🚀 Server started on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
