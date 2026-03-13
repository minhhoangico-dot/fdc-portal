import React from "react";
import { Users, Settings, Key, Activity, Shield } from "lucide-react";
import { useAdmin, AdminTab } from "@/viewmodels/useAdmin";
import { UsersTab } from "./UsersTab";
import { ApprovalTab } from "./ApprovalTab";
import { MisaTab } from "./MisaTab";
import { HealthTab } from "./HealthTab";
import { AuditTab } from "./AuditTab";
import { DelegationModal } from "./DelegationModal";
import { AddUserModal } from "./AddUserModal";

export default function AdminPage() {
  const {
    activeTab,
    setActiveTab,
    users,
    isAddUserModalOpen,
    setIsAddUserModalOpen,
    isDelegationModalOpen,
    setIsDelegationModalOpen,
    selectedUser,
    setSelectedUser,
    handleRoleChange,
    handleResetPassword,
    handleToggleActive,
    handleAddUser,
    userSearch,
    setUserSearch,
    approvalConfigs,
    selectedConfig,
    setSelectedConfig,
    handleUpdateApprovalStep,
    handleAddApprovalStep,
    handleDeleteApprovalStep,
    handleSaveApprovalConfig,
    handleAddApprovalType,
    misaKeywords,
    misaScanResults,
    toggleKeywordActive,
    handleAddKeyword,
    handleEditKeyword,
    bridgeHealth,
    syncHistory,
    isSyncing,
    handleManualSync,
    auditLogs,
    auditSearch,
    setAuditSearch,
    handleExportAuditCsv,
    handleSaveDelegation,
    validateHikvisionEmployeeId,
  } = useAdmin();

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Người dùng", icon: <Users className="w-4 h-4" /> },
    {
      id: "approval",
      label: "Cấu hình phê duyệt",
      icon: <Settings className="w-4 h-4" />,
    },
    { id: "misa", label: "Từ khóa MISA", icon: <Key className="w-4 h-4" /> },
    { id: "health", label: "Hệ thống", icon: <Activity className="w-4 h-4" /> },
    { id: "audit", label: "Nhật ký", icon: <Shield className="w-4 h-4" /> },
  ];

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return "Đề nghị mua sắm";
      case "leave":
        return "Đơn xin nghỉ phép";
      case "payment":
        return "Đề nghị thanh toán";
      case "material_release":
        return "Xuất vật tư";
      case "advance":
        return "Tạm ứng";
      case "other":
        return "Khác";
      default:
        return type;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quản trị hệ thống</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[600px]">
        {activeTab === "users" && (
          <UsersTab
            users={users}
            onRoleChange={(id, role) => handleRoleChange(id, role as any)}
            onResetPassword={handleResetPassword}
            onOpenAddUser={() => setIsAddUserModalOpen(true)}
            onOpenDelegation={(user) => {
              setSelectedUser(user);
              setIsDelegationModalOpen(true);
            }}
            search={userSearch}
            onSearchChange={setUserSearch}
            onToggleActive={handleToggleActive}
          />
        )}

        {activeTab === "approval" && (
          <ApprovalTab
            approvalConfigs={approvalConfigs}
            selectedConfig={selectedConfig}
            onSelectConfig={setSelectedConfig}
            onUpdateStep={handleUpdateApprovalStep}
            onAddStep={handleAddApprovalStep}
            onDeleteStep={handleDeleteApprovalStep}
            onSaveConfig={handleSaveApprovalConfig}
            onAddType={handleAddApprovalType}
          />
        )}

        {activeTab === "misa" && (
          <MisaTab
            misaKeywords={misaKeywords}
            onToggleKeywordActive={toggleKeywordActive}
            onAddKeyword={handleAddKeyword}
            onEditKeyword={handleEditKeyword}
            scanResults={misaScanResults}
          />
        )}

        {activeTab === "health" && (
          <HealthTab
            bridgeHealth={bridgeHealth}
            syncHistory={syncHistory}
            onManualSync={handleManualSync}
            isSyncing={isSyncing}
            refreshSyncData={refreshSyncData}
            syncMessage={syncMessage}
            onDismissSyncMessage={dismissSyncMessage}
          />
        )}

        {activeTab === "audit" && (
          <AuditTab
            auditLogs={auditLogs}
            users={users}
            search={auditSearch}
            onSearchChange={setAuditSearch}
            onExportCsv={handleExportAuditCsv}
          />
        )}
      </div>

      <DelegationModal
        isOpen={isDelegationModalOpen}
        onClose={() => setIsDelegationModalOpen(false)}
        selectedUser={selectedUser}
        users={users}
        onSave={handleSaveDelegation}
      />
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSubmit={handleAddUser}
        onValidateHikvisionId={validateHikvisionEmployeeId}
      />
    </div>
  );
}
