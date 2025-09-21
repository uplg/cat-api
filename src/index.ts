import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import dotenv from "dotenv";
import { DeviceManager } from "./utils/DeviceManager";
import { createDeviceRoutes } from "./routes/devices";
import { createFeederRoutes } from "./routes/feeder";
import { createLitterBoxRoutes } from "./routes/litter-box";

dotenv.config();

const app = new Elysia();

// 🌐 CORS Configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔧 Device Manager Initialization
const deviceManager = new DeviceManager();

(async () => {
  await deviceManager.initializeDevices();
  console.log("🚀 Device manager initialized");
})();

// 🏠 Root Endpoint
app.get("/", () => {
  return {
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
    ],
  };
});

// 🔗 Route Registration
app.use(createDeviceRoutes(deviceManager));
app.use(createFeederRoutes(deviceManager));
app.use(createLitterBoxRoutes(deviceManager));

// 🚀 Server Configuration
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`🚀 Server started on http://localhost:${port}`);
});
