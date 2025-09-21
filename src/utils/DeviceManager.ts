import TuyAPI, { DPSObject } from "tuyapi";
import fs from "fs";
import path from "path";

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
  lastData: Record<string, any>;
  type: "feeder" | "litter-box" | "unknown";
}

export class DeviceManager {
  private devices: Map<string, DeviceInstance> = new Map();
  private configs: DeviceConfig[] = [];
  private mealPlanCache: Map<string, string> = new Map(); // deviceId -> encoded meal plan

  constructor() {
    this.loadDevicesConfig();
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

  private determineDeviceType(
    config: DeviceConfig
  ): "feeder" | "litter-box" | "unknown" {
    const productName = config.product_name.toLowerCase();
    const category = config.category.toLowerCase();

    if (productName.includes("feeder") || category === "cwwsq") {
      return "feeder";
    } else if (productName.includes("litter") || category === "msp") {
      return "litter-box";
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
          lastData: {},
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
          console.log(`📡 Data from ${config.name}:`, data);
          deviceInstance.lastData = { ...deviceInstance.lastData, ...data };

          this.handleDeviceData(deviceInstance, data);
        });

        // Setup data listener for this device
        this.setupDataListener(deviceInstance);

        this.devices.set(config.id, deviceInstance);
        console.log(`📱 Registered device: ${config.name} (${deviceType})`);
      } catch (error) {
        console.error(`❌ Failed to initialize device ${config.name}:`, error);
      }
    }
  }

  private handleDeviceData(device: DeviceInstance, data: any): void {
    if (!data.dps) return;

    switch (device.type) {
      case "feeder":
        if (data.dps["1"]) {
          console.log(
            `🍽️ Meal plan reported by ${device.config.name}:`,
            data.dps["1"]
          );
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

    for (const [deviceId, device] of this.devices) {
      try {
        await this.connectDevice(deviceId);
      } catch (error) {
        console.error(`Failed to connect ${device.config.name}:`, error);
      }
    }
  }

  disconnectAllDevices(): void {
    console.log("🔌 Disconnecting all devices...");

    for (const [deviceId, device] of this.devices) {
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
    value: any,
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
    console.log(`📝 Cached meal plan for device ${deviceId}`);
  }

  clearMealPlan(deviceId: string): void {
    this.mealPlanCache.delete(deviceId);
    console.log(`🗑️ Cleared meal plan cache for device ${deviceId}`);
  }

  // Setup data listener for meal plan updates
  private setupDataListener(device: DeviceInstance): void {
    device.api.on("data", (data: any) => {
      console.log(`📊 Device ${device.config.id} data:`, data);

      // If DPS 1 (meal plan) is updated, cache it
      if (data.dps && data.dps["1"]) {
        this.setMealPlan(device.config.id, data.dps["1"]);
      }
    });
  }
}
