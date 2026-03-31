/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Activity,
  Key,
  Settings,
  Shield,
  UserCog,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminTab, useAdmin } from "@/viewmodels/useAdmin";
import { ADMIN_TABS, getAdminLegacyTabRedirect, isAdminTab } from "./admin-navigation";
import { AddUserModal } from "./AddUserModal";
import { ApprovalTab } from "./ApprovalTab";
import { AuditTab } from "./AuditTab";
import { DelegationModal } from "./DelegationModal";
import { HealthTab } from "./HealthTab";
import { MisaTab } from "./MisaTab";
import { RolesTab } from "./RolesTab";
import { UsersTab } from "./UsersTab";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    refreshSyncData,
    syncMessage,
    dismissSyncMessage,
    auditLogs,
    auditSearch,
    setAuditSearch,
    handleExportAuditCsv,
    handleSaveDelegation,
    validateHikvisionEmployeeId,
  } = useAdmin();

  React.useEffect(() => {
    const requestedTab = searchParams.get("tab");
    const redirectTarget = getAdminLegacyTabRedirect(requestedTab);

    if (redirectTarget) {
      navigate(redirectTarget, { replace: true });
      return;
    }

    if (isAdminTab(requestedTab)) {
      setActiveTab(requestedTab as AdminTab);
    }
  }, [navigate, searchParams, setActiveTab]);

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-lg text-gray-500">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  const iconsByTab: Record<AdminTab, React.ReactNode> = {
    users: <Users className="h-4 w-4" />,
    approval: <Settings className="h-4 w-4" />,
    misa: <Key className="h-4 w-4" />,
    health: <Activity className="h-4 w-4" />,
    audit: <Shield className="h-4 w-4" />,
    roles: <UserCog className="h-4 w-4" />,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quản trị hệ thống</h1>
      </div>

      <div className="hide-scrollbar flex overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {iconsByTab[tab.id]}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px] rounded-xl border border-gray-200 bg-white shadow-sm">
        {activeTab === "users" && (
          <UsersTab
            users={users}
            onRoleChange={(id, role) => handleRoleChange(id, role as any)}
            onResetPassword={handleResetPassword}
            onOpenAddUser={() => setIsAddUserModalOpen(true)}
            onOpenDelegation={(nextUser) => {
              setSelectedUser(nextUser);
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

        {activeTab === "roles" && <RolesTab />}
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
