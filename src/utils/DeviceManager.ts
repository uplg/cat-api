import TuyAPI, { DPSObject } from "tuyapi";
import fs from "node:fs";
import path from "node:path";
import { parseFeederStatus } from "./Feeder";
import { parseLitterBoxStatus } from "./Litter";
import { parseFountainStatus, isCorruptedData } from "./Fountain";

export interface DeviceConfig {
  name: string;
  id: string;
  key: string;
  category: string;
  product_name: string;
  port?: number;
  model: string;
  ip: string;
  version: string;
}

export interface DeviceInstance {
  config: DeviceConfig;
  api: TuyAPI;
  isConnected: boolean;
  lastData: DPSObject;
  parsedData:
    | ReturnType<typeof parseFeederStatus>
    | ReturnType<typeof parseLitterBoxStatus>
    | ReturnType<typeof parseFountainStatus>
    | {};
  type: "feeder" | "litter-box" | "fountain" | "unknown";
}

interface MealPlanCache {
  [deviceId: string]: string;
}

const MEAL_PLAN_CACHE_FILE = "meal-plans.json";

export class DeviceManager {
  private devices: Map<string, DeviceInstance> = new Map();
  private configs: DeviceConfig[] = [];
  private mealPlanCache: Map<string, string> = new Map(); // deviceId -> encoded meal plan
  private mealPlanCachePath: string;

  constructor() {
    this.mealPlanCachePath = path.join(process.cwd(), MEAL_PLAN_CACHE_FILE);
    this.loadDevicesConfig();
    this.loadMealPlanCache();
  }

  private loadDevicesConfig(): void {
    try {
      const configPath = path.join(process.cwd(), "devices.json");
      const configData = fs.readFileSync(configPath, "utf8");
      this.configs = JSON.parse(configData);
      console.log(`📱 Loaded ${this.configs.length} device configurations`);
    } catch (error) {
      console.error("❌ Failed to load devices configuration:", error);
      this.configs = [];
    }
  }

  private loadMealPlanCache(): void {
    try {
      if (fs.existsSync(this.mealPlanCachePath)) {
        const cacheData = fs.readFileSync(this.mealPlanCachePath, "utf8");
        const cache: MealPlanCache = JSON.parse(cacheData);

        for (const [deviceId, mealPlan] of Object.entries(cache)) {
          this.mealPlanCache.set(deviceId, mealPlan);
        }

        console.log(
          `📋 Loaded ${this.mealPlanCache.size} cached meal plans from disk`
        );
      } else {
        console.log(`📋 No meal plan cache found, starting fresh`);
      }
    } catch (error) {
      console.error("⚠️ Failed to load meal plan cache:", error);
    }
  }

  private saveMealPlanCache(): void {
    try {
      const cache: MealPlanCache = {};

      for (const [deviceId, mealPlan] of this.mealPlanCache.entries()) {
        cache[deviceId] = mealPlan;
      }

      fs.writeFileSync(
        this.mealPlanCachePath,
        JSON.stringify(cache, null, 2),
        "utf8"
      );
      console.log(`💾 Saved ${this.mealPlanCache.size} meal plans to disk`);
    } catch (error) {
      console.error("❌ Failed to save meal plan cache:", error);
    }
  }

  private determineDeviceType(
    config: DeviceConfig
  ): "feeder" | "litter-box" | "fountain" | "unknown" {
    const productName = config.product_name.toLowerCase();
    const category = config.category.toLowerCase();

    if (productName.includes("feeder") || category === "cwwsq") {
      return "feeder";
    } else if (productName.includes("litter") || category === "msp") {
      return "litter-box";
    } else if (productName.includes("fountain") || category === "cwysj") {
      return "fountain";
    }

    return "unknown";
  }

