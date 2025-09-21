import { DPSObject } from "tuyapi";
import { secondsToMinSec, minutesToTime } from "./formatters";

export function parseLitterBoxStatus(status: DPSObject) {
  const rawDps = status.dps || {};

  const parsedStatus = {
    clean_delay: {
      seconds: rawDps[101] || 0,
      formatted: secondsToMinSec((rawDps[101] as number) || 0),
    },
    sleep_mode: {
      enabled: rawDps[102] || false,
      start_time_minutes: rawDps[103] || 0,
      start_time_formatted: minutesToTime((rawDps[103] as number) || 0),
      end_time_minutes: rawDps[104] || 0,
      end_time_formatted: minutesToTime((rawDps[104] as number) || 0),
    },
    sensors: {
      defecation_duration: rawDps[106] || 0,
      defecation_frequency: rawDps[105] || 0,
      fault_alarm: rawDps[114] || 0,
      // @note values: half, full
      litter_level: rawDps[112] || "unknown",
    },
    system: {
      // @note values: satnd_by, cat_inside, clumping, cleaning
      // @note: typo in stand_by is not by me but by tuya
      state: rawDps[109] || "unknown",
      cleaning_in_progress: rawDps[107] || false,
      maintenance_required: rawDps[108] || false,
    },
    settings: {
      lighting: rawDps[116] || false,
      child_lock: rawDps[110] || false,
      prompt_sound: rawDps[117] || false,
      kitten_mode: rawDps[111] || false,
      automatic_homing: rawDps[119] || false,
    },
  };

  return parsedStatus;
}
