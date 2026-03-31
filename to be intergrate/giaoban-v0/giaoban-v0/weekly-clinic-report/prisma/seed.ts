import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // ==========================================
    // 1. SEED NHÓM TUỔI (5 nhóm)
    // ==========================================
    const ageGroups = [
        { group_key: 'age_0_2', group_name_vi: '0-2 tuổi', min_age: 0, max_age: 2, display_order: 1 },
        { group_key: 'age_3_12', group_name_vi: '3-12 tuổi', min_age: 3, max_age: 12, display_order: 2 },
        { group_key: 'age_13_18', group_name_vi: '13-18 tuổi', min_age: 13, max_age: 18, display_order: 3 },
        { group_key: 'age_18_50', group_name_vi: '18-50 tuổi', min_age: 18, max_age: 50, display_order: 4 },
        { group_key: 'age_over_50', group_name_vi: '>50 tuổi', min_age: 51, max_age: 999, display_order: 5 },
    ];

    for (const ag of ageGroups) {
        await prisma.wcrAgeGroup.upsert({
            where: { group_key: ag.group_key },
            update: ag,
            create: ag,
        });
    }
    console.log('✅ Seeded age groups');

    // ==========================================
    // 2. SEED MÃ ICD BỆNH TRUYỀN NHIỄM
    // ==========================================
    const infectiousCodes = [
        // Cúm
        { icd_code: 'J09', icd_pattern: 'J09%', disease_name_vi: 'Cúm do virus cúm gia cầm', disease_name_en: 'Avian influenza', disease_group: 'cum', color_code: '#3B82F6', display_order: 1 },
        { icd_code: 'J10', icd_pattern: 'J10%', disease_name_vi: 'Cúm do virus cúm đã xác định', disease_name_en: 'Influenza due to identified virus', disease_group: 'cum', color_code: '#3B82F6', display_order: 2 },
        { icd_code: 'J11', icd_pattern: 'J11%', disease_name_vi: 'Cúm do virus không xác định', disease_name_en: 'Influenza, virus not identified', disease_group: 'cum', color_code: '#3B82F6', display_order: 3 },

        // RSV
        { icd_code: 'J12.1', icd_pattern: 'J12.1%', disease_name_vi: 'Viêm phổi do RSV', disease_name_en: 'RSV pneumonia', disease_group: 'rsv', color_code: '#10B981', display_order: 4 },
        { icd_code: 'J20.5', icd_pattern: 'J20.5%', disease_name_vi: 'Viêm phế quản cấp do RSV', disease_name_en: 'Acute bronchitis due to RSV', disease_group: 'rsv', color_code: '#10B981', display_order: 5 },
        { icd_code: 'J21.0', icd_pattern: 'J21.0%', disease_name_vi: 'Viêm tiểu phế quản cấp do RSV', disease_name_en: 'Acute bronchiolitis due to RSV', disease_group: 'rsv', color_code: '#10B981', display_order: 6 },

        // Rotavirus
        { icd_code: 'A08.0', icd_pattern: 'A08.0%', disease_name_vi: 'Viêm ruột do Rotavirus', disease_name_en: 'Rotaviral enteritis', disease_group: 'rotavirus', color_code: '#F59E0B', display_order: 7 },

        // Tay chân miệng
        { icd_code: 'B08.4', icd_pattern: 'B08.4%', disease_name_vi: 'Bệnh tay chân miệng', disease_name_en: 'Hand, foot and mouth disease', disease_group: 'tcm', color_code: '#EF4444', display_order: 8 },

        // Thủy đậu
        { icd_code: 'B01', icd_pattern: 'B01%', disease_name_vi: 'Thủy đậu', disease_name_en: 'Varicella (chickenpox)', disease_group: 'thuy_dau', color_code: '#8B5CF6', display_order: 9 },

        // Sởi
        { icd_code: 'B05', icd_pattern: 'B05%', disease_name_vi: 'Sởi', disease_name_en: 'Measles', disease_group: 'soi', color_code: '#EC4899', display_order: 10 },

        // Sốt xuất huyết
        { icd_code: 'A90', icd_pattern: 'A90%', disease_name_vi: 'Sốt xuất huyết Dengue', disease_name_en: 'Dengue fever', disease_group: 'sxh', color_code: '#F97316', display_order: 11 },
        { icd_code: 'A91', icd_pattern: 'A91%', disease_name_vi: 'Sốt xuất huyết Dengue có biến chứng', disease_name_en: 'Dengue hemorrhagic fever', disease_group: 'sxh', color_code: '#F97316', display_order: 12 },

        // COVID-19
        { icd_code: 'U07.1', icd_pattern: 'U07.1%', disease_name_vi: 'COVID-19 xác định', disease_name_en: 'COVID-19, virus identified', disease_group: 'covid', color_code: '#6366F1', display_order: 13 },
        { icd_code: 'U07.2', icd_pattern: 'U07.2%', disease_name_vi: 'COVID-19 nghi ngờ', disease_name_en: 'COVID-19, virus not identified', disease_group: 'covid', color_code: '#6366F1', display_order: 14 },

        // Quai bị
        { icd_code: 'B26', icd_pattern: 'B26%', disease_name_vi: 'Quai bị', disease_name_en: 'Mumps', disease_group: 'quai_bi', color_code: '#14B8A6', display_order: 15 },

        // Adenovirus
        { icd_code: 'B97.0', icd_pattern: 'B97.0%', disease_name_vi: 'Nhiễm Adenovirus', disease_name_en: 'Adenovirus infection', disease_group: 'adenovirus', color_code: '#84CC16', display_order: 16 },
        { icd_code: 'J12.0', icd_pattern: 'J12.0%', disease_name_vi: 'Viêm phổi do Adenovirus', disease_name_en: 'Adenoviral pneumonia', disease_group: 'adenovirus', color_code: '#84CC16', display_order: 17 },
    ];

    for (const ic of infectiousCodes) {
        await prisma.wcrInfectiousCode.upsert({
            where: { id: ic.icd_code }, // Dùng icd_code làm unique identifier
            update: ic,
            create: ic,
        });
    }
    console.log('✅ Seeded infectious disease codes');

    // ==========================================
    // 3. SEED SERVICE MAPPINGS
    // ==========================================
    const serviceMappings = [
        // === KHÁM BỆNH ===
        { category_key: 'kham_nhi_tw', category_name_vi: 'Khám Nhi (Ths, BS BV Nhi TW)', display_group: 'kham_benh', match_type: 'contains', match_value: 'Nhi TW', display_order: 1 },
        { category_key: 'kham_nhi_bhyt', category_name_vi: 'Khám Nhi [BHYT]', display_group: 'kham_benh', match_type: 'regex', match_value: 'Nhi.*BHYT', display_order: 2 },
        { category_key: 'kham_noi_cki', category_name_vi: 'Khám Nội khoa (Ths, CK I)', display_group: 'kham_benh', match_type: 'regex', match_value: 'nội.*CK|Nội.*CK', display_order: 3 },
        { category_key: 'kham_noi_bhyt', category_name_vi: 'Khám Nội [BHYT]', display_group: 'kham_benh', match_type: 'regex', match_value: 'Nội.*BHYT', display_order: 4 },
        { category_key: 'kham_truc_trua', category_name_vi: 'Khám trực trưa', display_group: 'kham_benh', match_type: 'contains', match_value: 'trực trưa', display_order: 5 },
        { category_key: 'tai_kham_nhi_tt', category_name_vi: 'Tái khám nhi tại trung tâm', display_group: 'kham_benh', match_type: 'regex', match_value: 'Tái khám nhi.*trung tâm', display_order: 6 },
        { category_key: 'tai_kham_noi_tt', category_name_vi: 'Tái khám nội tại trung tâm', display_group: 'kham_benh', match_type: 'regex', match_value: 'Tái khám nội.*trung tâm', display_order: 7 },
        { category_key: 'kham_suc_khoe', category_name_vi: 'Khám sức khỏe và tư vấn', display_group: 'kham_benh', match_type: 'contains', match_value: 'sức khỏe', display_order: 8 },
        { category_key: 'kham_khac', category_name_vi: 'Khám khác (TMH, Sản, Mắt, Da...)', display_group: 'kham_benh', match_type: 'regex', match_value: 'TMH|Sản|Mắt|Da|cấp cứu', display_order: 9 },
        { category_key: 'kham_noi_tai_nha', category_name_vi: 'Khám nội tại nhà', display_group: 'kham_benh', match_type: 'contains', match_value: 'nội tại nhà', display_order: 10 },
        { category_key: 'kham_nhi_tai_nha', category_name_vi: 'Khám nhi tại nhà', display_group: 'kham_benh', match_type: 'contains', match_value: 'nhi tại nhà', display_order: 11 },
        { category_key: 'kham_tim', category_name_vi: 'Khám tim', display_group: 'kham_benh', match_type: 'contains', match_value: 'Khám tim', display_order: 12 },
        { category_key: 'tai_kham_tim_mach', category_name_vi: 'Tái khám tim mạch', display_group: 'kham_benh', match_type: 'contains', match_value: 'Tái khám tim', display_order: 13 },
        { category_key: 'tu_van_noi', category_name_vi: 'Tư vấn nội', display_group: 'kham_benh', match_type: 'contains', match_value: 'Tư vấn nội', display_order: 14 },
        { category_key: 'tu_van_nhi', category_name_vi: 'Tư vấn nhi', display_group: 'kham_benh', match_type: 'contains', match_value: 'Tư vấn nhi', display_order: 15 },

        // === XÉT NGHIỆM ===
        { category_key: 'xn_gui_ngoai', category_name_vi: 'Xét nghiệm gửi [G]', display_group: 'xet_nghiem', match_type: 'contains', match_value: '[G]', display_order: 1 },
        { category_key: 'xn_dich_vu', category_name_vi: 'Xét nghiệm dịch vụ', display_group: 'xet_nghiem', match_type: 'special', match_value: 'xet_nghiem_not_bhyt_not_g', display_order: 2 },
        { category_key: 'xn_bhyt', category_name_vi: 'Xét nghiệm BHYT', display_group: 'xet_nghiem', match_type: 'special', match_value: 'xet_nghiem_bhyt', display_order: 3 },

        // === CHẨN ĐOÁN HÌNH ẢNH ===
        { category_key: 'xquang_dv', category_name_vi: 'X-quang dịch vụ', display_group: 'cdha', match_type: 'regex', match_value: 'X-quang|Xquang|X quang', display_order: 1 },
        { category_key: 'xquang_bhyt', category_name_vi: 'X-quang BHYT', display_group: 'cdha', match_type: 'regex', match_value: '(X-quang|Xquang).*BHYT', display_order: 2 },
        { category_key: 'sieu_am_dv', category_name_vi: 'Siêu âm dịch vụ', display_group: 'cdha', match_type: 'contains', match_value: 'Siêu âm', display_order: 3 },
        { category_key: 'sieu_am_bhyt', category_name_vi: 'Siêu âm BHYT', display_group: 'cdha', match_type: 'regex', match_value: 'Siêu âm.*BHYT', display_order: 4 },
        { category_key: 'noi_soi', category_name_vi: 'Nội soi', display_group: 'cdha', match_type: 'contains', match_value: 'Nội soi', display_order: 5 },
        { category_key: 'dien_tim', category_name_vi: 'Điện tim', display_group: 'cdha', match_type: 'contains', match_value: 'Điện tim', display_order: 6 },
        { category_key: 'do_huyet_dong', category_name_vi: 'Đo Huyết động', display_group: 'cdha', match_type: 'contains', match_value: 'Huyết động', display_order: 7 },

        // === CHUYÊN KHOA ===
        { category_key: 'tiem_vac_xin', category_name_vi: 'Tiêm Vắc xin', display_group: 'chuyen_khoa', match_type: 'regex', match_value: 'Vắc xin|Vaccine|vắc-xin|vacxin', display_order: 1 },
        { category_key: 'thu_thuat_tmh', category_name_vi: 'Thủ thuật tai mũi họng', display_group: 'chuyen_khoa', match_type: 'regex', match_value: 'tai mũi họng|TMH', display_order: 2 },
        { category_key: 'thu_thuat_tai_nha', category_name_vi: 'Thủ thuật tại nhà', display_group: 'chuyen_khoa', match_type: 'regex', match_value: 'thủ thuật.*tại nhà|Thủ thuật.*tại nhà', display_order: 3 },
        { category_key: 'thu_thuat_tai_tt', category_name_vi: 'Thủ thuật tại trung tâm', display_group: 'chuyen_khoa', match_type: 'regex', match_value: 'thủ thuật.*trung tâm|Thủ thuật.*trung tâm', display_order: 4 },
    ];

    for (const sm of serviceMappings) {
        await prisma.wcrServiceMapping.upsert({
            where: { category_key: sm.category_key },
            update: sm,
            create: sm,
        });
    }
    console.log('✅ Seeded service mappings');

    console.log('🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
