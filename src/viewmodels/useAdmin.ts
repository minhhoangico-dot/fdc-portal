import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { BRIDGE_HEALTH_ROW_ID, isBridgeHeartbeatStale } from "@/lib/bridge";
import { User, Role } from "@/types/user";
import { BridgeHealth, SyncRecord } from "@/types/sync";
import { validateHikvisionEmployeeId } from "./hikvision";

export type AdminTab = "users" | "approval" | "misa" | "health" | "audit";

export function useAdmin() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("fdc_user_mapping").select("*").order("full_name");
    if (data) {
      setUsers(
        data.map((u) => ({
          id: u.id,
          name: u.full_name,
          role: u.role as Role,
          department: u.department_name,
          email: u.email,
          avatarUrl: u.avatar_url,
          isActive: u.is_active,
          hikvisionEmployeeId: u.hikvision_employee_id ?? undefined,
        })),
      );
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const { error } = await supabase
      .from("fdc_user_mapping")
      .update({ role: newRole })
      .eq("id", userId);
    if (error) {
      console.error("Failed to update role:", error);
      return;
    }
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    await supabase.from("fdc_audit_log").insert({
      user_id: currentUser?.id,
      action: "update_role",
      entity_type: "user",
      entity_id: userId,
      new_value: { role: newRole },
    });
  };

  // TODO: Implement via Supabase Edge Function — reset password for user's email using admin API
  const handleResetPassword = (userId: string) => {
    alert(`Đã gửi email reset mật khẩu cho user ${userId}`);
  };

  const handleToggleActive = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextActive = !target.isActive;
    const { error } = await supabase
      .from("fdc_user_mapping")
      .update({ is_active: nextActive })
      .eq("id", userId);
    if (error) {
      console.error("Failed to toggle active:", error);
      return;
    }
    setUsers(users.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)));
    await supabase.from("fdc_audit_log").insert({
      user_id: currentUser?.id,
      action: "toggle_active",
      entity_type: "user",
      entity_id: userId,
      new_value: { is_active: nextActive },
    });
  };

  // TODO: Implement via Supabase Edge Function — create Auth user + fdc_user_mapping so user can log in
  const handleAddUser = async (payload: {
    name: string;
    email?: string;
    department?: string;
    role: Role;
    hikvisionEmployeeId?: string;
  }) => {
    const { error } = await supabase.from("fdc_user_mapping").insert({
      full_name: payload.name,
      email: payload.email,
      department_name: payload.department ?? null,
      role: payload.role,
      is_active: true,
      hikvision_employee_id: payload.hikvisionEmployeeId ?? null,
    });
    if (error) {
      console.error("Failed to add user:", error);
      return;
    }
    await fetchUsers();
    await supabase.from("fdc_audit_log").insert({
      user_id: currentUser?.id,
      action: "create_user",
      entity_type: "user",
      entity_id: payload.email ?? payload.name,
      new_value: { name: payload.name, role: payload.role },
    });
  };

  // Approval Config state
  const [approvalConfigs, setApprovalConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);

  const fetchApprovalConfigs = useCallback(async () => {
    const { data } = await supabase.from("fdc_approval_templates").select("*");
    if (data) {
      const mapped = data.map((c) => ({
        id: c.id,
        requestType: c.request_type,
        name: c.name,
        isActive: c.is_active,
        steps: c.steps || [],
      }));
      setApprovalConfigs(mapped);
      if (mapped.length > 0 && !selectedConfig) setSelectedConfig(mapped[0]);
    }
  }, [selectedConfig]);

  const persistApprovalSteps = async (configId: string, steps: any[]) => {
    await supabase
      .from("fdc_approval_templates")
      .update({ steps })
      .eq("id", configId);
  };

  const handleUpdateApprovalStep = async (
    configId: string,
    stepIndex: number,
    field: "role" | "sla_hours" | "auto_approve" | "can_escalate",
    value: any,
  ) => {
    const current = approvalConfigs.find((c) => c.id === configId);
    if (!current) return;
    const nextSteps = current.steps.map((s: any, idx: number) =>
      idx === stepIndex ? { ...s, [field]: value } : s,
    );
    await persistApprovalSteps(configId, nextSteps);
    const nextConfigs = approvalConfigs.map((c) =>
      c.id === configId ? { ...c, steps: nextSteps } : c,
    );
    setApprovalConfigs(nextConfigs);
    if (selectedConfig?.id === configId) {
      setSelectedConfig({ ...current, steps: nextSteps });
    }
  };

  const handleAddApprovalStep = async (configId: string) => {
    const current = approvalConfigs.find((c) => c.id === configId);
    if (!current) return;
    const nextSteps = [
      ...current.steps,
      {
        id: `temp-${Date.now()}`,
        role: "dept_head",
        sla_hours: 24,
        auto_approve: false,
        can_escalate: false,
      },
    ];
    await persistApprovalSteps(configId, nextSteps);
    const nextConfigs = approvalConfigs.map((c) =>
      c.id === configId ? { ...c, steps: nextSteps } : c,
    );
    setApprovalConfigs(nextConfigs);
    if (selectedConfig?.id === configId) {
      setSelectedConfig({ ...current, steps: nextSteps });
    }
  };

  const handleDeleteApprovalStep = async (configId: string, stepIndex: number) => {
    const current = approvalConfigs.find((c) => c.id === configId);
    if (!current) return;
    const nextSteps = current.steps.filter((_s: any, idx: number) => idx !== stepIndex);
    await persistApprovalSteps(configId, nextSteps);
    const nextConfigs = approvalConfigs.map((c) =>
      c.id === configId ? { ...c, steps: nextSteps } : c,
    );
    setApprovalConfigs(nextConfigs);
    if (selectedConfig?.id === configId) {
      setSelectedConfig({ ...current, steps: nextSteps });
    }
  };

  const handleSaveApprovalConfig = async (configId: string) => {
    const current = approvalConfigs.find((c) => c.id === configId);
    if (!current) return;
    await supabase
      .from("fdc_approval_templates")
      .update({
        name: current.name,
        is_active: current.isActive,
        steps: current.steps,
      })
      .eq("id", configId);
  };

  const handleAddApprovalType = async (requestType: string) => {
    const { data, error } = await supabase
      .from("fdc_approval_templates")
      .insert({
        request_type: requestType,
        name: "Quy trình mới",
        is_active: true,
        steps: [],
      })
      .select("*")
      .single();
    if (error || !data) return;
    const mapped = {
      id: data.id,
      requestType: data.request_type,
      name: data.name,
      isActive: data.is_active,
      steps: data.steps || [],
    };
    const nextConfigs = [...approvalConfigs, mapped];
    setApprovalConfigs(nextConfigs);
    setSelectedConfig(mapped);
  };

  // MISA Keywords state
  const [misaKeywords, setMisaKeywords] = useState<any[]>([]);
  const [misaScanResults, setMisaScanResults] = useState<any[]>([]);

  const fetchMisaKeywords = useCallback(async () => {
    const { data } = await supabase.from("fdc_misa_scan_keywords").select("*");
    if (data) {
      setMisaKeywords(
        data.map((k) => ({
          id: k.id,
          keyword: k.keyword,
          category: k.category,
          alertOnMatch: k.alert_on_match,
          isActive: k.is_active,
        })),
      );
    }
  }, []);

  const toggleKeywordActive = async (id: string) => {
    const keyword = misaKeywords.find((k) => k.id === id);
    if (!keyword) return;
    await supabase
      .from("fdc_misa_scan_keywords")
      .update({ is_active: !keyword.isActive })
      .eq("id", id);
    setMisaKeywords(
      misaKeywords.map((k) =>
        k.id === id ? { ...k, isActive: !k.isActive } : k,
      )
    );
  };

  const handleAddKeyword = async (payload: { keyword: string; category?: string; alertOnMatch: boolean }) => {
    await supabase.from("fdc_misa_scan_keywords").insert({
      keyword: payload.keyword,
      category: payload.category ?? null,
      alert_on_match: payload.alertOnMatch,
      is_active: true,
    });
    await fetchMisaKeywords();
  };

  const handleEditKeyword = async (
    id: string,
    payload: { keyword: string; category?: string; alertOnMatch: boolean; isActive: boolean },
  ) => {
    await supabase
      .from("fdc_misa_scan_keywords")
      .update({
        keyword: payload.keyword,
        category: payload.category ?? null,
        alert_on_match: payload.alertOnMatch,
        is_active: payload.isActive,
      })
      .eq("id", id);
    await fetchMisaKeywords();
  };

  const fetchMisaScanResults = useCallback(async () => {
    const { data } = await supabase
      .from("fdc_misa_phieuchi_scan")
      .select("*")
      .order("synced_at", { ascending: false })
      .limit(10);
    if (data) {
      setMisaScanResults(
        data.map((row) => ({
          id: row.id ?? row.misa_doc_number,
          docNumber: row.misa_doc_number,
          docDate: row.misa_doc_date,
          amount: row.amount,
          description: row.description,
          matchedKeywords: row.matched_keywords,
          category: row.category,
          syncedAt: row.synced_at,
        })),
      );
    }
  }, []);

  // System Health state
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth>({
    status: "offline",
    lastHeartbeat: "",
    hisConnected: false,
    misaConnected: false,
    queueDepth: 0,
  });
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dismissSyncMessage = useCallback(() => setSyncMessage(null), []);

  const fetchSyncData = useCallback(async () => {
    const { data: healthData, error: healthError } = await supabase
      .from("fdc_sync_health")
      .select("bridge_status, his_connected, misa_connected, last_heartbeat, queue_depth")
      .eq("id", BRIDGE_HEALTH_ROW_ID)
      .maybeSingle();

    if (healthError) {
      console.error("Failed to fetch fdc_sync_health", healthError);
    } else if (healthData) {
      const lastHeartbeat = healthData.last_heartbeat ?? "";
      const heartbeatIsStale = isBridgeHeartbeatStale(lastHeartbeat);

      setBridgeHealth({
        status: heartbeatIsStale ? "offline" : (healthData.bridge_status ?? "offline"),
        hisConnected: heartbeatIsStale ? false : !!healthData.his_connected,
        misaConnected: heartbeatIsStale ? false : !!healthData.misa_connected,
        lastHeartbeat,
        queueDepth: healthData.queue_depth ?? 0,
      });
    } else {
      setBridgeHealth({
        status: "offline",
        hisConnected: false,
        misaConnected: false,
        lastHeartbeat: "",
        queueDepth: 0,
      });
    }

    const { data: logData, error: logError } = await supabase
      .from("fdc_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (logError) {
      console.error("Failed to fetch fdc_sync_logs", logError);
    } else if (logData) {
      setSyncHistory(
        logData.map(
          (l) =>
            ({
              id: l.id,
              type: l.sync_type,
              status: l.status === "completed" ? "success" : (l.status as SyncRecord["status"]),
              recordsSynced: l.records_synced ?? 0,
              startedAt: l.started_at,
              completedAt: l.completed_at ?? undefined,
              error: l.error_message ?? undefined,
            }) as SyncRecord,
        ),
      );
    }
  }, []);

  const handleManualSync = async (type: string) => {
    if (isSyncing) return;
    if (bridgeHealth.status !== "online") {
      setSyncMessage({
        type: "error",
        text: "LAN Bridge đang offline. Vui lòng kiểm tra dịch vụ fdc-lan-bridge trong mạng nội bộ trước khi đồng bộ.",
      });
      return;
    }
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const baseUrl =
        (import.meta as any).env?.VITE_BRIDGE_URL || "http://localhost:3333";
      const response = await fetch(`${baseUrl}/sync/${encodeURIComponent(type)}`, {
        method: "POST",
      });
      if (response.ok) {
        setSyncMessage({ type: 'success', text: `Đã kích hoạt đồng bộ ${type}` });
        await fetchSyncData();
      } else {
        setSyncMessage({ type: 'error', text: `Lỗi khi kích hoạt đồng bộ ${type}` });
      }
    } catch (e) {
      setSyncMessage({ type: 'error', text: 'Không thể kết nối tới bridge' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    const { data } = await supabase.from("fdc_audit_log").select(
      `
      *,
      user:fdc_user_mapping(full_name)
    `,
    ).order("created_at", { ascending: false }).limit(100);
    if (data) {
      setAuditLogs(
        data.map((l) => ({
          id: l.id,
          userId: l.user_id,
          user: l.user?.full_name || "System",
          action: l.action,
          entity: l.entity_type,
          details: JSON.stringify(l.new_value),
          timestamp: l.created_at,
          ipAccess: l.ip_address || "127.0.0.1",
        })),
      );
    }
  }, []);

  const handleExportAuditCsv = () => {
    const header = ["timestamp", "user", "action", "entity", "details"];
    const rows = filteredAuditLogs.map((log) => [
      log.timestamp,
      log.user,
      log.action,
      log.entity,
      log.details,
    ]);
    const csv = [header, ...rows]
      .map((cols) =>
        cols
          .map((c) => {
            const value = c ?? "";
            const needsQuote = /[",\n]/.test(String(value));
            return needsQuote
              ? `"${String(value).replace(/"/g, '""')}"`
              : String(value);
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDelegation = async (payload: {
    delegatorId: string;
    delegateId: string;
    requestTypes: string[];
    startDate: string;
    endDate: string;
  }) => {
    const { error } = await supabase.from("fdc_delegations").insert({
      delegator_id: payload.delegatorId,
      delegate_id: payload.delegateId,
      request_types: payload.requestTypes,
      start_date: payload.startDate,
      end_date: payload.endDate,
    });
    if (error) {
      console.error("Failed to save delegation:", error);
      return;
    }
    await supabase.from("fdc_audit_log").insert({
      user_id: currentUser?.id,
      action: "save_delegation",
      entity_type: "delegation",
      entity_id: payload.delegatorId,
      new_value: {
        delegate_id: payload.delegateId,
        request_types: payload.requestTypes,
        start_date: payload.startDate,
        end_date: payload.endDate,
      },
    });
  };

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "approval") fetchApprovalConfigs();
    else if (activeTab === "misa") {
      fetchMisaKeywords();
      fetchMisaScanResults();
    } else if (activeTab === "health") fetchSyncData();
    else if (activeTab === "audit") fetchAuditLogs();
  }, [
    activeTab,
    fetchUsers,
    fetchApprovalConfigs,
    fetchMisaKeywords,
    fetchMisaScanResults,
    fetchSyncData,
    fetchAuditLogs,
  ]);

  const normalizedUserSearch = userSearch.toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (!normalizedUserSearch) return true;
    return (
      u.name.toLowerCase().includes(normalizedUserSearch) ||
      (u.email && u.email.toLowerCase().includes(normalizedUserSearch)) ||
      (u.department && u.department.toLowerCase().includes(normalizedUserSearch)) ||
      (u.hikvisionEmployeeId &&
        u.hikvisionEmployeeId.toLowerCase().includes(normalizedUserSearch))
    );
  });

  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.details?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entity?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()),
  );

  return {
    activeTab,
    setActiveTab,

    // Users
    users: filteredUsers,
    userSearch,
    setUserSearch,
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

    // Approval
    approvalConfigs,
    selectedConfig,
    setSelectedConfig,
    handleUpdateApprovalStep,
    handleAddApprovalStep,
    handleDeleteApprovalStep,
    handleSaveApprovalConfig,
    handleAddApprovalType,

    // MISA
    misaKeywords,
    misaScanResults,
    toggleKeywordActive,
    handleAddKeyword,
    handleEditKeyword,

    // Health
    bridgeHealth,
    syncHistory,
    isSyncing,
    handleManualSync,
    refreshSyncData: fetchSyncData,
    syncMessage,
    dismissSyncMessage,

    // Audit
    auditLogs: filteredAuditLogs,
    auditSearch,
    setAuditSearch,
    handleExportAuditCsv,
    handleSaveDelegation,
    validateHikvisionEmployeeId,
  };
}
