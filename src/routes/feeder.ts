import { Elysia } from "elysia";
import { DeviceManager } from "../utils/DeviceManager";
import { MealPlan, MealPlanEntry } from "../utils/MealPlan";
import { parseFeederStatus } from "../utils/Feeder";

/**
 * Feeder routes
 * Handles feeding, meal plans, and feeder-specific status
 */
export function createFeederRoutes(deviceManager: DeviceManager) {
  return (
    new Elysia({ prefix: "/devices" })

      // 🍽️ Feeder Endpoints (Multi-device)

      .post("/:deviceId/feeder/feed", async ({ params, body, set }) => {
        const deviceId = params.deviceId;
        let feedBody: { portion: number } = { portion: 1 };

        if (body) {
          feedBody = body as { portion: number };
        }

        try {
          const device = deviceManager.getDevice(deviceId);
          if (!device) {
            set.status = 404;
            return {
              success: false,
              error: "Device not found",
            };
          }

          if (device.type !== "feeder") {
            set.status = 400;
            return {
              success: false,
              error: "Device is not a feeder",
            };
          }

          if (feedBody.portion > 12) {
            console.warn("portion value seems limited to 12, this may fail");
          }

          await deviceManager.sendCommand(deviceId, 3, feedBody.portion);

          return {
            success: true,
            message: `Manual feed command sent to ${device.config.name} with portion: ${feedBody.portion}`,
            device: {
              id: device.config.id,
              name: device.config.name,
            },
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })

      .get("/:deviceId/feeder/status", async ({ params, set }) => {
        const deviceId = params.deviceId;

        try {
          const device = deviceManager.getDevice(deviceId);
          if (!device) {
            set.status = 404;
            return {
              success: false,
              error: "Device not found",
            };
          }

          if (device.type !== "feeder") {
            set.status = 400;
            return {
              success: false,
              error: "Device is not a feeder",
            };
          }

          const status = await deviceManager.getDeviceStatus(deviceId);

          return {
            success: true,
            device: {
              id: device.config.id,
              name: device.config.name,
            },
            parsed_status: parseFeederStatus(status),
            raw_dps: status.dps,
            message: "Feeder status retrieved successfully",
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })

      .get("/:deviceId/feeder/meal-plan", async ({ params, set }) => {
        const deviceId = params.deviceId;

        try {
          const device = deviceManager.getDevice(deviceId);
          if (!device) {
            set.status = 404;
            return {
              success: false,
              error: "Device not found",
            };
          }

          if (device.type !== "feeder") {
            set.status = 400;
            return {
              success: false,
              error: "Device is not a feeder",
            };
          }

          // Get cached meal plan
          const cachedMealPlan = deviceManager.getMealPlan(deviceId);

          return {
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
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })

      .post("/:deviceId/feeder/meal-plan", async ({ params, body, set }) => {
        const deviceId = params.deviceId;

        try {
          const device = deviceManager.getDevice(deviceId);
          if (!device) {
            set.status = 404;
            return {
              success: false,
              error: "Device not found",
            };
          }

          if (device.type !== "feeder") {
            set.status = 400;
            return {
              success: false,
              error: "Device is not a feeder",
            };
          }

          const requestBody = body as { meal_plan: MealPlanEntry[] };
          if (!requestBody.meal_plan || !Array.isArray(requestBody.meal_plan)) {
            set.status = 400;
            return {
              success: false,
              error: "meal_plan array is required",
            };
          }

          if (requestBody.meal_plan.length > 10) {
            console.warn("This may fail as max supported are 10 meal plans");
          }

          for (let i = 0; i < requestBody.meal_plan.length; i++) {
            const entry = requestBody.meal_plan[i];
            if (!MealPlan.validate(entry)) {
              set.status = 400;
              return {
                success: false,
                error: `Invalid meal plan entry at index ${i}`,
                entry: entry,
              };
            }
          }

          const encodedPlan = MealPlan.encode(requestBody.meal_plan);

          await deviceManager.sendCommand(deviceId, 1, encodedPlan);

          // Cache the meal plan
          deviceManager.setMealPlan(deviceId, encodedPlan);

          return {
            success: true,
            message: `Meal plan updated for ${device.config.name}`,
            device: {
              id: device.config.id,
              name: device.config.name,
            },
            encoded_base64: encodedPlan,
            formatted_meal_plan: MealPlan.format(requestBody.meal_plan),
          };
        } catch (error) {
          set.status = 500;
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
  );
}
