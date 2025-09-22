import { t } from "elysia";

// 🍽️ Feeder Schemas
export const FeedRequestSchema = t.Object({
  portion: t.Optional(
    t.Number({
      minimum: 1,
      maximum: 10,
      description: "Number of portions to feed (1-10)",
      default: 1,
    })
  ),
});

export const MealPlanSchema = t.Object({
  meal_plan: t.Array(
    t.Object({
      days_of_week: t.Array(t.String(), {
        description: "Days of the week for this meal",
        default: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      }),
      time: t.String({
        pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
        description: "Time in HH:MM format (24h)",
        default: "08:00",
      }),
      portion: t.Number({
        minimum: 1,
        maximum: 10,
        description: "Number of portions for this meal",
        default: 1,
      }),
      status: t.Union([t.Literal("Enabled"), t.Literal("Disabled")], {
        description: "Whether this meal is enabled or disabled",
        default: "Enabled",
      }),
    }),
    { description: "Array of scheduled meals" }
  ),
});

// 🚽 Litter Box Schemas
export const LitterBoxSettingsSchema = t.Object({
  clean_delay: t.Optional(
    t.Number({
      minimum: 60,
      maximum: 1800,
      description: "Delay in seconds before cleaning (60-1800)",
      default: 120,
    })
  ),
  sleep_mode: t.Optional(
    t.Object({
      enabled: t.Optional(
        t.Boolean({ description: "Enable/disable sleep mode", default: false })
      ),
      start_time: t.Optional(
        t.String({
          pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          description: "Start time in HH:MM format",
          default: "23:00",
        })
      ),
      end_time: t.Optional(
        t.String({
          pattern: "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
          description: "End time in HH:MM format",
          default: "07:00",
        })
      ),
    })
  ),
  preferences: t.Optional(
    t.Object({
      child_lock: t.Optional(
        t.Boolean({ description: "Enable/disable child lock", default: false })
      ),
      kitten_mode: t.Optional(
        t.Boolean({ description: "Enable/disable kitten mode", default: false })
      ),
      lighting: t.Optional(
        t.Boolean({ description: "Enable/disable lighting", default: true })
      ),
      prompt_sound: t.Optional(
        t.Boolean({
          description: "Enable/disable prompt sounds",
          default: true,
        })
      ),
      automatic_homing: t.Optional(
        t.Boolean({
          description: "Enable/disable automatic homing",
          default: true,
        })
      ),
    })
  ),
  actions: t.Optional(
    t.Object({
      reset_sand_level: t.Optional(
        t.Boolean({ description: "Reset sand level indicator", default: false })
      ),
      reset_factory_settings: t.Optional(
        t.Boolean({ description: "Reset to factory settings", default: false })
      ),
    })
  ),
});

// 📱 Device Schemas
export const ConnectDeviceSchema = t.Object({
  deviceId: t.String({ description: "Device ID to connect" }),
});

export const DisconnectDeviceSchema = t.Object({
  deviceId: t.String({ description: "Device ID to disconnect" }),
});

// 🔍 Device Debug Schemas
export const ScanDpsQuerySchema = t.Object({
  start: t.Optional(
    t.String({
      pattern: "^[0-9]+$",
      description: "Starting DPS number (default: 1)",
    })
  ),
  end: t.Optional(
    t.String({
      pattern: "^[0-9]+$",
      description: "Ending DPS number (default: 255)",
    })
  ),
  timeout: t.Optional(
    t.String({
      pattern: "^[0-9]+$",
      description: "Timeout in milliseconds per DPS (default: 3000)",
    })
  ),
});
