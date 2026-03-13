import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Role } from "@/types/user";
import { BridgeHealth, SyncRecord } from "@/types/sync";

export type AdminTab = "users" | "approval" | "misa" | "health" | "audit";

export function useAdmin() {
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
        })),
      );
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    await supabase.from("fdc_user_mapping").update({ role: newRole }).eq("id", userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const handleResetPassword = (userId: string) => {
    alert(`Đã gửi email reset mật khẩu cho user ${userId}`);
  };

  const handleToggleActive = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextActive = !target.isActive;
    await supabase.from("fdc_user_mapping").update({ is_active: nextActive }).eq("id", userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)));
  };

  const handleAddUser = async (payload: { name: string; email?: string; department?: string; role: Role }) => {
    await supabase.from("fdc_user_mapping").insert({
      full_name: payload.name,
      email: payload.email,
      department_name: payload.department ?? null,
      role: payload.role,
      is_active: true,
    });
    await fetchUsers();
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

  const fetchSyncData = useCallback(async () => {
    const { data: healthData } = await supabase.from("fdc_sync_health").select("*").limit(1);
    if (healthData && healthData.length > 0) {
      setBridgeHealth({
        status: healthData[0].bridge_status ?? "offline",
        hisConnected: !!healthData[0].his_connected,
        misaConnected: !!healthData[0].misa_connected,
        lastHeartbeat: healthData[0].last_heartbeat,
        queueDepth: healthData[0].queue_depth ?? 0,
      });
    }

    const { data: logData } = await supabase
      .from("fdc_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (logData) {
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
    setIsSyncing(true);
    try {
      const baseUrl =
        (import.meta as any).env?.VITE_BRIDGE_URL || "http://localhost:3333";
      await fetch(`${baseUrl}/sync/${encodeURIComponent(type)}`, {
        method: "POST",
      });
      await fetchSyncData();
    } catch (e) {
      // swallow for now; can show toast in future
    } finally {
      setIsSyncing(false);
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
    await supabase.from("fdc_delegations").insert({
      delegator_id: payload.delegatorId,
      delegate_id: payload.delegateId,
      request_types: payload.requestTypes,
      start_date: payload.startDate,
      end_date: payload.endDate,
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
      (u.department && u.department.toLowerCase().includes(normalizedUserSearch))
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

    // Audit
    auditLogs: filteredAuditLogs,
    auditSearch,
    setAuditSearch,
    handleExportAuditCsv,
    handleSaveDelegation,
  };
}
