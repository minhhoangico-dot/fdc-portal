import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests } from "@/viewmodels/useRequests";
import { useAttendance } from "@/viewmodels/useAttendance";
import { supabase } from "@/lib/supabase";
import { getInclusiveDayCount, getLeaveDates, requiresDirectorApproval } from "@/lib/request-helpers";

const LEAVE_ALLOWANCE_DAYS = 12;

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function usePortal() {
  const { user: currentUser } = useAuth();
  const { requests: myRequests, createRequest } = useRequests();
  const {
    currentMonth,
    setCurrentMonth,
    attendanceRecords,
    attendanceSummary,
  } = useAttendance();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [todayAttendanceRecord, setTodayAttendanceRecord] = useState<any | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setTodayAttendanceRecord(null);
      return;
    }

    const fetchTodayAttendance = async () => {
      const today = formatLocalDate(new Date());
      const { data } = await supabase
        .from("fdc_emp_attendance")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("date", today)
        .maybeSingle();

      if (!data) {
        setTodayAttendanceRecord(null);
        return;
      }

      setTodayAttendanceRecord({
        id: data.id,
        userId: data.user_id,
        date: data.date,
        checkIn: data.check_in,
        checkOut: data.check_out,
        status: data.status || "on_time",
        hoursWorked: data.hours_worked ?? data.hoursWorked,
        overtime: data.overtime_hours ?? data.overtime ?? 0,
      });
    };

    fetchTodayAttendance();
  }, [currentUser]);

  const leaveBalance = useMemo(() => {
    if (!currentUser) {
      return { used: 0, remaining: LEAVE_ALLOWANCE_DAYS, total: LEAVE_ALLOWANCE_DAYS };
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const used = myRequests
      .filter(
        (request) =>
          request.requesterId === currentUser.id &&
          request.type === "leave" &&
          (request.status === "approved" || request.status === "completed"),
      )
      .reduce((sum, request) => {
        const leaveDates = getLeaveDates(request);
        if (!leaveDates) return sum;

        const start = new Date(`${leaveDates.startDate}T00:00:00`);
        const end = new Date(`${leaveDates.endDate}T00:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
          return sum;
        }

        const clippedStart = start < yearStart ? yearStart : start;
        const clippedEnd = end > yearEnd ? yearEnd : end;
        if (clippedEnd < clippedStart) {
          return sum;
        }

        return sum + getInclusiveDayCount(
          formatLocalDate(clippedStart),
          formatLocalDate(clippedEnd),
        );
      }, 0);

    return {
      used,
      remaining: Math.max(LEAVE_ALLOWANCE_DAYS - used, 0),
      total: LEAVE_ALLOWANCE_DAYS,
    };
  }, [currentUser, myRequests]);

  const recentRequests = useMemo(() => {
    if (!currentUser) return [];
    return myRequests
      .filter((request) => request.requesterId === currentUser.id)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5);
  }, [currentUser, myRequests]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const submitLeaveRequest = async (data: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => {
    const needsDirectorApproval = requiresDirectorApproval(data.startDate, data.endDate);

    const approvalSteps: any[] = [
      {
        stepOrder: 1,
        approverRole: "head_nurse",
        status: "pending",
      },
    ];

    if (needsDirectorApproval) {
      approvalSteps.push({
        stepOrder: 2,
        approverRole: "director",
        status: "pending",
      });
    }

    await createRequest({
      type: "leave",
      title: `Xin ${data.type.toLowerCase()}`,
      description: data.reason,
      priority: "normal",
      metadata: {
        leaveType: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      approvalSteps,
    });

    setIsLeaveModalOpen(false);
  };

  return {
    currentUser,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    attendanceRecords,
    attendanceSummary,
    todayAttendanceRecord,
    leaveBalance,
    recentRequests,
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    requiresDirectorApproval,
    submitLeaveRequest,
  };
}
