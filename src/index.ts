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

device.on("error", (error) => {
  console.log("⚠️ Device error :", error.message);
});

app.get("/", (c) => {
  return c.json({
    message: "Feeder API for Pixi smart cat feeder",
    endpoints: [
      "POST /feed - Send manual_feed with value: 1 (DPS 3)",
      "GET /scan-dps - Scan all available DPS to find detailed data",
      "GET /feed-history - Get detailed feeding history (DPS 104)",
      "GET /meal-plan - Get current meal plan (DPS 101)",
      "POST /meal-plan - Set new meal plan (DPS 101)",
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

// @todo: not working atm
app.get("/meal-plan", async (c) => {
  try {
    await device.connect();

    console.log("Testing DPS 1 specifically for meal plan...");

    let mealPlanData;
    try {
      mealPlanData = await device.get({ dps: 1 });
      console.log("DPS 1 raw value:", mealPlanData);
      console.log("DPS 1 type:", typeof mealPlanData);
      console.log("DPS 1 length:", mealPlanData?.length);
    } catch (error) {
      console.error("Error getting DPS 1:", error);
      device.disconnect();
      return c.json(
        {
          success: false,
          error: "Cannot access DPS 1",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }

    device.disconnect();

    const isValidBase64 =
      typeof mealPlanData === "string" &&
      mealPlanData.length > 0 &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(mealPlanData);

    if (!mealPlanData || !isValidBase64) {
      return c.json(
        {
          success: false,
          error: "DPS 1 does not contain valid Base64 meal plan data",
          dps_1_value: mealPlanData,
          data_type: typeof mealPlanData,
          is_valid_base64: isValidBase64,
          debug_info:
            "DPS 1 should contain Base64 encoded meal plan according to device spec",
        },
        400
      );
    }

    try {
      const decodedMealPlan = MealPlan.decode(mealPlanData);
      const formattedPlan = MealPlan.format(decodedMealPlan);

      return c.json({
        success: true,
        original_base64: mealPlanData,
        decoded_meal_plan: decodedMealPlan,
        formatted_display: formattedPlan,
        total_meals: decodedMealPlan.length,
        message: "Meal plan retrieved successfully",
      });
    } catch (decodeError) {
      return c.json(
        {
          success: false,
          error: "Failed to decode meal plan from DPS 1",
          dps_1_value: mealPlanData,
          decode_error:
            decodeError instanceof Error
              ? decodeError.message
              : "Unknown decode error",
        },
        500
      );
    }
  } catch (error) {
    console.error("❌ Error getting meal plan:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get meal plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
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

const port = Number(process.env.PORT || 3000);
console.log(`🚀 Server started on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
