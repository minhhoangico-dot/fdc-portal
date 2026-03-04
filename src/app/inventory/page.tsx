import React from "react";
import { useInventory } from "@/viewmodels/useInventory";
import {
  Search,
  Filter,
  AlertTriangle,
  Package,
  TrendingUp,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  BarChart2,
  List,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export default function InventoryPage() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterWarehouse,
    setFilterWarehouse,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    filteredInventory,
    selectedItem,
    setSelectedItem,
    anomalies,
    acknowledgeAnomaly,
    usageTrend,
    topMaterials,
    stats,
  } = useInventory();

  const getStatusBadge = (status: string, itemId: string) => {
    const hasAnomaly = anomalies.some(
      (a) => a.materialId === itemId && !a.acknowledged,
    );

    if (hasAnomaly) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
          Bất thường
        </span>
      );
    }

    switch (status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            Bình thường
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            Sắp hết
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
            Hết hàng
          </span>
        );
      default:
        return null;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "y_te":
        return "Y tế";
      case "van_phong":
        return "VP phẩm";
      case "thiet_bi":
        return "Thiết bị";
      default:
        return cat;
    }
  };

  const getWarehouseLabel = (wh: string) => {
    switch (wh) {
      case "kho_chinh":
        return "Kho chính";
      case "nha_thuoc":
        return "Nhà thuốc";
      default:
        return wh;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical":
        return "Nghiêm trọng";
      case "high":
        return "Cao";
      case "medium":
        return "Trung bình";
      case "low":
        return "Thấp";
      default:
        return severity;
    }
  };

  // Mock data for department usage pie chart
  const deptUsageData = [
    { name: "Phòng khám", value: 45 },
    { name: "Cấp cứu", value: 25 },
    { name: "Nội trú", value: 20 },
    { name: "Hành chính", value: 10 },
  ];
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#64748b"];

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Kho</h1>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "list"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <List className="w-4 h-4" />
            Danh sách
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "analytics"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            Phân tích
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Tổng loại vật tư
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.activeAnomaliesCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">Cảnh báo</span>
          </div>
          <p
            className={`text-2xl font-bold ${stats.activeAnomaliesCount > 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {stats.activeAnomaliesCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Xuất hôm nay
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.todayReleases}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Giá trị tồn kho
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.estimatedValue)}
          </p>
        </div>
      </div>

      {/* TAB 1: Stock List */}
      {activeTab === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm vật tư, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filterWarehouse}
                onChange={(e) => setFilterWarehouse(e.target.value as any)}
                className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tất cả kho</option>
                <option value="kho_chinh">Kho chính</option>
                <option value="nha_thuoc">Nhà thuốc</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tất cả loại</option>
                <option value="y_te">Y tế</option>
                <option value="van_phong">VP phẩm</option>
                <option value="thiet_bi">Thiết bị</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="in_stock">Bình thường</option>
                <option value="low_stock">Sắp hết</option>
                <option value="out_of_stock">Hết hàng</option>
                <option value="anomaly">Có bất thường</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên vật tư
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Kho
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                    Tồn kho
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right hidden lg:table-cell">
                    Đã duyệt xuất
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">
                        {getCategoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">
                        {getWarehouseLabel(item.warehouse)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">
                        {item.currentStock}
                      </div>
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-sm text-gray-600">
                        {item.approvedExport}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(item.status, item.id)}
                    </td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Không tìm thấy vật tư nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Analytics */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Active Anomalies */}
          {anomalies.filter((a) => !a.acknowledged).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Cảnh báo cần xử lý
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomalies
                  .filter((a) => !a.acknowledged)
                  .map((anomaly) => {
                    return (
                      <div
                        key={anomaly.id}
                        className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(anomaly.severity)}`}
                          >
                            {getSeverityLabel(anomaly.severity)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">
                              {anomaly.materialId || "Unknown"}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {anomaly.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Phát hiện:{" "}
                              {format(
                                parseISO(anomaly.detectedAt),
                                "HH:mm dd/MM/yyyy",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => acknowledgeAnomaly(anomaly.id)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                          >
                            Xác nhận đã xem
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Usage Trend */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Xu hướng sử dụng (30 ngày)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={usageTrend}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f3f4f6"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => format(parseISO(val), "dd/MM")}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelFormatter={(val) =>
                        format(parseISO(val as string), "dd/MM/yyyy")
                      }
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="usage"
                      name="Lượng xuất kho"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="patientCount"
                      name="Lượt bệnh nhân"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Materials */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Top 10 vật tư tiêu hao nhiều nhất
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topMaterials}
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f3f4f6"
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#374151" }}
                      width={100}
                    />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} ${props.payload.unit}`,
                        "Số lượng",
                      ]}
                    />
                    <Bar
                      dataKey="consumption"
                      fill="#6366f1"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Usage by Department */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Phân bổ theo khoa phòng
              </h3>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptUsageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deptUsageData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Tỷ trọng"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in Detail Panel */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedItem(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedItem.name}
                </h2>
                <p className="text-sm text-gray-500">{selectedItem.sku}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Tồn kho hiện tại</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedItem.currentStock}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      {selectedItem.unit}
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Đã duyệt xuất</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {selectedItem.approvedExport}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      {selectedItem.unit}
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Mức tối thiểu</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {selectedItem.minQuantity} {selectedItem.unit}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedItem.status, selectedItem.id)}
                  </div>
                </div>
              </div>

              {/* Usage Chart */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  Lịch sử xuất kho (30 ngày)
                </h3>
                <div className="h-48 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageTrend.slice(0, 15)}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        labelFormatter={(val) =>
                          format(parseISO(val as string), "dd/MM/yyyy")
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="usage"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Anomaly History */}
              {anomalies.filter((a) => a.materialId === selectedItem.name)
                .length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">
                      Lịch sử cảnh báo
                    </h3>
                    <div className="space-y-3">
                      {anomalies
                        .filter((a) => a.materialId === selectedItem.name)
                        .map((anomaly) => (
                          <div
                            key={anomaly.id}
                            className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white"
                          >
                            <div
                              className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${anomaly.acknowledged ? "bg-gray-300" : "bg-orange-500"}`}
                            />
                            <div>
                              <p
                                className={`text-sm ${anomaly.acknowledged ? "text-gray-600" : "text-gray-900 font-medium"}`}
                              >
                                {anomaly.description}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {format(
                                  parseISO(anomaly.detectedAt),
                                  "HH:mm dd/MM/yyyy",
                                )}
                                {anomaly.acknowledged && " • Đã xác nhận"}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Recent Exports */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">
                  Phiếu xuất gần đây
                </h3>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          PX-202603-{String(i).padStart(3, "0")}
                        </p>
                        <p className="text-xs text-gray-500">Khoa Khám bệnh</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          -{Math.floor(Math.random() * 20) + 5}{" "}
                          {selectedItem.unit}
                        </p>
                        <p className="text-xs text-gray-400">Hôm qua</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
