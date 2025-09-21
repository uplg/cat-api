import { Hono } from "hono";
import { serve } from "@hono/node-server";
import TuyAPI from "tuyapi";
import dotenv from "dotenv";
import { MealPlan } from "./utils/MealPlan";
import {
  minutesToTime,
  secondsToMinSec,
  timeToMinutes,
} from "./utils/formatters";

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
      "GET /feed-history - Get detailed feeding history (DPS 104)",
      "POST /meal-plan - Set new meal plan (DPS 1)",
      "POST /start-listening - Start persistent connection to listen for device reports",
      "POST /stop-listening - Stop persistent connection",
      "GET /listening-status - Check if currently listening for reports",
      "GET /scan-dps - Scan DPS range (params: ?start=1&end=255&timeout=100)",
      "GET /litter-box/status - Get complete litter box status and sensors",
      "POST /litter-box/clean - Trigger manual cleaning cycle",
      "POST /litter-box/settings - Update litter box settings (auto-clean, lighting, etc.)",
    ],
  });
});

app.post("/feed", async (c) => {
  let body: { portion: number } = { portion: 1 };
  try {
    body = await c.req.json();
  } catch (error) {}
  try {
    await device.connect();

    console.log("📤 Sending command manual_feed...");

    if (body.portion > 12) {
      console.warn("portion value seems limited to 12, this may fail");
    }

    await device.set({ dps: 3, set: body.portion });

    device.disconnect();

    return c.json({
      success: true,
      message: `Command manual_feed sent with value: ${body.portion}`,
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

// @note give only the last serving data, history data is saved by tuya cloud
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

// @note: retrieve from instance currentMealPlan, need update before usable
app.get("/meal-plan", (c) => {
  return c.json({
    success: true,
    meal_plan: currentMealPlan || null,
    message: currentMealPlan
      ? "Current meal plan retrieved"
      : "Meal plan can't be retrieved, update it to set it on instance",
  });
});

// Set a meal plan
/* Sample request : (max 10 "plans")
curl -X POST http://localhost:3000/meal-plan -H "Content-Type: application/json" -d '{"meal_plan":[{"days_of_week":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"time":"10:00","portion":2,"status":"Enabled"}]}'
*/
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

// Cat Litter Box endpoints
app.get("/litter-box/status", async (c) => {
  try {
    await device.connect();

    console.log("📊 Getting litter box status...");

    // Get all litter box related DPS
    const litterBoxDps = [
      101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115,
      116, 117, 118, 119,
    ];
    const status: Record<number, string | number | boolean> = {};

    for (const dps of litterBoxDps) {
      try {
        const value = await device.get({ dps });
        if (
          value !== undefined &&
          value !== null &&
          typeof value !== "object"
        ) {
          status[dps] = value;
        }
      } catch (e) {
        console.warn(`Could not read DPS ${dps}`);
      }
    }

    device.disconnect();

    // Parse and format the status
    const parsedStatus = {
      clean_delay: {
        seconds: status[101] || 0,
        formatted: secondsToMinSec((status[101] as number) || 0),
      },
      sleep_mode: {
        enabled: status[102] || false,
        start_time_minutes: status[103] || 0,
        start_time_formatted: minutesToTime((status[103] as number) || 0),
        end_time_minutes: status[104] || 0,
        end_time_formatted: minutesToTime((status[104] as number) || 0),
      },
      sensors: {
        defecation_duration: status[106] || 0,
        defecation_frequency: status[105] || 0,
        fault_alarm: status[114] || 0,
        // @note values: half, full
        litter_level: status[112] || "unknown",
      },
      system: {
        // @note values: satnd_by, cat_inside, clumping, cleaning
        // @note: typo in stand_by is not by me but by tuya
        state: status[109] || "unknown",
        cleaning_in_progress: status[107] || false,
        maintenance_required: status[108] || false,
      },
      settings: {
        lighting: status[116] || false,
        child_lock: status[110] || false,
        prompt_sound: status[117] || false,
        kitten_mode: status[111] || false,
        automatic_homing: status[119] || false,
      },
    };

    return c.json({
      success: true,
      parsed_status: parsedStatus,
      raw_dps: status,
      message: "Litter box status retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error getting litter box status:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get litter box status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/litter-box/clean", async (c) => {
  try {
    await device.connect();

    console.log("🧹 Triggering manual cleaning cycle...");

    await device.set({ dps: 107, set: true });

    device.disconnect();

    return c.json({
      success: true,
      message: "Manual cleaning cycle triggered",
      action: "Cleaning started",
    });
  } catch (error) {
    console.error("❌ Error triggering cleaning:", error);
    return c.json(
      {
        success: false,
        error: "Failed to trigger cleaning cycle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

app.post("/litter-box/update", async (c) => {
  try {
    const body = await c.req.json();
    await device.connect();

    const updates: any = {};
    let updateCount = 0;

    // Clean delay (in seconds)
    if (body.clean_delay !== undefined) {
      const seconds = parseInt(body.clean_delay);
      if (seconds >= 0 && seconds <= 1800) {
        // Max 30 minutes
        updates[101] = seconds;
        updateCount++;
      } else {
        return c.json(
          {
            success: false,
            error: "Clean delay must be between 0 and 1800 seconds",
          },
          400
        );
      }
    }

    // Sleep mode
    if (body.sleep_mode !== undefined) {
      if (typeof body.sleep_mode.enabled === "boolean") {
        updates[102] = body.sleep_mode.enabled;
        updateCount++;
      }

      if (body.sleep_mode.start_time !== undefined) {
        const startMinutes = timeToMinutes(body.sleep_mode.start_time);
        if (startMinutes >= 0 && startMinutes < 1440) {
          updates[103] = startMinutes;
          updateCount++;
        } else {
          return c.json(
            { success: false, error: "Invalid start time format. Use HH:MM" },
            400
          );
        }
      }

      if (body.sleep_mode.end_time !== undefined) {
        const endMinutes = timeToMinutes(body.sleep_mode.end_time);
        if (endMinutes >= 0 && endMinutes < 1440) {
          updates[104] = endMinutes;
          updateCount++;
        } else {
          return c.json(
            { success: false, error: "Invalid end time format. Use HH:MM" },
            400
          );
        }
      }
    }

    // Preferences
    if (body.preferences !== undefined) {
      const prefs = body.preferences;

      if (typeof prefs.lighting === "boolean") {
        updates[116] = prefs.lighting;
        updateCount++;
      }

      if (typeof prefs.child_lock === "boolean") {
        updates[110] = prefs.child_lock;
        updateCount++;
      }

      if (typeof prefs.prompt_sound === "boolean") {
        updates[117] = prefs.prompt_sound;
        updateCount++;
      }

      if (typeof prefs.kitten_mode === "boolean") {
        updates[111] = prefs.kitten_mode;
        updateCount++;
      }

      if (typeof prefs.automatic_homing === "boolean") {
        updates[119] = prefs.automatic_homing;
        updateCount++;
      }
    }

    // Actions (one-time triggers)
    if (body.actions !== undefined) {
      if (body.actions.reset_sand_level === true) {
        updates[113] = true;
        updateCount++;
      }

      if (body.actions.reset_factory_settings === true) {
        updates[115] = true;
        updateCount++;
      }
    }

    if (updateCount === 0) {
      return c.json(
        { success: false, error: "No valid settings provided to update" },
        400
      );
    }

    // Apply updates
    for (const [dps, value] of Object.entries(updates)) {
      await device.set({
        dps: parseInt(dps),
        set: value as string | number | boolean,
      });
      console.log(`✅ Updated DPS ${dps} to:`, value);
    }

    return c.json({
      success: true,
      updated_settings: updates,
      update_count: updateCount,
      message: `Successfully updated ${updateCount} setting(s)`,
    });
  } catch (error) {
    console.error("❌ Error updating litter box settings:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update litter box settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// @note: debug
app.get("/scan-dps", async (c) => {
  const query = c.req.query();
  const startDps = parseInt(query.start || "1");
  const endDps = parseInt(query.end || "255");
  const timeout = parseInt(query.timeout || "3000");

  try {
    await device.connect();

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

        const value = await Promise.race([device.get({ dps }), timeoutPromise]);

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

    device.disconnect();

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

    device.disconnect();

    return c.json({ success: false, error: "Failed to scan DPS" }, 500);
  }
});

const port = Number(process.env.PORT || 3000);
console.log(`🚀 Server started on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
