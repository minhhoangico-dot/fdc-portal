import { misaPool } from "../db/misa";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import { logSync } from "../lib/syncLog";

export async function syncMisaPaymentsJob(): Promise<void> {
  const startTime = Date.now();
  let recordsSynced = 0;

  try {
    logger.info("Starting syncMisaPaymentsJob...");

    const { data: requests, error: fetchErr } = await supabase
      .from("fdc_approval_requests")
      .select("id, request_number, request_type, title")
      .eq("status", "approved")
      .in("request_type", ["payment", "advance", "purchase"]);

    if (fetchErr) throw fetchErr;

    if (!requests || requests.length === 0) {
      logger.info("No approved financial requests waiting for MISA sync.");
      await logSync(
        "syncMisaPayments",
        "completed",
        "MISA",
        0,
        null,
        Date.now() - startTime,
      );
      return;
    }

    const requestNumbers = requests.map((r: any) => r.request_number);
    logger.info(
      `Checking MISA for ${requestNumbers.length} pending requests: ${requestNumbers.join(
        ", ",
      )}`,
    );

    const query = `
      SELECT TOP 100 RefID, RefNo, JournalMemo, PostedDate 
      FROM GLVoucherList 
      WHERE RefNo LIKE 'PC%' OR RefNo LIKE 'UNC%'
      ORDER BY PostedDate DESC
    `;
    const result = await misaPool.request().query(query);
    const vouchers = result.recordset as any[];

    const matchedIds: string[] = [];
    for (const voucher of vouchers) {
      if (!voucher.JournalMemo) continue;
      const memo = String(voucher.JournalMemo).toUpperCase();

      for (const req of requests as any[]) {
        const reqId = req.id as string;
        const reqNo = String(req.request_number || "");
        if (matchedIds.includes(reqId)) continue;
        if (!reqNo) continue;

        if (memo.includes(reqNo.toUpperCase())) {
          logger.info(
            `Matched Request ${reqNo} with MISA Voucher ${voucher.RefNo}`,
          );

          const { error: updateErr } = await supabase
            .from("fdc_approval_requests")
            .update({
              status: "completed",
              misa_reference: voucher.RefNo,
              completed_at: new Date().toISOString(),
            })
            .eq("id", reqId);

          if (updateErr) {
            logger.error(`Failed to update request ${reqNo}`, updateErr);
          } else {
            matchedIds.push(reqId);
            recordsSynced++;
          }
        }
      }
    }

    await logSync(
      "syncMisaPayments",
      "completed",
      "MISA",
      recordsSynced,
      null,
      Date.now() - startTime,
    );
  } catch (error: any) {
    logger.error("syncMisaPaymentsJob failed", error);
    await logSync(
      "syncMisaPayments",
      "failed",
      "MISA",
      recordsSynced,
      error?.message ?? String(error),
      Date.now() - startTime,
    );
  }
}

