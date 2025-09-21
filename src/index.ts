import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { MealPlan } from "./utils/MealPlan";
import { timeToMinutes } from "./utils/formatters";
import { DeviceManager } from "./utils/DeviceManager";
import { parseLitterBoxStatus } from "./utils/Litter";
import { parseFeederStatus } from "./utils/Feeder";

dotenv.config();

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);
const deviceManager = new DeviceManager();

(async () => {
  await deviceManager.initializeDevices();

  console.log("🚀 Device manager initialized");
})();

app.get("/", (c) => {
  return c.json({
    message: "🐱 Cat Monitor API",
    version: "2.0.0",
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

// 📱 Device Management Endpoints

app.get("/devices", (c) => {
  const devices = deviceManager.getAllDevices().map((device) => ({
    id: device.config.id,
    name: device.config.name,
    type: device.type,
    product_name: device.config.product_name,
    model: device.config.model,
    ip: device.config.ip,
    version: device.config.version,
    connected: device.isConnected,
    last_data: device.lastData,
  }));

  return c.json({
    success: true,
    devices,
    total: devices.length,
    message: "Devices list retrieved successfully",
  });
});

app.post("/devices/connect", async (c) => {
  try {
    await deviceManager.connectAllDevices();
    return c.json({
      success: true,
      message: "All devices connection initiated",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/devices/disconnect", async (c) => {
  try {
    deviceManager.disconnectAllDevices();
    return c.json({
      success: true,
      message: "All devices disconnected",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.get("/devices/:deviceId/status", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    const status = await deviceManager.getDeviceStatus(deviceId);

    return c.json({
      success: true,
      device: {
        id: device.config.id,
        name: device.config.name,
        type: device.type,
        connected: device.isConnected,
      },
      parsed_status:
        device.type === "litter-box"
          ? parseLitterBoxStatus(status)
          : device.type === "feeder"
          ? parseFeederStatus(status)
          : null,
      raw_status: status.dps,
      message: "Device status retrieved successfully",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// 🍽️ Feeder Endpoints (Multi-device)

app.post("/devices/:deviceId/feeder/feed", async (c) => {
  const deviceId = c.req.param("deviceId");
  let body: { portion: number } = { portion: 1 };

  try {
    body = await c.req.json();
  } catch (error) {}

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "feeder") {
      return c.json(
        {
          success: false,
          error: "Device is not a feeder",
        },
        400
      );
    }

    if (body.portion > 12) {
      console.warn("portion value seems limited to 12, this may fail");
    }

    await deviceManager.sendCommand(deviceId, 3, body.portion);

    return c.json({
      success: true,
      message: `Manual feed command sent to ${device.config.name} with portion: ${body.portion}`,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.get("/devices/:deviceId/feeder/status", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "feeder") {
      return c.json(
        {
          success: false,
          error: "Device is not a feeder",
        },
        400
      );
    }

    const status = await deviceManager.getDeviceStatus(deviceId);

    return c.json({
      success: true,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
      parsed_status: parseFeederStatus(status),
      raw_dps: status.dps,
      message: "Feeder status retrieved successfully",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.get("/devices/:deviceId/feeder/meal-plan", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "feeder") {
      return c.json(
        {
          success: false,
          error: "Device is not a feeder",
        },
        400
      );
    }

    // Get cached meal plan
    const cachedMealPlan = deviceManager.getMealPlan(deviceId);

    return c.json({
      success: true,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
      decoded: cachedMealPlan ? MealPlan.decode(cachedMealPlan) : null,
      meal_plan: cachedMealPlan,
      message: cachedMealPlan
        ? "Current meal plan retrieved from cache"
        : "Meal plan not available. Update it first to cache it, or connect to get real-time updates.",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/devices/:deviceId/feeder/meal-plan", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "feeder") {
      return c.json(
        {
          success: false,
          error: "Device is not a feeder",
        },
        400
      );
    }

    const body = await c.req.json();
    if (!body.meal_plan || !Array.isArray(body.meal_plan)) {
      return c.json(
        {
          success: false,
          error: "meal_plan array is required",
        },
        400
      );
    }

    if (body.meal_plan.length > 10) {
      console.warn("This may fail as max supported are 10 meal plans");
    }

    for (let i = 0; i < body.meal_plan.length; i++) {
      const entry = body.meal_plan[i];
      if (!MealPlan.validate(entry)) {
        return c.json(
          {
            success: false,
            error: `Invalid meal plan entry at index ${i}`,
            entry: entry,
          },
          400
        );
      }
    }

    const encodedPlan = MealPlan.encode(body.meal_plan);

    await deviceManager.sendCommand(deviceId, 1, encodedPlan);

    // Cache the meal plan
    deviceManager.setMealPlan(deviceId, encodedPlan);

    return c.json({
      success: true,
      message: `Meal plan updated for ${device.config.name}`,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
      encoded_base64: encodedPlan,
      formatted_meal_plan: MealPlan.format(body.meal_plan),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// 🚽 Litter Box Endpoints

app.get("/devices/:deviceId/litter-box/status", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "litter-box") {
      return c.json(
        {
          success: false,
          error: "Device is not a litter box",
        },
        400
      );
    }

    const status = await deviceManager.getDeviceStatus(deviceId);
    const parsedStatus = parseLitterBoxStatus(status);

    return c.json({
      success: true,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
      parsed_status: parsedStatus,
      message: "Litter box status retrieved successfully",
      raw_dps: status.dps,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/devices/:deviceId/litter-box/clean", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "litter-box") {
      return c.json(
        {
          success: false,
          error: "Device is not a litter box",
        },
        400
      );
    }

    await deviceManager.sendCommand(deviceId, 107, true);

    return c.json({
      success: true,
      message: `Manual cleaning cycle initiated for ${device.config.name}`,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/devices/:deviceId/litter-box/settings", async (c) => {
  const deviceId = c.req.param("deviceId");

  try {
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      return c.json(
        {
          success: false,
          error: "Device not found",
        },
        404
      );
    }

    if (device.type !== "litter-box") {
      return c.json(
        {
          success: false,
          error: "Device is not a litter box",
        },
        400
      );
    }

    const body = await c.req.json();
    const updates: Record<string, string | number | boolean> = {};

    // Process settings updates with validation
    if (body.clean_delay !== undefined) {
      if (
        typeof body.clean_delay !== "number" ||
        body.clean_delay < 0 ||
        body.clean_delay > 1800
      ) {
        return c.json(
          {
            success: false,
            error: "clean_delay must be between 0 and 1800 seconds",
          },
          400
        );
      }
      updates["101"] = body.clean_delay;
    }

    if (body.sleep_mode?.enabled !== undefined) {
      updates["102"] = body.sleep_mode.enabled;
    }

    if (body.sleep_mode?.start_time !== undefined) {
      const minutes = timeToMinutes(body.sleep_mode.start_time);
      if (minutes === -1) {
        return c.json(
          {
            success: false,
            error: "Invalid start_time format. Use HH:MM",
          },
          400
        );
      }
      updates["103"] = minutes;
    }

    if (body.sleep_mode?.end_time !== undefined) {
      const minutes = timeToMinutes(body.sleep_mode.end_time);
      if (minutes === -1) {
        return c.json(
          {
            success: false,
            error: "Invalid end_time format. Use HH:MM",
          },
          400
        );
      }
      updates["104"] = minutes;
    }

    // Process preferences
    if (body.preferences?.child_lock !== undefined) {
      updates["110"] = body.preferences.child_lock;
    }
    if (body.preferences?.kitten_mode !== undefined) {
      updates["111"] = body.preferences.kitten_mode;
    }
    if (body.preferences?.lighting !== undefined) {
      updates["116"] = body.preferences.lighting;
    }
    if (body.preferences?.prompt_sound !== undefined) {
      updates["117"] = body.preferences.prompt_sound;
    }
    if (body.preferences?.automatic_homing !== undefined) {
      updates["119"] = body.preferences.automatic_homing;
    }

    // Process one-time actions
    if (body.actions?.reset_sand_level) {
      updates["113"] = true;
    }
    if (body.actions?.reset_factory_settings) {
      updates["115"] = true;
    }

    if (Object.keys(updates).length === 0) {
      return c.json(
        {
          success: false,
          error: "No valid settings provided",
        },
        400
      );
    }

    // Apply updates
    for (const [dps, value] of Object.entries(updates)) {
      await deviceManager.sendCommand(
        deviceId,
        parseInt(dps),
        value as string | number | boolean,
        false
      );
      console.log(`✅ Updated DPS ${dps} to:`, value);
    }

    await deviceManager.disconnectDevice(deviceId);

    return c.json({
      success: true,
      message: `Settings updated for ${device.config.name}`,
      device: {
        id: device.config.id,
        name: device.config.name,
      },
      updated_settings: Object.keys(updates).length,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// @note: debug endpoint to scan DPS range for a specific device
app.get("/devices/:deviceId/scan-dps", async (c) => {
  const deviceId = c.req.param("deviceId");
  const device = deviceManager.getDevice(deviceId);
  if (!device) {
    return c.json(
      {
        success: false,
        error: "Device not found",
      },
      404
    );
  }

  const query = c.req.query();
  const startDps = parseInt(query.start || "1");
  const endDps = parseInt(query.end || "255");
  const timeout = parseInt(query.timeout || "3000");

  try {
    await deviceManager.connectDevice(deviceId);

    console.log(
      `🔍 Scanning DPS range ${startDps}-${endDps} (timeout: ${timeout}ms per DPS)...`
    );

    const dpsResults: any = {};
    const errors: any = {};
    let scannedCount = 0;
    let foundCount = 0;

    for (let dps = startDps; dps <= endDps; dps++) {
      scannedCount++;
      try {
        console.log(
          `🔍 Scanning DPS ${dps}... (${scannedCount}/${endDps - startDps + 1})`
        );

        // Add timeout to prevent hanging on non-existent DPS
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout)
        );

        const value = await Promise.race([
          device.api.get({ dps }),
          timeoutPromise,
        ]);

        if (value !== undefined && value !== null) {
          dpsResults[dps] = {
            value: value,
            type: typeof value,
            length: typeof value === "string" ? value.length : undefined,
          };
          foundCount++;
          console.log(
            `✅ DPS ${dps}:`,
            JSON.stringify(value).substring(0, 100) +
              (JSON.stringify(value).length > 100 ? "..." : "")
          );
        }
      } catch (e) {
        errors[dps] = e instanceof Error ? e.message : "Unknown error";
        if (e instanceof Error && !e.message.includes("Timeout")) {
          console.warn(`❌ DPS ${dps}:`, e.message);
        }
      }
    }

    await deviceManager.disconnectDevice(deviceId);

    return c.json({
      success: true,
      scan_range: `${startDps}-${endDps}`,
      scanned_count: scannedCount,
      found_count: foundCount,
      available_dps: dpsResults,
      errors_count: Object.keys(errors).length,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      message: `DPS scan completed: ${foundCount} active DPS found out of ${scannedCount} scanned`,
    });
  } catch (error) {
    console.error("❌ Error scanning DPS:", error);

    await deviceManager.disconnectDevice(deviceId);

    return c.json({ success: false, error: "Failed to scan DPS" }, 500);
  }
});

const port = Number(process.env.PORT || 3000);
console.log(`🚀 Server started on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
