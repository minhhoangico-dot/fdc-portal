import React from "react";
import { useImportExport, VoucherGroup } from "@/viewmodels/useImportExport";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  ChevronDown,
  ChevronUp,
  Package,
  FileText,
  Building2,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} tr`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs.toLocaleString("vi-VN")}`;
};

const formatDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
};

function DirectionBadge({ direction, size = "sm" }: { direction: "inward" | "outward"; size?: "sm" | "md" }) {
  const cls = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  if (direction === "inward") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-emerald-50 text-emerald-700 ${cls}`}>
        <ArrowDownToLine className="w-3 h-3" />
        Nhập
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-amber-50 text-amber-700 ${cls}`}>
      <ArrowUpFromLine className="w-3 h-3" />
      Xuất
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
      <p className="text-xs text-gray-500">
        {((page - 1) * pageSize + 1).toLocaleString("vi-VN")}–
        {Math.min(page * pageSize, totalItems).toLocaleString("vi-VN")} / {totalItems.toLocaleString("vi-VN")}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) pageNum = i + 1;
          else if (page <= 3) pageNum = i + 1;
          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = page - 2 + i;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                page === pageNum ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function VoucherRow({
  voucher,
  isExpanded,
  onToggle,
  accountLabels,
}: {
  voucher: VoucherGroup;
  isExpanded: boolean;
  onToggle: () => void;
  accountLabels: Record<string, string>;
}) {
  return (
    <>
      {/* Voucher header row */}
      <tr
        className="hover:bg-gray-50/70 cursor-pointer transition-colors border-b border-gray-100"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
          {formatDate(voucher.refDate)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-indigo-600">{voucher.refNo}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <DirectionBadge direction={voucher.direction} size="md" />
        </td>
        <td className="px-4 py-3">
          {voucher.supplierName ? (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate max-w-[200px]">{voucher.supplierName}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-right text-gray-500 tabular-nums">
          <div className="flex items-center justify-end gap-1">
            <Package className="w-3.5 h-3.5" />
            {voucher.itemCount}
          </div>
        </td>
        <td className={`px-4 py-3 text-sm text-right tabular-nums font-semibold ${
          voucher.direction === "inward" ? "text-emerald-600" : "text-amber-600"
        }`}>
          {formatCompact(voucher.totalAmount)}
        </td>
      </tr>

      {/* Expanded line items */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-gray-50/80 border-b border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 tracking-wider">
                    <th className="pl-12 pr-3 py-2 text-left font-medium">STT</th>
                    <th className="px-3 py-2 text-left font-medium">Vật tư</th>
                    <th className="px-3 py-2 text-left font-medium">Tài khoản</th>
                    <th className="px-3 py-2 text-right font-medium">ĐVT</th>
                    <th className="px-3 py-2 text-right font-medium">Số lượng</th>
                    <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
                    <th className="px-3 py-2 text-right font-medium pr-4">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.items.map((item, idx) => (
                    <tr key={`${item.itemCode}-${idx}`} className="border-t border-gray-100/80 hover:bg-white/60">
                      <td className="pl-12 pr-3 py-2 text-xs text-gray-400 tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-gray-800">{item.itemName}</div>
                        <div className="text-[10px] text-gray-400">{item.itemCode}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {accountLabels[item.account] || item.account}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-gray-500">{item.unit || "—"}</td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums font-medium text-gray-800">
                        {item.qty.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums text-gray-500">
                        {item.unitPrice > 0 ? formatCompact(item.unitPrice) : "—"}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right tabular-nums font-medium pr-4 ${
                        voucher.direction === "inward" ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {formatCompact(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {/* Voucher total row */}
                  <tr className="border-t border-gray-200 bg-white/40">
                    <td colSpan={4} />
                    <td className="px-3 py-2 text-xs text-right font-medium text-gray-500">
                      {voucher.totalQty.toLocaleString("vi-VN")}
                    </td>
                    <td />
                    <td className={`px-3 py-2 text-sm text-right tabular-nums font-bold pr-4 ${
                      voucher.direction === "inward" ? "text-emerald-700" : "text-amber-700"
                    }`}>
                      {formatCompact(voucher.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ImportExportTab() {
  const {
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
    vouchers,
    totalVouchers,
    totalVoucherPages,
    expandedVouchers,
    toggleVoucher,
    transactions,
    totalDailyTransactions,
    totalDailyPages,
    summary,
    dailyTrend,
    ACCOUNT_LABELS,
    TIME_RANGE_LABELS,
    DIRECTION_LABELS,
  } = useImportExport();

  const [showChart, setShowChart] = React.useState(false);

  const accounts: Array<"all" | "1521" | "1522" | "1523"> = ["all", "1521", "1522", "1523"];
  const directions: Array<"all" | "inward" | "outward"> = ["all", "inward", "outward"];
  const timeRanges: Array<"30" | "90" | "365"> = ["30", "90", "365"];

  return (
    <div className="space-y-4">
      {/* Compact KPI Summary Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng nhập</p>
              <p className="text-lg font-bold text-gray-900">{formatCompact(summary.totalInwardAmt)}</p>
              <p className="text-[10px] text-gray-400">{summary.totalInwardQty.toLocaleString("vi-VN")} đơn vị</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <ArrowUpFromLine className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng xuất</p>
              <p className="text-lg font-bold text-gray-900">{formatCompact(summary.totalOutwardAmt)}</p>
              <p className="text-[10px] text-gray-400">{summary.totalOutwardQty.toLocaleString("vi-VN")} đơn vị</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.netValue >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
              <span className={`text-sm font-bold ${summary.netValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}>±</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Chênh lệch</p>
              <p className={`text-lg font-bold ${summary.netValue >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {summary.netValue >= 0 ? "+" : ""}{formatCompact(summary.netValue)}
              </p>
              <p className="text-[10px] text-gray-400">Nhập − Xuất</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-600">%</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tỷ lệ xuất/nhập</p>
              <p className="text-lg font-bold text-gray-900">
                {summary.ratio > 0 ? `${summary.ratio.toFixed(0)}%` : "—"}
              </p>
              <p className="text-[10px] text-gray-400">
                {summary.ratio > 100 ? "Xuất > Nhập" : summary.ratio > 0 ? "Nhập > Xuất" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {accounts.map((acct) => (
                <button
                  key={acct}
                  onClick={() => setAccountFilter(acct)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    accountFilter === acct ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {acct === "all" ? "Tất cả" : ACCOUNT_LABELS[acct]}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {directions.map((dir) => (
                <button
                  key={dir}
                  onClick={() => setDirectionFilter(dir)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    directionFilter === dir
                      ? dir === "inward"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : dir === "outward"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {DIRECTION_LABELS[dir]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeRange === range ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={dataMode === "voucher"
              ? "Tìm theo số phiếu, vật tư, hoặc nhà cung cấp..."
              : "Tìm kiếm vật tư theo tên hoặc mã..."
            }
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">
            {dataMode === "voucher" ? (
              <>
                Chi tiết phiếu nhập xuất
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {totalVouchers.toLocaleString("vi-VN")} phiếu
                </span>
              </>
            ) : (
              <>
                Sổ nhập xuất theo ngày
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {totalDailyTransactions.toLocaleString("vi-VN")} giao dịch
                </span>
              </>
            )}
          </h3>
          <button
            onClick={() => setShowChart(!showChart)}
            className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
          >
            Biểu đồ
            {showChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Collapsible Chart */}
        {showChart && (
          <div className="px-4 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="h-48">
              {dailyTrend.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                  Chưa có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOutward" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => { try { return format(parseISO(v), "dd/MM"); } catch { return v; } }}
                      axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={formatCompact} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "12px" }}
                      labelFormatter={(v) => { try { return format(parseISO(v as string), "dd/MM/yyyy"); } catch { return v as string; } }}
                      formatter={(value: number, name: string) => [formatCurrency(Number(value || 0)), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area type="monotone" dataKey="inwardAmt" name="Nhập kho" stroke="#10b981" fill="url(#colorInward)" strokeWidth={1.5} isAnimationActive={false} />
                    <Area type="monotone" dataKey="outwardAmt" name="Xuất kho" stroke="#f59e0b" fill="url(#colorOutward)" strokeWidth={1.5} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ========== VOUCHER MODE ========== */}
        {dataMode === "voucher" && (
          <>
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-10" />
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Số phiếu</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Loại</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Số mục</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Tổng giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && vouchers.length === 0 ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-gray-400 text-sm">
                        {searchQuery ? "Không tìm thấy phiếu phù hợp" : "Chưa có dữ liệu phiếu nhập xuất"}
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const key = `${v.refNo}||${v.refDate}||${v.direction}`;
                      return (
                        <VoucherRow
                          key={key}
                          voucher={v}
                          isExpanded={expandedVouchers.has(key)}
                          onToggle={() => toggleVoucher(key)}
                          accountLabels={ACCOUNT_LABELS}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalVoucherPages}
              totalItems={totalVouchers}
              pageSize={50}
              onPageChange={setPage}
            />
          </>
        )}

        {/* ========== DAILY MODE (fallback) ========== */}
        {dataMode === "daily" && (
          <>
            {!isLoading && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 text-xs border-b border-blue-100">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Hiển thị dữ liệu tổng hợp theo ngày. Chi tiết từng phiếu sẽ tự động hiển thị khi backend được cập nhật.
              </div>
            )}
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vật tư</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Loại</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tài khoản</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Số lượng</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Giá trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading && transactions.length === 0 ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-gray-400 text-sm">
                        {searchQuery ? "Không tìm thấy giao dịch phù hợp" : "Chưa có dữ liệu nhập xuất"}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-gray-700 tabular-nums whitespace-nowrap">{formatDate(txn.date)}</td>
                        <td className="px-4 py-2.5">
                          <div className="text-sm text-gray-900">{txn.itemName}</div>
                          <div className="text-[10px] text-gray-400">{txn.itemCode}</div>
                        </td>
                        <td className="px-4 py-2.5"><DirectionBadge direction={txn.direction} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{ACCOUNT_LABELS[txn.account] || txn.account}</td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium text-gray-900">
                          {txn.qty.toLocaleString("vi-VN")}
                        </td>
                        <td className={`px-4 py-2.5 text-sm text-right tabular-nums font-medium ${
                          txn.direction === "inward" ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {formatCompact(txn.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalDailyPages}
              totalItems={totalDailyTransactions}
              pageSize={50}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