  async initializeDevices(): Promise<void> {
    console.log("🔄 Initializing devices...");

    for (const config of this.configs) {
      try {
        const api = new TuyAPI({
          id: config.id,
          key: config.key,
          ip: config.ip,
          port: config.port ?? 6668,
          version: config.version,
        });

        const deviceType = this.determineDeviceType(config);

        const deviceInstance: DeviceInstance = {
          config,
          api,
          isConnected: false,
          lastData: { dps: {} },
          parsedData: {},
          type: deviceType,
        };

        api.on("connected", () => {
          console.log(`✅ Device connected: ${config.name} (${config.id})`);
          deviceInstance.isConnected = true;
        });

        api.on("disconnected", () => {
          console.log(`❌ Device disconnected: ${config.name} (${config.id})`);
          deviceInstance.isConnected = false;
        });

        api.on("error", (error) => {
          console.log(`⚠️ Device error for ${config.name}:`, error.message);
        });

        api.on("data", (data) => {
          // Check for corrupted data
          if (data && typeof data === "object") {
            const dataStr = JSON.stringify(data);
            if (isCorruptedData(dataStr)) {
              console.error(
                `⚠️ Corrupted data detected from ${config.name}. This usually indicates:
                - Incorrect device key in devices.json
                - Wrong protocol version
                - Device communication issues`
              );
              console.log(`Raw corrupted data:`, data);
              return;
            }
          }

          console.log(`📡 Data from ${config.name}:`, data);
          deviceInstance.lastData = { ...deviceInstance.lastData, ...data };

          if (deviceInstance.type === "feeder") {
            deviceInstance.parsedData = parseFeederStatus(
              deviceInstance.lastData
            );
          } else if (deviceInstance.type === "litter-box") {
            deviceInstance.parsedData = parseLitterBoxStatus(
              deviceInstance.lastData
            );
          } else if (deviceInstance.type === "fountain") {
            deviceInstance.parsedData = parseFountainStatus(
              deviceInstance.lastData
            );
          }

          this.handleDeviceData(deviceInstance, data);
        });

        this.devices.set(config.id, deviceInstance);
        console.log(`📱 Registered device: ${config.name} (${deviceType})`);
      } catch (error) {
        console.error(`❌ Failed to initialize device ${config.name}:`, error);
      }
    }
  }

  private handleDeviceData(device: DeviceInstance, data: DPSObject): void {
    if (!data.dps) return;

    switch (device.type) {
      case "feeder":
        if (data.dps["1"]) {
          console.log(
            `🍽️ Meal plan reported by ${device.config.name}:`,
            data.dps["1"]
          );
          // If DPS 1 (meal plan) is updated, cache it
          this.setMealPlan(device.config.id, data.dps["1"] as string);
        }
        if (data.dps["3"]) {
          console.log(
            `🐱 Feeding activity from ${device.config.name}:`,
            data.dps["3"]
          );
        }
        break;

      case "litter-box":
        if (data.dps["105"]) {
          console.log(
            `🚽 Litter box activity from ${device.config.name}:`,
            data.dps["105"]
          );
        }
        break;

      case "fountain":
        if (data.dps["1"]) {
          console.log(
            `💧 Fountain power state from ${device.config.name}:`,
            data.dps["1"]
          );
        }
        if (data.dps["101"]) {
          console.log(
            `💧 Water level from ${device.config.name}:`,
            data.dps["101"]
          );
        }
        break;
    }
  }

  async connectDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    try {
      await device.api.connect();
      return true;
    } catch (error) {
      console.error(`Failed to connect device ${deviceId}:`, error);
      return false;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    device.api.disconnect();
  }

  async connectAllDevices(): Promise<void> {
    console.log("🔗 Connecting to all devices...");

    for (const [deviceId, device] of Array.from(this.devices)) {
      try {
        await this.connectDevice(deviceId);
      } catch (error) {
        console.error(`Failed to connect ${device.config.name}:`, error);
      }
    }
  }

  disconnectAllDevices(): void {
    console.log("🔌 Disconnecting all devices...");

    for (const [deviceId, device] of Array.from(this.devices)) {
      try {
        device.api.disconnect();
      } catch (error) {
        console.error(`Failed to disconnect ${device.config.name}:`, error);
      }
    }
  }

  getDevice(deviceId: string): DeviceInstance | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): DeviceInstance[] {
    return Array.from(this.devices.values());
  }

  getDevicesByType(type: "feeder" | "litter-box"): DeviceInstance[] {
    return this.getAllDevices().filter((device) => device.type === type);
  }

  async sendCommand(
    deviceId: string,
    dps: number,
    value: string | number | boolean,
    disconnectAfter: boolean = true
  ): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (!device.isConnected) {
      await this.connectDevice(deviceId);
    }

    await device.api.set({ dps, set: value });

    if (disconnectAfter) {
      await this.disconnectDevice(deviceId);
    }
  }

  async getDeviceStatus(deviceId: string): Promise<DPSObject> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (!device.isConnected) {
      await this.connectDevice(deviceId);
    }

    const response = (await device.api.get({ schema: true })) as DPSObject;

    device.api.disconnect();

    return response;
  }

  // Meal Plan Cache Management
  getMealPlan(deviceId: string): string | null {
    return this.mealPlanCache.get(deviceId) || null;
  }

  setMealPlan(deviceId: string, encodedMealPlan: string): void {
    this.mealPlanCache.set(deviceId, encodedMealPlan);
    this.saveMealPlanCache(); // Persist to disk
    console.log(`📝 Cached meal plan for device ${deviceId}`);
  }

  clearMealPlan(deviceId: string): void {
    this.mealPlanCache.delete(deviceId);
    this.saveMealPlanCache(); // Persist to disk
    console.log(`🗑️ Cleared meal plan cache for device ${deviceId}`);
  }
}
