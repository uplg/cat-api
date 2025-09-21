import { Hono } from "hono";
import { DeviceManager } from "../utils/DeviceManager";
import { MealPlan } from "../utils/MealPlan";
import { parseFeederStatus } from "../utils/Feeder";

/**
 * Feeder routes
 * Handles feeding, meal plans, and feeder-specific status
 */
export function createFeederRoutes(deviceManager: DeviceManager) {
  const app = new Hono();

  // 🍽️ Feeder Endpoints (Multi-device)

  app.post("/:deviceId/feeder/feed", async (c) => {
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

  app.get("/:deviceId/feeder/status", async (c) => {
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

  app.get("/:deviceId/feeder/meal-plan", async (c) => {
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

  app.post("/:deviceId/feeder/meal-plan", async (c) => {
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

  return app;
}