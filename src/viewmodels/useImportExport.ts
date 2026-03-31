import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SupplyVoucherLine, SupplyInward, SupplyConsumption } from "@/types/inventory";

const LOOKBACK_DAYS = 365;
const PAGE_SIZE = 1000;
const TABLE_PAGE_SIZE = 50;

type AccountFilter = "all" | "1521" | "1522" | "1523";
type TimeRange = "30" | "90" | "365";
type DirectionFilter = "all" | "inward" | "outward";

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

const DIRECTION_LABELS: Record<DirectionFilter, string> = {
  all: "Tất cả",
  inward: "Nhập kho",
  outward: "Xuất kho",
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// --- Voucher grouping types ---

export interface VoucherGroup {
  refNo: string;
  refDate: string;
  direction: "inward" | "outward";
  supplierName: string | null;
  description: string | null;
  totalQty: number;
  totalAmount: number;
  itemCount: number;
  items: VoucherItem[];
}

export interface VoucherItem {
  itemCode: string;
  itemName: string;
  account: string;
  qty: number;
  unitPrice: number;
  amount: number;
  unit: string | null;
}

// --- Legacy flat transaction type ---

export interface Transaction {
  id: string;
  date: string;
  itemCode: string;
  itemName: string;
  direction: "inward" | "outward";
  account: string;
  qty: number;
  amount: number;
}

export interface DailyTrendPoint {
  date: string;
  inwardAmt: number;
  outwardAmt: number;
}

export function useImportExport() {
  // Data sources
  const [voucherLines, setVoucherLines] = useState<SupplyVoucherLine[]>([]);
  const [inwardData, setInwardData] = useState<SupplyInward[]>([]);
  const [outwardData, setOutwardData] = useState<SupplyConsumption[]>([]);
  const [dataMode, setDataMode] = useState<"voucher" | "daily">("daily");

  const [isLoading, setIsLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("90");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedVouchers, setExpandedVouchers] = useState<Set<string>>(new Set());
  const hasLoaded = useRef(false);

  const toggleVoucher = useCallback((key: string) => {
    setExpandedVouchers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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

  // --- Fetch voucher lines (new table) ---

  const fetchVoucherLines = useCallback(async (): Promise<SupplyVoucherLine[] | null> => {
    let allRows: SupplyVoucherLine[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("fdc_supply_voucher_lines")
        .select("*")
        .gte("ref_date", fullCutoff)
        .order("ref_date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        // Table might not exist yet — return null to signal fallback
        console.warn("[useImportExport] fdc_supply_voucher_lines not available:", error.message);
        return null;
      }

      const batch = (data || []) as SupplyVoucherLine[];
      allRows = [...allRows, ...batch];
      from += PAGE_SIZE;
      hasMore = batch.length === PAGE_SIZE;
    }

    return allRows;
  }, [fullCutoff]);

  // --- Fetch legacy daily tables (fallback) ---

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

      if (error) return [];

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

      if (error) return [];

      const batch = (data || []) as SupplyConsumption[];
      allRows = [...allRows, ...batch];
      from += PAGE_SIZE;
      hasMore = batch.length === PAGE_SIZE;
    }

    return allRows;
  }, [fullCutoff]);

  // --- Main fetch ---

  const fetchAll = useCallback(async () => {
    if (!hasLoaded.current) setIsLoading(true);

    try {
      // Try voucher table first
      const vouchers = await fetchVoucherLines();

      if (vouchers && vouchers.length > 0) {
        setVoucherLines(vouchers);
        setDataMode("voucher");
      } else {
        // Fallback to daily aggregate tables
        const [inward, outward] = await Promise.all([fetchInward(), fetchOutward()]);
        setInwardData(inward);
        setOutwardData(outward);
        setDataMode("daily");
      }

      hasLoaded.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [fetchVoucherLines, fetchInward, fetchOutward]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("import-export-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fdc_supply_voucher_lines" }, () => {
        fetchAll();
      })
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [accountFilter, timeRange, directionFilter, searchQuery]);

  // =============================================
  // VOUCHER MODE computed data
  // =============================================

  const filteredVoucherLines = useMemo(() => {
    if (dataMode !== "voucher") return [];
    return voucherLines.filter((r) => {
      if (r.ref_date < rangeCutoff) return false;
      if (accountFilter !== "all" && r.account !== accountFilter) return false;
      if (directionFilter !== "all" && r.direction !== directionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesItem = r.item_name.toLowerCase().includes(q) || r.item_code.toLowerCase().includes(q);
        const matchesRef = r.ref_no.toLowerCase().includes(q);
        const matchesSupplier = r.supplier_name?.toLowerCase().includes(q);
        if (!matchesItem && !matchesRef && !matchesSupplier) return false;
      }
      return true;
    });
  }, [voucherLines, dataMode, rangeCutoff, accountFilter, directionFilter, searchQuery]);

  const vouchers: VoucherGroup[] = useMemo(() => {
    if (dataMode !== "voucher") return [];

    const grouped = new Map<string, VoucherGroup>();

    for (const line of filteredVoucherLines) {
      const key = `${line.ref_no}||${line.ref_date}||${line.direction}`;
      let group = grouped.get(key);

      if (!group) {
        group = {
          refNo: line.ref_no,
          refDate: line.ref_date,
          direction: line.direction,
          supplierName: line.supplier_name,
          description: line.description,
          totalQty: 0,
          totalAmount: 0,
          itemCount: 0,
          items: [],
        };
        grouped.set(key, group);
      }

      group.totalQty += Number(line.qty) || 0;
      group.totalAmount += Number(line.amount) || 0;
      group.itemCount += 1;
      group.items.push({
        itemCode: line.item_code,
        itemName: line.item_name,
        account: line.account,
        qty: Number(line.qty) || 0,
        unitPrice: Number(line.unit_price) || 0,
        amount: Number(line.amount) || 0,
        unit: line.unit,
      });
    }

    return Array.from(grouped.values()).sort((a, b) => b.refDate.localeCompare(a.refDate));
  }, [filteredVoucherLines, dataMode]);

  const totalVouchers = vouchers.length;
  const totalVoucherPages = Math.max(1, Math.ceil(totalVouchers / TABLE_PAGE_SIZE));
  const paginatedVouchers = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE;
    return vouchers.slice(start, start + TABLE_PAGE_SIZE);
  }, [vouchers, page]);

  // =============================================
  // DAILY MODE computed data (fallback)
  // =============================================

  const filteredInward = useMemo(() => {
    if (dataMode !== "daily") return [];
    return inwardData.filter((r) => {
      if (r.report_date < rangeCutoff) return false;
      if (accountFilter !== "all" && r.account !== accountFilter) return false;
      return true;
    });
  }, [inwardData, dataMode, accountFilter, rangeCutoff]);

  const filteredOutward = useMemo(() => {
    if (dataMode !== "daily") return [];
    return outwardData.filter((r) => {
      if (r.report_date < rangeCutoff) return false;
      if (accountFilter !== "all" && r.account !== accountFilter) return false;
      return true;
    });
  }, [outwardData, dataMode, accountFilter, rangeCutoff]);

  const dailyTransactions = useMemo(() => {
    if (dataMode !== "daily") return [];

    const txns: Transaction[] = [];

    if (directionFilter !== "outward") {
      for (const r of filteredInward) {
        txns.push({
          id: `in-${r.report_date}-${r.item_code}`,
          date: r.report_date,
          itemCode: r.item_code,
          itemName: r.item_name,
          direction: "inward",
          account: r.account,
          qty: Number(r.inward_qty) || 0,
          amount: Number(r.inward_amount) || 0,
        });
      }
    }

    if (directionFilter !== "inward") {
      for (const r of filteredOutward) {
        txns.push({
          id: `out-${r.report_date}-${r.item_code}`,
          date: r.report_date,
          itemCode: r.item_code,
          itemName: r.item_name,
          direction: "outward",
          account: r.account,
          qty: Number(r.outward_qty) || 0,
          amount: Number(r.outward_amount) || 0,
        });
      }
    }

    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? txns.filter((t) => t.itemName.toLowerCase().includes(query) || t.itemCode.toLowerCase().includes(query))
      : txns;

    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
    return filtered;
  }, [filteredInward, filteredOutward, directionFilter, searchQuery, dataMode]);

  const totalDailyTransactions = dailyTransactions.length;
  const totalDailyPages = Math.max(1, Math.ceil(totalDailyTransactions / TABLE_PAGE_SIZE));
  const paginatedDailyTransactions = useMemo(() => {
    const start = (page - 1) * TABLE_PAGE_SIZE;
    return dailyTransactions.slice(start, start + TABLE_PAGE_SIZE);
  }, [dailyTransactions, page]);

  // =============================================
  // KPI summary (works for both modes)
  // =============================================

  const summary = useMemo(() => {
    if (dataMode === "voucher") {
      let totalInwardAmt = 0, totalInwardQty = 0, totalOutwardAmt = 0, totalOutwardQty = 0;
      for (const line of filteredVoucherLines) {
        const amt = Number(line.amount) || 0;
        const qty = Number(line.qty) || 0;
        if (line.direction === "inward") {
          totalInwardAmt += amt;
          totalInwardQty += qty;
        } else {
          totalOutwardAmt += amt;
          totalOutwardQty += qty;
        }
      }
      const netValue = totalInwardAmt - totalOutwardAmt;
      const ratio = totalInwardAmt > 0 ? (totalOutwardAmt / totalInwardAmt) * 100 : 0;
      return { totalInwardAmt, totalInwardQty, totalOutwardAmt, totalOutwardQty, netValue, ratio };
    }

    const totalInwardAmt = filteredInward.reduce((s, r) => s + (Number(r.inward_amount) || 0), 0);
    const totalInwardQty = filteredInward.reduce((s, r) => s + (Number(r.inward_qty) || 0), 0);
    const totalOutwardAmt = filteredOutward.reduce((s, r) => s + (Number(r.outward_amount) || 0), 0);
    const totalOutwardQty = filteredOutward.reduce((s, r) => s + (Number(r.outward_qty) || 0), 0);
    const netValue = totalInwardAmt - totalOutwardAmt;
    const ratio = totalInwardAmt > 0 ? (totalOutwardAmt / totalInwardAmt) * 100 : 0;
    return { totalInwardAmt, totalInwardQty, totalOutwardAmt, totalOutwardQty, netValue, ratio };
  }, [dataMode, filteredVoucherLines, filteredInward, filteredOutward]);

  const dailyTrend: DailyTrendPoint[] = useMemo(() => {
    const byDate = new Map<string, DailyTrendPoint>();

    if (dataMode === "voucher") {
      for (const line of filteredVoucherLines) {
        const e = byDate.get(line.ref_date) || { date: line.ref_date, inwardAmt: 0, outwardAmt: 0 };
        const amt = Number(line.amount) || 0;
        if (line.direction === "inward") e.inwardAmt += amt;
        else e.outwardAmt += amt;
        byDate.set(line.ref_date, e);
      }
    } else {
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
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dataMode, filteredVoucherLines, filteredInward, filteredOutward]);

  return {
    isLoading,
    dataMode,
    accountFilter,
    setAccountFilter,
    directionFilter,
    setDirectionFilter,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    // Voucher mode
    vouchers: paginatedVouchers,
    totalVouchers,
    totalVoucherPages,
    expandedVouchers,
    toggleVoucher,
    // Daily mode (fallback)
    transactions: paginatedDailyTransactions,
    totalDailyTransactions,
    totalDailyPages,
    // Shared
    summary,
    dailyTrend,
    ACCOUNT_LABELS,
    TIME_RANGE_LABELS,
    DIRECTION_LABELS,
  };
}
