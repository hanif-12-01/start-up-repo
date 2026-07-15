<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import {
    LayoutGrid,
    Building2,
    Zap,
    Coins,
    Plug,
    Sparkles,
    FileText,
    CreditCard,
    Settings,
    ClipboardList,
    TrendingUp,
    AlertTriangle,
} from '@lucide/vue';
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

const onboardingItems: NavItem[] = [
    { title: 'Mulai di Sini', href: '/onboarding', icon: ClipboardList },
];

const catatUsahaItems: NavItem[] = [
    { title: 'Pemakaian Listrik', href: '/electricity', icon: Zap },
    { title: 'Pendapatan Usaha', href: '/revenue', icon: Coins },
    { title: 'Peralatan', href: '/appliances', icon: Plug },
];

const pantauItems: NavItem[] = [
    { title: 'Prediksi Biaya', href: '/predictions', icon: TrendingUp },
    { title: 'Peringatan Pemakaian', href: '/anomalies', icon: AlertTriangle },
    { title: 'Saran Penghematan', href: '/recommendations', icon: Sparkles },
    { title: 'Laporan', href: '/reports', icon: FileText },
];

const kelolaItems: NavItem[] = [
    { title: 'Usaha & Properti', href: '/businesses', icon: Building2 },
    { title: 'Paket & Langganan', href: '/plans', icon: CreditCard },
    { title: 'Pengaturan', href: '/settings', icon: Settings },
];
</script>

<template>
    <Sidebar collapsible="icon" variant="inset" class="app-navigation">
        <SidebarHeader class="gap-3 border-b border-white/8 p-3 pb-4">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        as-child
                        class="h-14 hover:bg-white/5"
                    >
                        <Link :href="dashboard()">
                            <AppLogo />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <BusinessSwitcher />
        </SidebarHeader>

        <SidebarContent class="gap-1 px-1 py-3">
            <NavGroup label="Ringkasan" :items="berandaItems" />
            <NavGroup v-if="needsOnboarding" :items="onboardingItems" />
            <NavGroup label="Catat Usaha" :items="catatUsahaItems" />
            <NavGroup label="Pantau & Hemat" :items="pantauItems" />
            <NavGroup label="Kelola" :items="kelolaItems" />
        </SidebarContent>

        <SidebarFooter class="border-t border-white/8 p-3">
            <NavUser />
        </SidebarFooter>
    </Sidebar>
    <slot />
</template>
