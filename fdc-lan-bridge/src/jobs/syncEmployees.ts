import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";
import { getAllEmployees } from "../lib/hikvision";

export async function syncEmployeesJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncEmployeesJob...");

    const employees = await getAllEmployees();
    logger.info(`Fetched ${employees.length} employees from Hikvision device.`);

    if (employees.length === 0) {
      await logSync(
        "syncEmployees",
        "completed",
        "SYSTEM",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    const now = new Date().toISOString();
    const payloads = employees.map((emp) => ({
      employee_no: emp.employeeNo,
      name: emp.name,
      card_no: emp.cardNo || null,
      user_type: emp.userType,
      valid: emp.valid,
      last_synced_at: now,
      updated_at: now,
    }));

    const batchSize = 500;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const { error: upsertErr } = await supabase
        .from("fdc_attendance_employees")
        .upsert(batch, { onConflict: "employee_no" });
      if (upsertErr) {
        throw new Error(
          `Failed to upsert employees batch ${i}: ${upsertErr.message}`,
        );
      }
    }

    const { data: mappings, error: mappingErr } = await supabase
      .from("fdc_user_mapping")
      .select("id, hikvision_employee_id, department_name")
      .not("hikvision_employee_id", "is", null);

    if (mappingErr) {
      logger.error(
        `Failed to load user mappings for linking: ${mappingErr.message}`,
      );
    } else if (mappings && mappings.length > 0) {
      for (const mapping of mappings) {
        if (!mapping.hikvision_employee_id) continue;
        const { error: linkErr } = await supabase
          .from("fdc_attendance_employees")
          .update({
            user_id: mapping.id,
            department: mapping.department_name || null,
            updated_at: new Date().toISOString(),
          })
          .eq("employee_no", mapping.hikvision_employee_id);

        if (linkErr) {
          logger.warn(
            `Failed to link employee ${mapping.hikvision_employee_id} to user ${mapping.id}: ${linkErr.message}`,
          );
        }
      }
    }

    recordsSynced = payloads.length;
    logger.info(`syncEmployeesJob completed for ${recordsSynced} employees.`);

    await logSync(
      "syncEmployees",
      "completed",
      "SYSTEM",
      recordsSynced,
      null,
      Date.now() - startTime,
    );
  } catch (error: any) {
    logger.error("syncEmployeesJob failed:", error);
    await logSync(
      "syncEmployees",
      "failed",
      "SYSTEM",
      recordsSynced,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}
