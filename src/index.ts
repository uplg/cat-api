import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi, fromTypes } from "@elysiajs/openapi";
import dotenv from "dotenv";
import { DeviceManager } from "./utils/DeviceManager";
import { createDeviceRoutes } from "./routes/devices";
import { createFeederRoutes } from "./routes/feeder";
import { createLitterBoxRoutes } from "./routes/litter-box";
import { createFountainRoutes } from "./routes/fountain";
import { createAuthRoutes, createAuthMiddleware } from "./routes/auth";

dotenv.config();

const app = new Elysia().use(
  openapi({
    documentation: {
      info: {
        title: "🐱 Cat API",
        version: "1.0.0",
        description: "Multi-device API for cat feeders and litter boxes",
      },
      tags: [
        { name: "devices", description: "Device management operations" },
        { name: "feeder", description: "Smart feeder operations" },
        { name: "litter-box", description: "Smart litter box operations" },
        { name: "fountain", description: "Smart fountain operations" },
      ],
    },
  })
);

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
    message: "🐱 Cat API",
    version: "1.0.0",
    description:
      "Multi-device API for cat feeders, litter boxes, and fountains",
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
      "GET /devices/:deviceId/fountain/status",
      "POST /devices/:deviceId/fountain/power",
      "POST /devices/:deviceId/fountain/reset/water",
      "POST /devices/:deviceId/fountain/reset/filter",
      "POST /devices/:deviceId/fountain/reset/pump",
      "POST /devices/:deviceId/fountain/uv",
      "POST /devices/:deviceId/fountain/eco-mode",
    ],
  };
});

// � Auth Routes (public)
app.use(createAuthRoutes());

// 🔒 Protected Routes with Auth Middleware
const protectedApp = new Elysia()
  .use(createAuthMiddleware())
  .use(createDeviceRoutes(deviceManager))
  .use(createFeederRoutes(deviceManager))
  .use(createLitterBoxRoutes(deviceManager))
  .use(createFountainRoutes(deviceManager));

app.use(protectedApp);

// 🚀 Server Configuration
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`🚀 Server started on http://localhost:${port}`);
});

export { app };
