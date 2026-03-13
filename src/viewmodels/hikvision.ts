export interface HikvisionValidationResult {
  ok: boolean;
  name?: string;
  deviceUserId?: string;
  message?: string;
}

export async function validateHikvisionEmployeeId(
  employeeId: string,
): Promise<HikvisionValidationResult> {
  const trimmed = employeeId.trim();
  if (!trimmed) {
    return { ok: false, message: "Mã nhân viên không được để trống" };
  }

  const baseUrl =
    (import.meta as any).env?.VITE_BRIDGE_URL || "http://localhost:3333";

  try {
    const res = await fetch(
      `${baseUrl}/hikvision/users/validate?employeeId=${encodeURIComponent(trimmed)}`,
    );

    if (!res.ok) {
      return {
        ok: false,
        message: "Không thể kiểm tra mã nhân viên trên máy chấm công",
      };
    }

    const data = await res.json();
    return {
      ok: !!data.ok,
      name: data.name,
      deviceUserId: data.deviceUserId,
      message: data.message,
    };
  } catch {
    return {
      ok: false,
      message: "Lỗi kết nối tới máy chấm công",
    };
  }
}

