/**
 * Fountain status parsing utilities
 * Based on DPS reference table for Smart Fountains
 */

import { DPSObject } from "tuyapi";

/**
 * Parse fountain status from raw DPS data
 * @param rawStatus - Raw DPS data from device
 * @returns Parsed fountain status object
 */
export function parseFountainStatus(status: DPSObject) {
  const rawDps = status.dps || {};

  // DPS codes for Pixi Smart Fountain
  const parsedStatus = {
    // DPS 1: Switch (power state)
    power: rawDps[1] !== undefined ? rawDps[1] : null,

    // DPS 3: Water Time (total water dispensed time)
    water_time: rawDps[3] !== undefined ? rawDps[3] : null,

    // DPS 4: Filter Life (remaining filter life)
    filter_life: rawDps[4] !== undefined ? rawDps[4] : null,

    // DPS 5: Pump Time (total pump runtime)
    pump_time: rawDps[5] !== undefined ? rawDps[5] : null,

    // DPS 6: Water Reset (reset water time counter)
    water_reset: rawDps[6] !== undefined ? rawDps[6] : null,

    // DPS 7: Filter Reset (reset filter life counter)
    filter_reset: rawDps[7] !== undefined ? rawDps[7] : null,

    // DPS 8: Pump Reset (reset pump time counter)
    pump_reset: rawDps[8] !== undefined ? rawDps[8] : null,

    // DPS 10: UV (UV light control)
    uv: rawDps[10] !== undefined ? rawDps[10] : null,

    // DPS 11: UV Runtime (total UV runtime)
    uv_runtime: rawDps[11] !== undefined ? rawDps[11] : null,

    // DPS 12: Water Level (current water level)
    water_level: rawDps[12] !== undefined ? rawDps[12] : null,

    // DPS 101: Low Water (low water warning)
    low_water: rawDps[101] !== undefined ? rawDps[101] : null,

    // DPS 102: Eco Mode (energy saving mode)
    eco_mode: rawDps[102] !== undefined ? rawDps[102] : null,

    // DPS 103: Eco Watering Status (eco mode watering status)
    eco_watering_status: rawDps[103] !== undefined ? rawDps[103] : null,

    // DPS 104: No Water (no water detected)
    no_water: rawDps[104] !== undefined ? rawDps[104] : null,

    // DPS 110: 关联IPC (Associated IPC/Camera)
    associated_camera: rawDps[110] !== undefined ? rawDps[110] : null,

    // DPS 130: Fetch MAC address
    mac_address: rawDps[130] !== undefined ? rawDps[130] : null,

    // Raw DPS for debugging
    raw: rawDps,
  };

  return parsedStatus;
}

/**
 * Detect if data is corrupted/encrypted incorrectly
 */
export function isCorruptedData(data: any): boolean {
  if (typeof data === "string") {
    // Check for non-printable characters
    const nonPrintable = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/;
    return nonPrintable.test(data);
  }
  return false;
}
