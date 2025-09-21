import { Hono } from "hono";
import { DeviceManager } from "../utils/DeviceManager";
import { parseLitterBoxStatus } from "../utils/Litter";
import { timeToMinutes } from "../utils/formatters";

/**
 * Litter box routes
 * Handles cleaning, settings, and litter box-specific status
 */
export function createLitterBoxRoutes(deviceManager: DeviceManager) {
  const app = new Hono();

  // 🚽 Litter Box Endpoints

  app.get("/:deviceId/litter-box/status", async (c) => {
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

  app.post("/:deviceId/litter-box/clean", async (c) => {
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

  app.post("/:deviceId/litter-box/settings", async (c) => {
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

  return app;
}