import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

const PATIENT_VOLUME_LOOKBACK_DAYS = 365;

type HisPatientVolumeRow = {
  report_date: string | Date;
  total_treatments: number | string;
};

export async function syncPatientVolumeJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncPatientVolumeJob...");

    const result = await hisPool.query(`
      SELECT
        DATE(treatmentdate) as report_date,
        COUNT(treatmentid) as total_treatments
      FROM tb_treatment
      WHERE DATE(treatmentdate) >= CURRENT_DATE - INTERVAL '${PATIENT_VOLUME_LOOKBACK_DAYS} days'
        AND departmentid <> 6
      GROUP BY DATE(treatmentdate)
      ORDER BY DATE(treatmentdate)
    `);

    const rows = result.rows as HisPatientVolumeRow[];

    if (rows.length === 0) {
      await logSync(
        "syncPatientVolume",
        "completed",
        "HIS",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    const payload = rows.map((row) => {
      const totalTreatments = parseInt(String(row.total_treatments), 10) || 0;
      const reportDate =
        typeof row.report_date === "string"
          ? row.report_date.slice(0, 10)
          : toHoChiMinhDate(new Date(row.report_date));

      return {
        report_date: reportDate,
        total_treatments: totalTreatments,
        new_patients: Math.floor(totalTreatments * 0.2),
        returning_patients: Math.floor(totalTreatments * 0.8),
      };
    });

    const { error } = await supabase
      .from("fdc_patient_volume_daily")
      .upsert(payload, { onConflict: "report_date" });

    if (error) {
      throw error;
    }

    recordsSynced = payload.length;
    await logSync(
      "syncPatientVolume",
      "completed",
      "HIS",
      recordsSynced,
      null,
      Date.now() - startTime,
    );
  } catch (error: any) {
    logger.error("syncPatientVolumeJob failed", error);
    await logSync(
      "syncPatientVolume",
      "failed",
      "HIS",
      recordsSynced,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}
