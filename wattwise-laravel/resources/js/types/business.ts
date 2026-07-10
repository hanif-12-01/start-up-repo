export interface BusinessProfile {
    room_count: number | null;
    occupied_room_count: number | null;
    employee_count: number | null;
    operating_days_per_month: number | null;
    notes: string | null;
}

export interface ElectricityProfile {
    customer_type: string | null;
    power_va: number | null;
    tariff_per_kwh: number | string | null;
    payment_method: string | null;
    meter_type: string | null;
    notes: string | null;
}

export interface BusinessRow {
    id: number;
    name: string;
    business_type: string;
    city: string | null;
    province: string | null;
    address: string | null;
    status: string;
    business_profile: BusinessProfile | null;
    electricity_profile: ElectricityProfile | null;
}
