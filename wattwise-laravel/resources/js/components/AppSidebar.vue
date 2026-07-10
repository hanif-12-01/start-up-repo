<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { LayoutGrid, Building2, Zap, Coins, Plug, Sparkles, FileText, CreditCard, Settings, ClipboardList, TrendingUp, AlertTriangle } from '@lucide/vue';
import { computed } from 'vue';
import AppLogo from '@/components/AppLogo.vue';
import BusinessSwitcher from '@/components/businesses/BusinessSwitcher.vue';
import NavGroup from '@/components/NavGroup.vue';
import NavUser from '@/components/NavUser.vue';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const page = usePage();
const needsOnboarding = computed(() => page.props.needsOnboarding === true);

const berandaItems: NavItem[] = [
    { title: 'Beranda', href: '/dashboard', icon: LayoutGrid },
];

// Onboarding is only surfaced while the user still needs it (no business yet).
const onboardingItems: NavItem[] = [
    { title: 'Onboarding', href: '/onboarding', icon: ClipboardList },
];

const catatDataItems: NavItem[] = [
    { title: 'Data Listrik', href: '/electricity', icon: Zap },
    { title: 'Pendapatan & Listrik', href: '/revenue', icon: Coins },
];

const analisisItems: NavItem[] = [
    { title: 'Prediksi & Estimasi', href: '/predictions', icon: TrendingUp },
    { title: 'Deteksi Anomali', href: '/anomalies', icon: AlertTriangle },
    { title: 'Rekomendasi Hemat', href: '/recommendations', icon: Sparkles },
];

const propertiItems: NavItem[] = [
    { title: 'Usaha / Properti', href: '/businesses', icon: Building2 },
    { title: 'Peralatan', href: '/appliances', icon: Plug },
];

const laporanItems: NavItem[] = [
    { title: 'Laporan', href: '/reports', icon: FileText },
];

const akunItems: NavItem[] = [
    { title: 'Paket & Langganan', href: '/plans', icon: CreditCard },
    { title: 'Pengaturan', href: '/settings', icon: Settings },
];
</script>

<template>
    <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" as-child>
                        <Link :href="dashboard()">
                            <AppLogo />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <BusinessSwitcher />
        </SidebarHeader>

        <SidebarContent>
            <NavGroup :items="berandaItems" />
            <NavGroup v-if="needsOnboarding" :items="onboardingItems" />
            <NavGroup label="Catat Data" :items="catatDataItems" />
            <NavGroup label="Analisis" :items="analisisItems" />
            <NavGroup label="Properti & Peralatan" :items="propertiItems" />
            <NavGroup :items="laporanItems" />
            <NavGroup label="Akun" :items="akunItems" />
        </SidebarContent>

        <SidebarFooter>
            <NavUser />
        </SidebarFooter>
    </Sidebar>
    <slot />
</template>
