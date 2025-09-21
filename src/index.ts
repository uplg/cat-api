import { Hono } from "hono";
import { serve } from "@hono/node-server";
import TuyAPI from "tuyapi";
import dotenv from "dotenv";
import { MealPlan } from "./MealPlan";

dotenv.config();

const app = new Hono();

const device = new TuyAPI({
  id: process.env.TUYA_DEVICE_ID!,
  key: process.env.TUYA_DEVICE_KEY!,
  ip: process.env.TUYA_DEVICE_IP!,
  port: Number(process.env.TUYA_DEVICE_PORT!),
  version: process.env.TUYA_DEVICE_VERSION!,
});

let isListening = false;
let currentMealPlan: string | null = null;

device.on("error", (error) => {
  console.log("⚠️ Device error :", error.message);
});

device.on("data", (data) => {
  console.log("📡 Device reported data:", data);

  if (data.dps && data.dps["1"]) {
    console.log("🍽️ Meal plan reported by device:", data.dps["1"]);
    currentMealPlan = data.dps["1"] as string;
  }

  if (data.dps && data.dps["3"]) {
    console.log("🐱 Feeding activity reported:", data.dps["3"]);
  }
});

device.on("connected", () => {
  console.log("✅ Device connected and listening for reports");
});

device.on("disconnected", () => {
  console.log("❌ Device disconnected");
});

app.get("/", (c) => {
  return c.json({
    message: "Feeder API for Pixi smart cat feeder",
    endpoints: [
      "POST /feed - Send manual_feed with value: 1 (DPS 3)",
      "GET /scan-dps - Scan all available DPS to find detailed data",
      "GET /feed-history - Get detailed feeding history (DPS 104)",
      "POST /meal-plan - Set new meal plan (DPS 1)",
      "POST /start-listening - Start persistent connection to listen for device reports",
      "POST /stop-listening - Stop persistent connection",
      "GET /listening-status - Check if currently listening for reports",
    ],
  });
});

app.post("/feed", async (c) => {
  try {
    await device.connect();

    console.log("📤 Sending command manual_feed...");

    await device.set({ dps: 3, set: 1 });

    device.disconnect();

    return c.json({
      success: true,
      message: "Command manual_feed sent with value: 1",
    });
  } catch (error) {
    console.error("❌ Error:", error);

    device.disconnect();

    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

app.get("/scan-dps", async (c) => {
  try {
    await device.connect();

    console.log("🔍 Scanning all DPS...");

    const dpsResults: any = {};
    const dpsToScan = [1, 2, 3, 9, 15, 101, 102, 103, 104, 105, 106, 107, 108];

    for (const dps of dpsToScan) {
      try {
        console.warn(`scanning dps ${dps}`);
        const value = await device.get({ dps });
        if (value !== undefined && value !== null) {
          dpsResults[dps] = value;
          console.log(`📊 DPS ${dps}:`, JSON.stringify(value));
        }
      } catch (e) {
        console.warn(`error dps ${dps}`, e);
      }
    }

    device.disconnect();

    return c.json({
      success: true,
      available_dps: dpsResults,
      total_found: Object.keys(dpsResults).length,
      message: "DPS scan completed",
    });
  } catch (error) {
    console.error("❌ Error scanning DPS:", error);

    device.disconnect();

    return c.json({ success: false, error: "Failed to scan DPS" }, 500);
  }
});

app.get("/feed-history", async (c) => {
  try {
    await device.connect();

    console.log("📊 Getting detailed feed history...");

    const historyData = await device.get({ dps: 104 });
    console.log("📊 Raw history data (DPS 104):", historyData);

    device.disconnect();

    let parsedData: any = null;
    if (typeof historyData === "string") {
      // NOTE: Format "R:0  C:2  T:1758445204"
      const parts = historyData.split("  ");
      parsedData = {
        raw: historyData,
        parsed: {
          // servings to give
          remaining: parts[0]?.replace("R:", "") || null,
          // servings given
          count: parts[1]?.replace("C:", "") || null,
          // time last serving
          timestamp: parts[2]?.replace("T:", "") || null,
        },
      };

      if (parsedData.parsed.timestamp) {
        const timestamp = parseInt(parsedData.parsed.timestamp);
        if (!isNaN(timestamp)) {
          const date = new Date(
            timestamp > 1000000000000 ? timestamp : timestamp * 1000
          );
          parsedData.parsed.timestamp_readable = date.toISOString();
        }
      }
    }

    return c.json({
      success: true,
      feed_history: parsedData || historyData,
      message: "Feed history retrieved and analyzed",
    });
  } catch (error) {
    console.error("❌ Error getting feed history:", error);
    return c.json({ success: false, error: "Failed to get feed history" }, 500);
  }
});

app.get("/meal-plan", (c) => {
  return c.json({
    success: true,
    meal_plan: currentMealPlan || null,
    message: currentMealPlan
      ? "Current meal plan retrieved"
      : "Meal plan can't be retrieved, update it to set it on instance",
  });
});

app.post("/meal-plan", async (c) => {
  try {
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

    const encodedMealPlan = MealPlan.encode(body.meal_plan);
    console.log("📊 Encoded meal plan:", encodedMealPlan);

    await device.connect();

    console.log("📊 Setting new meal plan...");

    await device.set({ dps: 1, set: encodedMealPlan } as any);

    device.disconnect();

    const formattedPlan = MealPlan.format(body.meal_plan);

    return c.json({
      success: true,
      meal_plan: body.meal_plan,
      formatted_display: formattedPlan,
      encoded_base64: encodedMealPlan,
      total_meals: body.meal_plan.length,
      message: "Meal plan updated successfully",
    });
  } catch (error) {
    console.error("❌ Error setting meal plan:", error);
    return c.json(
      {
        success: false,
        error: "Failed to set meal plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/start-listening", async (c) => {
  try {
    if (isListening) {
      return c.json({
        success: false,
        message: "Already listening for device reports",
      });
    }

    await device.connect();
    isListening = true;

    console.log("🎧 Started persistent listening for device reports");

    return c.json({
      success: true,
      message: "Started listening for device reports, check logs",
      status: "Device connected and listening",
    });
  } catch (error) {
    console.error("❌ Error starting listener:", error);
    isListening = false;
    return c.json(
      {
        success: false,
        error: "Failed to start listening",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/stop-listening", async (c) => {
  try {
    if (!isListening) {
      return c.json({
        success: false,
        message: "Not currently listening",
      });
    }

    device.disconnect();
    isListening = false;

    console.log("🔇 Stopped listening for device reports");

    return c.json({
      success: true,
      message: "Stopped listening for device reports",
    });
  } catch (error) {
    console.error("❌ Error stopping listener:", error);
    return c.json(
      {
        success: false,
        error: "Failed to stop listening",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.get("/listening-status", (c) => {
  return c.json({
    is_listening: isListening,
    status: isListening ? "Listening for device reports" : "Not listening",
  });
});

const port = Number(process.env.PORT || 3000);
console.log(`🚀 Server started on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
