import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const emptyAttendanceSummary = {
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
};

export function useAttendance() {
    const { user: currentUser } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [attendanceSummary, setAttendanceSummary] = useState<any>(emptyAttendanceSummary);

    useEffect(() => {
        if (!currentUser) {
            setAttendanceRecords([]);
            setAttendanceSummary(emptyAttendanceSummary);
            return;
        }
        const fetchAttendance = async () => {
            const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            const { data } = await supabase
                .from('fdc_emp_attendance')
                .select('*')
                .eq('user_id', currentUser.id)
                .gte('date', startDate)
                .lte('date', endDate);

            if (data) {
                const records = data.map(record => ({
                    id: record.id,
                    userId: record.user_id,
                    date: record.date,
                    checkIn: record.check_in,
                    checkOut: record.check_out,
                    status: record.status || 'on_time',
                    lateMinutes: record.late_minutes || 0,
                    hoursWorked: record.hours_worked ?? record.hoursWorked,
                    overtime: record.overtime_hours ?? record.overtime ?? 0,
                    source: record.source || 'app'
                }));

                setAttendanceRecords(records);

                // Compute summary
                const summary = { present: 0, late: 0, absent: 0, leave: 0 };
                records.forEach(r => {
                    if (r.status === 'on_time') summary.present++;
                    else if (r.status === 'late') summary.late++;
                    else if (r.status === 'absent') summary.absent++;
                    else if (r.status === 'leave') summary.leave++;
                });
                setAttendanceSummary(summary);
            } else {
                setAttendanceRecords([]);
                setAttendanceSummary(emptyAttendanceSummary);
            }
        };
        fetchAttendance();
    }, [currentUser, currentMonth]);

    return {
        currentMonth,
        setCurrentMonth,
        attendanceRecords,
        attendanceSummary
    };
}
