# HIS Report Logic & Query Prompt

This document consolidates the logic for processing HIS (Hospital Information System) query data for generating clinic reports. Use this as a prompt reference for new projects requiring similar data extraction.

## 1. Database Context

The system connects to a PostgreSQL database (HIS).

### Key Tables
- **`tb_servicedata`**: Stores individual service usage records.
  - `servicedataid_master`: 0 for parent services.
  - `servicedatausedate`: Date service was used.
  - `dm_servicegroupid`: High-level service group (Exam, Lab, Imaging, etc.).
  - `dm_servicesubgroupid`: Granular service type (Ultrasound, X-Ray, etc.).
  - `patientrecordid`: Link to patient record.
  - `servicename`: Name of the service.
- **`tb_patientrecord`**: Stores patient visit information.
  - `patientrecordid`: Primary key.
  - `receptiondate`: Date of reception.
  - `dm_patientobjectid`: Patient type (1=BHYT, 3=Request/Service).
  - `dm_hinhthucravienid`: Discharge type (13=Transfer).
  - `birthdayyear`: Patient birth year (used for age calculation).
- **`tb_medicalrecord_khambenh`**: Stores medical diagnosis data.
  - `chandoanbandau_icd10`: ICD10 diagnosis code.

### Connection
- **Library**: `pg` (node-postgres).
- **Environment Variable**: `HIS_DATABASE_URL`

## 2. Core Logic by Category

### A. General Filtering Rules
- **Time Ranges**: Most queries compare a `current` period vs. a `previous` period.
- **Exclusions**: `tb_patientrecord.dm_patientobjectid != 3` (often excludes "Yêu cầu/Service" if BHYT focus is primary, depends on specific query).
- **Aggregation**: Queries typically use `COUNT(*) FILTER (WHERE ...)` to fetch multiple periods in a single pass.

---

### B. Examination (Khám bệnh)
**Goal**: Count service usage by category (mapped via DB/Config) and split by BHYT status.

- **Service Group**: `dm_servicegroupid = 1`
- **Logic**:
  - Matches `servicename` against defined patterns (Exact, Contains, StartsWith, Regex).
  - **SQL**:
    ```sql
    SELECT 
      sd.servicename,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) as current_count,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) as prev_count
    FROM tb_servicedata sd
    JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
    WHERE sd.servicedatausedate BETWEEN $3 AND $2 
      AND sd.dm_servicegroupid = 1
      AND pr.dm_patientobjectid != 3
    GROUP BY sd.servicename
    ```

---

### C. Laboratory (Xét nghiệm)
**Goal**: Categorize labs into BHYT, Sent Out, Hematology, Biochemistry, Immunology.

- **Service Group**: `dm_servicegroupid = 3`
- **Constraint**: `servicedataid_master = 0` (Only count parent tests).
- **Categorization Logic** (SQL `CASE` statement):
  1. `servicename LIKE '%[G]%'` -> **Sent Out (Gửi ngoài)**
  2. `patientobjectid = 1` -> **BHYT**
  3. `dm_servicesubgroupid = 303` -> **Hematology (Huyết học)**
  4. `dm_servicesubgroupid = 301` -> **Biochemistry (Sinh hóa)**
  5. `dm_servicesubgroupid = 318` -> **Immunology (Miễn dịch)**
  6. Else -> **Other (XN Khác)**

---

### D. Imaging (Chẩn đoán hình ảnh)
**Goal**: Categorize by modality (X-Ray, Ultrasound, Endoscopy, ECG) and Patient Type (BHYT vs Service).

- **Service Group**: `dm_servicegroupid = 4`
- **Subgroups**:
  - `401`: X-Ray (X-quang)
  - `402`: Ultrasound (Siêu âm)
  - `403`: Endoscopy (Nội soi)
  - `404`: ECG (Điện tim)
- **Logic**: Split X-Ray and Ultrasound into BHYT (`patientobjectid=1`) vs Service (`dv`).

---

### E. Procedures/Specialist (Thủ thuật/Chuyên khoa)
**Goal**: Track specific procedure types.

- **Service Group**: `dm_servicegroupid = 5`
- **Subgroups**:
  - `100000`: ENT (Tai Mũi Họng) -> Split BHYT/Service
  - `100004`: Ear Cleaning (Lấy ráy tai / Tại nhà)
  - `501`: Dermatological Procedures (Thủ thuật Da liễu)
  - `10001`: Vaccines
  - `100002`: Minor Surgery (Ngoại/BS)
  - `100003`: OB/GYN (Sản)

---

### F. Infectious Diseases (Bệnh truyền nhiễm)
**Goal**: Track disease counts based on ICD10 codes with age grouping and historical comparison.

- **Table**: `tb_medicalrecord_khambenh` JOIN `tb_patientrecord`.
- **Filtering**: Matches ICD10 codes (`chandoanbandau_icd10`) against configured patterns (e.g., `J00%`, `B01%`).
- **Periods**:
  - `Current`: This week/month.
  - `Previous`: Last 30 days (often normalized to weekly average).
  - `Last Year`: Same period last year.
- **Age Groups** (Calculated via `receptiondate - birthdayyear`):
  - 0-2, 3-12, 13-18, 18-50, >50.
- **Special Logic**: `RSV` group might merge specific viral codes.

---

### G. Transfers (Chuyển tuyến)
**Goal**: Count patients transferred to higher-level hospitals.

- **Logic**:
  - `dm_hinhthucravienid = 13` (Transfer code).
  - Filter by `receptiondate`.

## 3. Date Handling

- **Current Period**: `[startDate, endDate]` (Inclusive).
- **Previous Period**: `[prevStartDate, prevEndDate]`. 
  - For Custom reports: Calculated as `startDate - duration`.
  - For Weekly reports: `startDate - 1 week`.
- **Note**: Queries use `$3` (prevStart) to `$2` (currEnd) in the `WHERE` clause to grab all relevant rows, then filter specifically in the `SELECT` projection using `FILTER (WHERE date BETWEEN ...)` for performance (single scan).
