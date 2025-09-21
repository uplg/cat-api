import { Hono } from "hono";
import { DeviceManager } from "../utils/DeviceManager";
import { parseLitterBoxStatus } from "../utils/Litter";
import { parseFeederStatus } from "../utils/Feeder";

/**
 * Device management routes
 * Handles device listing, connection, disconnection, and status
 */
export function createDeviceRoutes(deviceManager: DeviceManager) {
  const app = new Hono();

  // 📱 Device Management Endpoints

  app.get("/", (c) => {
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

  app.post("/connect", async (c) => {
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

  app.post("/disconnect", async (c) => {
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

  app.get("/:deviceId/status", async (c) => {
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

  // Debug endpoint to scan DPS range for a specific device
  app.get("/:deviceId/scan-dps", async (c) => {
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

  return app;
}