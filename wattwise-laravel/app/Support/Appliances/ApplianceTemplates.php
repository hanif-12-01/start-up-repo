<?php

namespace App\Support\Appliances;

/**
 * Static appliance template data grouped by business type segment.
 *
 * Watt values are general estimates based on common market ranges.
 * "Daya alat bisa berbeda tergantung merk, seri, usia alat, dan cara pemakaian."
 */
class ApplianceTemplates
{
    /** @var array<string, string> Segment labels (Indonesian) */
    public const SEGMENT_LABELS = [
        'KOS_PROPERTY' => 'Kos-kosan & Properti Sewa',
        'FNB' => 'Restoran, Kafe, Warung Makan',
        'LAUNDRY' => 'Jasa Cuci / Laundry',
        'RETAIL' => 'Toko Kelontong & Minimarket',
        'COLD_STORAGE' => 'Penyimpanan Dingin / Frozen Food',
        'OTHER' => 'Usaha Lainnya',
    ];

    /**
     * Return all template items for a business type segment.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function forSegment(string $businessType): array
    {
        return match ($businessType) {
            'KOS_PROPERTY' => self::kosProperty(),
            'FNB' => self::fnb(),
            'LAUNDRY' => self::laundry(),
            'RETAIL' => self::retail(),
            'COLD_STORAGE' => self::coldStorage(),
            default => self::other(),
        };
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function kosProperty(): array
    {
        return [
            self::item('kos_ac_kamar', 'Pendingin', 'AC kamar', ['ac', 'air conditioner'], 450, 350, 1500, 1, 8, 30, 'Tergantung ukuran ruangan dan mode pemakaian', 'COMMON_MARKET_RANGE'),
            self::item('kos_kipas_angin', 'Pendingin', 'Kipas angin', ['kipas', 'fan'], 50, 25, 75, 1, 10, 30, 'Konsumsi rendah, sering menyala lama', 'COMMON_MARKET_RANGE'),
            self::item('kos_lampu_kamar', 'Penerangan', 'Lampu kamar', ['lampu', 'lampu led'], 12, 5, 25, 1, 10, 30, 'LED atau bohlam biasa berbeda daya', 'COMMON_MARKET_RANGE'),
            self::item('kos_lampu_koridor', 'Penerangan', 'Lampu koridor', ['lampu lorong', 'lampu gang'], 15, 5, 25, 2, 12, 30, 'Biasanya menyala lebih lama', 'COMMON_MARKET_RANGE'),
            self::item('kos_pompa_air', 'Utilitas', 'Pompa air', ['pompa', 'water pump'], 250, 125, 750, 1, 3, 30, 'Pemakaian tergantung jumlah penghuni', 'COMMON_MARKET_RANGE'),
            self::item('kos_rice_cooker', 'Dapur', 'Rice cooker / magic com', ['rice cooker', 'magic com', 'magic jar'], 400, 300, 900, 1, 3, 30, 'Mode warm mengonsumsi daya lebih rendah', 'COMMON_MARKET_RANGE'),
            self::item('kos_setrika', 'Dapur', 'Setrika', ['iron', 'setrikaan'], 350, 300, 1200, 1, 1, 8, 'Pemakaian biasanya tidak setiap hari', 'COMMON_MARKET_RANGE'),
            self::item('kos_dispenser', 'Dapur', 'Dispenser', ['dispenser air'], 350, 100, 500, 1, 8, 30, 'Daya tergantung fitur panas/dingin', 'COMMON_MARKET_RANGE'),
            self::item('kos_kulkas', 'Dapur', 'Kulkas', ['kulkas', 'refrigerator'], 100, 50, 200, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('kos_router_wifi', 'Utilitas', 'Router WiFi', ['router', 'wifi', 'modem'], 15, 5, 20, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('kos_cctv', 'Keamanan', 'CCTV', ['kamera cctv', 'camera'], 15, 5, 30, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('kos_mesin_cuci', 'Laundry', 'Mesin cuci bersama', ['mesin cuci', 'washing machine'], 400, 300, 500, 1, 3, 15, 'Pemakaian bersama, tidak setiap hari', 'COMMON_MARKET_RANGE'),
            self::item('kos_water_heater', 'Utilitas', 'Water heater', ['pemanas air', 'heater'], 350, 250, 2000, 1, 2, 30, 'Daya sangat bervariasi tergantung tipe', 'COMMON_MARKET_RANGE'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function fnb(): array
    {
        return [
            self::item('fnb_rice_cooker', 'Dapur', 'Rice cooker / magic com', ['rice cooker', 'magic com'], 400, 300, 900, 1, 6, 30, 'Mode warm berjalan sepanjang jam operasional', 'COMMON_MARKET_RANGE'),
            self::item('fnb_chest_freezer', 'Pendingin', 'Chest freezer', ['freezer', 'freezer box'], 200, 100, 350, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('fnb_showcase_cooler', 'Pendingin', 'Showcase cooler', ['showcase', 'display cooler'], 250, 150, 400, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('fnb_kulkas', 'Pendingin', 'Kulkas', ['kulkas', 'refrigerator'], 100, 50, 200, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('fnb_blender', 'Dapur', 'Blender', ['blender'], 300, 200, 500, 1, 2, 30, 'Pemakaian intermiten', 'COMMON_MARKET_RANGE'),
            self::item('fnb_dispenser', 'Dapur', 'Dispenser', ['dispenser air'], 350, 100, 500, 1, 10, 30, 'Daya tergantung fitur panas/dingin', 'COMMON_MARKET_RANGE'),
            self::item('fnb_lampu', 'Penerangan', 'Lampu', ['lampu', 'lampu led'], 15, 5, 25, 4, 12, 30, 'Jumlah tergantung luas area', 'COMMON_MARKET_RANGE'),
            self::item('fnb_kipas_angin', 'Pendingin', 'Kipas angin', ['kipas', 'fan'], 50, 25, 75, 2, 10, 30, 'Konsumsi rendah', 'COMMON_MARKET_RANGE'),
            self::item('fnb_kompor_listrik', 'Dapur', 'Kompor listrik', ['kompor', 'induction cooker'], 1500, 600, 2200, 1, 5, 30, 'Konsumsi daya tinggi saat memasak', 'COMMON_MARKET_RANGE'),
            self::item('fnb_mesin_kasir', 'Operasional', 'Mesin kasir', ['kasir', 'pos'], 30, 15, 50, 1, 12, 30, 'Menyala selama jam operasional', 'COMMON_MARKET_RANGE'),
            self::item('fnb_grinder_kopi', 'Dapur', 'Grinder kopi', ['grinder', 'coffee grinder'], 200, 100, 350, 1, 3, 30, 'Pemakaian intermiten', 'COMMON_MARKET_RANGE'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function laundry(): array
    {
        return [
            self::item('laundry_mesin_cuci', 'Laundry', 'Mesin cuci', ['washing machine', 'washer'], 500, 300, 800, 2, 8, 30, 'Kapasitas besar konsumsi lebih tinggi', 'COMMON_MARKET_RANGE'),
            self::item('laundry_mesin_pengering', 'Laundry', 'Mesin pengering', ['dryer', 'pengering'], 2000, 1500, 3000, 1, 6, 30, 'Konsumsi daya tinggi', 'COMMON_MARKET_RANGE'),
            self::item('laundry_setrika_uap', 'Laundry', 'Setrika uap', ['steam iron', 'steamer'], 1200, 800, 2000, 1, 6, 30, 'Daya tinggi selama pemanasan', 'COMMON_MARKET_RANGE'),
            self::item('laundry_setrika_listrik', 'Laundry', 'Setrika listrik', ['setrika', 'iron'], 350, 300, 1200, 1, 4, 30, 'Daya bervariasi tergantung pengaturan suhu', 'COMMON_MARKET_RANGE'),
            self::item('laundry_boiler', 'Laundry', 'Boiler', ['boiler', 'pemanas'], 3000, 1500, 5000, 1, 4, 30, 'Daya sangat tinggi', 'COMMON_MARKET_RANGE'),
            self::item('laundry_pompa_air', 'Utilitas', 'Pompa air', ['pompa', 'water pump'], 250, 125, 750, 1, 4, 30, 'Pemakaian tergantung volume cucian', 'COMMON_MARKET_RANGE'),
            self::item('laundry_kipas_exhaust', 'Utilitas', 'Kipas exhaust', ['exhaust fan', 'exhaust'], 40, 20, 80, 2, 8, 30, 'Sirkulasi udara area kerja', 'COMMON_MARKET_RANGE'),
            self::item('laundry_lampu', 'Penerangan', 'Lampu area kerja', ['lampu', 'lampu led'], 15, 5, 25, 4, 10, 30, 'Jumlah tergantung luas area', 'COMMON_MARKET_RANGE'),
            self::item('laundry_timbangan', 'Operasional', 'Timbangan digital', ['timbangan', 'scale'], 5, 1, 10, 1, 10, 30, 'Konsumsi sangat rendah', 'COMMON_MARKET_RANGE'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function retail(): array
    {
        return [
            self::item('retail_lampu_toko', 'Penerangan', 'Lampu toko', ['lampu', 'lampu led'], 15, 5, 25, 6, 14, 30, 'Jumlah tergantung luas toko', 'COMMON_MARKET_RANGE'),
            self::item('retail_kipas_angin', 'Pendingin', 'Kipas angin', ['kipas', 'fan'], 50, 25, 75, 2, 12, 30, 'Konsumsi rendah', 'COMMON_MARKET_RANGE'),
            self::item('retail_showcase_cooler', 'Pendingin', 'Showcase cooler', ['showcase', 'display cooler'], 250, 150, 400, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('retail_kulkas_display', 'Pendingin', 'Kulkas display', ['kulkas', 'refrigerator'], 150, 80, 250, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('retail_mesin_kasir', 'Operasional', 'Mesin kasir', ['kasir', 'pos'], 30, 15, 50, 1, 14, 30, 'Menyala selama jam operasional', 'COMMON_MARKET_RANGE'),
            self::item('retail_router_wifi', 'Utilitas', 'Router WiFi', ['router', 'wifi', 'modem'], 15, 5, 20, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('retail_cctv', 'Keamanan', 'CCTV', ['kamera cctv', 'camera'], 15, 5, 30, 2, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('retail_printer_struk', 'Operasional', 'Printer struk', ['printer', 'thermal printer'], 20, 10, 50, 1, 14, 30, 'Standby rendah, konsumsi saat cetak', 'COMMON_MARKET_RANGE'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function coldStorage(): array
    {
        return [
            self::item('cold_chest_freezer', 'Pendingin', 'Chest freezer', ['freezer', 'freezer box'], 200, 100, 350, 2, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('cold_showcase_freezer', 'Pendingin', 'Showcase freezer', ['showcase', 'display freezer'], 300, 200, 500, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('cold_kulkas_display', 'Pendingin', 'Kulkas display', ['kulkas', 'refrigerator'], 150, 80, 250, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('cold_ac_ruangan', 'Pendingin', 'AC ruangan', ['ac', 'air conditioner'], 900, 350, 2000, 1, 10, 30, 'Menjaga suhu ruang penyimpanan', 'COMMON_MARKET_RANGE'),
            self::item('cold_lampu', 'Penerangan', 'Lampu', ['lampu', 'lampu led'], 15, 5, 25, 4, 12, 30, 'Penerangan area gudang', 'COMMON_MARKET_RANGE'),
            self::item('cold_seal_machine', 'Operasional', 'Seal machine', ['sealer', 'vacuum sealer'], 400, 200, 600, 1, 3, 30, 'Pemakaian intermiten', 'COMMON_MARKET_RANGE'),
            self::item('cold_timbangan', 'Operasional', 'Timbangan digital', ['timbangan', 'scale'], 5, 1, 10, 1, 10, 30, 'Konsumsi sangat rendah', 'COMMON_MARKET_RANGE'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function other(): array
    {
        return [
            self::item('other_lampu', 'Penerangan', 'Lampu', ['lampu', 'lampu led'], 15, 5, 25, 2, 10, 30, 'Jumlah tergantung luas area', 'COMMON_MARKET_RANGE'),
            self::item('other_kipas_angin', 'Pendingin', 'Kipas angin', ['kipas', 'fan'], 50, 25, 75, 1, 8, 30, 'Konsumsi rendah', 'COMMON_MARKET_RANGE'),
            self::item('other_pompa_air', 'Utilitas', 'Pompa air', ['pompa', 'water pump'], 250, 125, 750, 1, 3, 30, 'Daya tergantung kapasitas pompa', 'COMMON_MARKET_RANGE'),
            self::item('other_router_wifi', 'Utilitas', 'Router WiFi', ['router', 'wifi', 'modem'], 15, 5, 20, 1, 24, 30, 'Menyala terus-menerus', 'COMMON_MARKET_RANGE'),
            self::item('other_custom', 'Lainnya', 'Peralatan custom', ['custom', 'lainnya'], null, null, null, 1, null, null, 'Isi sesuai peralatan Anda', 'USER_CUSTOM', false),
        ];
    }

    /**
     * Build a single template item array.
     *
     * @param string $key Unique template item key
     * @param string $category Appliance category
     * @param string $name Display name
     * @param array<string> $aliases Name aliases for duplicate detection
     * @param int|null $defaultWatt Default wattage estimate
     * @param int|null $minWatt Minimum known wattage range
     * @param int|null $maxWatt Maximum known wattage range
     * @param int $defaultQuantity Default quantity
     * @param float|null $defaultHoursPerDay Default hours of use per day
     * @param int|null $defaultDaysPerMonth Default days of use per month
     * @param string $usageNote Usage note for user context
     * @param string $confidence Confidence level of the estimate
     * @param bool $canCustomize Whether user should fill in values themselves
     * @return array<string, mixed>
     */
    private static function item(
        string $key,
        string $category,
        string $name,
        array $aliases,
        ?int $defaultWatt,
        ?int $minWatt,
        ?int $maxWatt,
        int $defaultQuantity,
        ?float $defaultHoursPerDay,
        ?int $defaultDaysPerMonth,
        string $usageNote,
        string $confidence,
        bool $canCustomize = true,
    ): array {
        return [
            'key' => $key,
            'category' => $category,
            'name' => $name,
            'aliases' => $aliases,
            'default_watt' => $defaultWatt,
            'min_watt' => $minWatt,
            'max_watt' => $maxWatt,
            'default_quantity' => $defaultQuantity,
            'default_hours_per_day' => $defaultHoursPerDay,
            'default_days_per_month' => $defaultDaysPerMonth,
            'usage_note' => $usageNote,
            'confidence' => $confidence,
            'can_customize' => $canCustomize,
        ];
    }
}
