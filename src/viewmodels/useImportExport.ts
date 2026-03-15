import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SupplyInward, SupplyConsumption } from "@/types/inventory";

const LOOKBACK_DAYS = 365;
const PAGE_SIZE = 1000;

type AccountFilter = "all" | "1521" | "1522" | "1523";
type TimeRange = "30" | "90" | "365";

const ACCOUNT_LABELS: Record<string, string> = {
  "1521": "Nguyên vật liệu",
  "1522": "Vật tư y tế",
  "1523": "Văn phòng phẩm",
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "30": "30 ngày",
  "90": "90 ngày",
  "365": "1 năm",
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface DailyTrendPoint {
  date: string;
  inwardAmt: number;
  outwardAmt: number;
}

export interface ItemMovement {
  itemCode: string;
  itemName: string;
  inwardQty: number;
  inwardAmt: number;
  outwardQty: number;
  outwardAmt: number;
}

export function useImportExport() {
  const [inwardData, setInwardData] = useState<SupplyInward[]>([]);
  const [outwardData, setOutwardData] = useState<SupplyConsumption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("90");
  const [hasInwardData, setHasInwardData] = useState(true);
  const hasLoaded = useRef(false);

  const fullCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - LOOKBACK_DAYS);
    return formatLocalDate(d);
  }, []);

  const rangeCutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(timeRange));
    return formatLocalDate(d);
  }, [timeRange]);

  const fetchInward = useCallback(async (): Promise<SupplyInward[]> => {
    let allRows: SupplyInward[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("fdc_supply_inward_daily")
        .select("*")
        .gte("report_date", fullCutoff)
        .order("report_date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[useImportExport] fetchInward error:", error);
        return [];
      }

      const batch = (data || []) as SupplyInward[];
      allRows = [...allRows, ...batch];
      from += PAGE_SIZE;
      hasMore = batch.length === PAGE_SIZE;
    }

    return allRows;
  }, [fullCutoff]);

  const fetchOutward = useCallback(async (): Promise<SupplyConsumption[]> => {
    let allRows: SupplyConsumption[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("fdc_supply_consumption_daily")
        .select("*")
        .gte("report_date", fullCutoff)
        .order("report_date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[useImportExport] fetchOutward error:", error);
        return [];
      }

      const batch = (data || []) as SupplyConsumption[];
      allRows = [...allRows, ...batch];
      from += PAGE_SIZE;
      hasMore = batch.length === PAGE_SIZE;
    }

    return allRows;
  }, [fullCutoff]);

  const fetchAll = useCallback(async () => {
    if (!hasLoaded.current) setIsLoading(true);
    try {
      const [inward, outward] = await Promise.all([fetchInward(), fetchOutward()]);
      setInwardData(inward);
      setOutwardData(outward);
      setHasInwardData(inward.length > 0);
      hasLoaded.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInward, fetchOutward]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("import-export-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fdc_supply_inward_daily" }, () => {
        fetchAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fdc_supply_consumption_daily" }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const filteredInward = useMemo(() => {
    return inwardData.filter((r) => {
      if (r.report_date < rangeCutoff) return false;
      if (accountFilter !== "all" && r.account !== accountFilter) return false;
      return true;
    });
  }, [inwardData, accountFilter, rangeCutoff]);

  const filteredOutward = useMemo(() => {
    return outwardData.filter((r) => {
      if (r.report_date < rangeCutoff) return false;
      if (accountFilter !== "all" && r.account !== accountFilter) return false;
      return true;
    });
  }, [outwardData, accountFilter, rangeCutoff]);

  const summary = useMemo(() => {
    const totalInwardAmt = filteredInward.reduce((s, r) => s + (Number(r.inward_amount) || 0), 0);
    const totalInwardQty = filteredInward.reduce((s, r) => s + (Number(r.inward_qty) || 0), 0);
    const totalOutwardAmt = filteredOutward.reduce((s, r) => s + (Number(r.outward_amount) || 0), 0);
    const totalOutwardQty = filteredOutward.reduce((s, r) => s + (Number(r.outward_qty) || 0), 0);
    const netValue = totalInwardAmt - totalOutwardAmt;
    const ratio = totalInwardAmt > 0 ? (totalOutwardAmt / totalInwardAmt) * 100 : 0;

    return { totalInwardAmt, totalInwardQty, totalOutwardAmt, totalOutwardQty, netValue, ratio };
  }, [filteredInward, filteredOutward]);

  const dailyTrend: DailyTrendPoint[] = useMemo(() => {
    const byDate = new Map<string, DailyTrendPoint>();

    filteredInward.forEach((r) => {
      const e = byDate.get(r.report_date) || { date: r.report_date, inwardAmt: 0, outwardAmt: 0 };
      e.inwardAmt += Number(r.inward_amount) || 0;
      byDate.set(r.report_date, e);
    });

    filteredOutward.forEach((r) => {
      const e = byDate.get(r.report_date) || { date: r.report_date, inwardAmt: 0, outwardAmt: 0 };
      e.outwardAmt += Number(r.outward_amount) || 0;
      byDate.set(r.report_date, e);
    });

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredInward, filteredOutward]);

  const topItems: ItemMovement[] = useMemo(() => {
    const byItem = new Map<string, ItemMovement>();

    filteredInward.forEach((r) => {
      const e = byItem.get(r.item_code) || {
        itemCode: r.item_code, itemName: r.item_name,
        inwardQty: 0, inwardAmt: 0, outwardQty: 0, outwardAmt: 0,
      };
      e.inwardQty += Number(r.inward_qty) || 0;
      e.inwardAmt += Number(r.inward_amount) || 0;
      byItem.set(r.item_code, e);
    });

    filteredOutward.forEach((r) => {
      const e = byItem.get(r.item_code) || {
        itemCode: r.item_code, itemName: r.item_name,
        inwardQty: 0, inwardAmt: 0, outwardQty: 0, outwardAmt: 0,
      };
      e.outwardQty += Number(r.outward_qty) || 0;
      e.outwardAmt += Number(r.outward_amount) || 0;
      byItem.set(r.item_code, e);
    });

    return Array.from(byItem.values())
      .sort((a, b) => (b.inwardAmt + b.outwardAmt) - (a.inwardAmt + a.outwardAmt))
      .slice(0, 20);
  }, [filteredInward, filteredOutward]);

  return {
    isLoading,
    hasInwardData,
    accountFilter,
    setAccountFilter,
    timeRange,
    setTimeRange,
    summary,
    dailyTrend,
    topItems,
    ACCOUNT_LABELS,
    TIME_RANGE_LABELS,
  };
}
