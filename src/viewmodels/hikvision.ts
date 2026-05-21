import { buildBridgeUrl } from "@/lib/bridge-client";

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

  try {
    const res = await fetch(
      buildBridgeUrl(
        `/hikvision/users/validate?employeeId=${encodeURIComponent(trimmed)}`,
      ),
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

