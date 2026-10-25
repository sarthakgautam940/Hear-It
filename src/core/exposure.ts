/** NIOSH recommended exposure limit: 85 dBA for 8 hours, halving per 3 dB. */
export const NIOSH_LIMIT_DBA = 85;
export const NIOSH_HOURS_AT_LIMIT = 8;
export const NIOSH_EXCHANGE_DB = 3;

/** The in-ear level assumed at full chatter with the phone near 70% volume. Estimated, never measured. */
export const ASSUMED_CAP_DBA = 80;

export function allowedHours(levelDba: number): number {
  return NIOSH_HOURS_AT_LIMIT * Math.pow(2, (NIOSH_LIMIT_DBA - levelDba) / NIOSH_EXCHANGE_DB);
}

export function dosePercent(secondsOn: number, levelDba: number): number {
  return (100 * (secondsOn / 3600)) / allowedHours(levelDba);
}

export function estimatedEarLevelDba(gainDb: number, capDba = ASSUMED_CAP_DBA): number {
  return capDba + Math.min(0, gainDb);
}
