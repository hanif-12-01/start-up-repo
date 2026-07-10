<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import { Building2, Check, ChevronsUpDown, Loader2, Plus } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

const page = usePage();
const { isMobile, state } = useSidebar();

const businessContext = computed(() => page.props.businessContext);
const activeBusinesses = computed(() => businessContext.value?.activeBusinesses ?? []);
const activeBusiness = computed(() => businessContext.value?.activeBusiness ?? null);

const isCollapsed = computed(() => state.value === 'collapsed');

const businessTypeLabels: Record<string, string> = {
    KOS_PROPERTY: 'Kos / Properti',
    FNB: 'Makanan & Minuman',
    LAUNDRY: 'Laundry',
    RETAIL: 'Ritel',
    COLD_STORAGE: 'Penyimpanan Dingin',
    OTHER: 'Lainnya',
};

const getBusinessTypeLabel = (type: string | undefined | null) => {
    if (!type) {
        return 'Lainnya';
    }

    return businessTypeLabels[type] ?? 'Lainnya';
};

const tooltipText = computed(() => {
    if (activeBusinesses.value.length === 0) {
        return 'Belum ada usaha aktif';
    }

    if (activeBusinesses.value.length === 1) {
        return activeBusiness.value?.name ?? '';
    }

    return `Pilih Usaha: ${activeBusiness.value?.name ?? ''}`;
});

const isSelecting = ref(false);
const selectError = ref<string | null>(null);

const selectBusiness = (businessId: number) => {
    if (activeBusiness.value?.id === businessId) {
        return;
    }

    isSelecting.value = true;
    selectError.value = null;

    router.post(
        '/businesses/select',
        { business_id: businessId },
        {
            preserveState: false,
            preserveScroll: true,
            onFinish: () => {
                isSelecting.value = false;
            },
            onError: (errors) => {
                if (errors.business_selection) {
                    selectError.value = errors.business_selection;
                } else {
                    selectError.value = 'Gagal memilih usaha.';
                }
            },
        }
    );
};
</script>

<template>
    <SidebarMenu>
        <SidebarMenuItem>
            <!-- 1. Case: No active businesses -->
            <template v-if="activeBusinesses.length === 0">
                <SidebarMenuButton
                    as-child
                    size="lg"
                    tooltip="Belum ada usaha aktif"
                    class="w-full text-left focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Belum ada usaha aktif"
                >
                    <Link href="/businesses" class="flex items-center gap-2">
                        <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
                            <Building2 class="size-4" />
                        </div>
                        <div v-if="!isCollapsed" class="grid flex-1 leading-tight">
                            <span class="truncate font-semibold text-sm">Belum ada usaha aktif</span>
                            <span class="truncate text-xs text-emerald-600 font-medium">Buat Usaha &rarr;</span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </template>

            <!-- 2. Case: Exactly 1 active business -->
            <template v-else-if="activeBusinesses.length === 1">
                <SidebarMenuButton
                    as-child
                    size="lg"
                    :tooltip="tooltipText"
                    class="w-full text-left focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Manajemen usaha aktif"
                >
                    <Link href="/businesses" class="flex items-center gap-2">
                        <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
                            <Building2 class="size-4" />
                        </div>
                        <div v-if="!isCollapsed" class="grid flex-1 leading-tight">
                            <span class="truncate font-semibold text-sm">{{ activeBusiness?.name }}</span>
                            <span class="truncate text-xs text-muted-foreground">{{ getBusinessTypeLabel(activeBusiness?.business_type) }}</span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </template>

            <!-- 3. Case: Multiple active businesses -->
            <template v-else>
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <SidebarMenuButton
                            size="lg"
                            :tooltip="tooltipText"
                            class="w-full text-left focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            :disabled="isSelecting"
                            aria-label="Pilih properti atau usaha aktif"
                        >
                            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary shrink-0">
                                <Loader2 v-if="isSelecting" class="size-4 animate-spin" />
                                <Building2 v-else class="size-4" />
                            </div>
                            <div v-if="!isCollapsed" class="grid flex-1 leading-tight text-left min-w-0">
                                <span class="truncate font-semibold text-sm">{{ activeBusiness?.name }}</span>
                                <span class="truncate text-xs text-muted-foreground">{{ getBusinessTypeLabel(activeBusiness?.business_type) }}</span>
                            </div>
                            <ChevronsUpDown v-if="!isCollapsed" class="ml-auto size-4 text-muted-foreground shrink-0" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        class="w-(--reka-dropdown-menu-trigger-width) min-w-64 rounded-lg bg-popover text-popover-foreground border border-border shadow-md"
                        :side="isMobile ? 'bottom' : (state === 'collapsed' ? 'right' : 'bottom')"
                        align="start"
                        :side-offset="4"
                    >
                        <DropdownMenuLabel class="text-xs text-muted-foreground px-3 py-2 font-semibold">
                            Pilih Properti / Usaha
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            v-for="b in activeBusinesses"
                            :key="b.id"
                            @click="selectBusiness(b.id)"
                            :aria-selected="activeBusiness?.id === b.id"
                            class="flex items-center gap-2 px-3 py-2 cursor-pointer focus:bg-accent focus:text-accent-foreground text-foreground"
                        >
                            <div class="flex aspect-square size-6 items-center justify-center rounded-md bg-sidebar-primary/5 text-sidebar-primary shrink-0">
                                <Building2 class="size-3" />
                            </div>
                            <div class="flex flex-col min-w-0 flex-1">
                                <span class="text-sm font-medium truncate">{{ b.name }}</span>
                                <span class="text-xs text-muted-foreground truncate">{{ getBusinessTypeLabel(b.business_type) }}</span>
                            </div>
                            <Check v-if="activeBusiness?.id === b.id" class="ml-auto size-4 text-primary shrink-0" />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem :as-child="true">
                            <Link href="/businesses" class="flex items-center gap-2 px-3 py-2 cursor-pointer w-full text-left font-medium text-xs text-emerald-600 hover:text-emerald-700 hover:bg-accent">
                                <Plus class="size-4 text-emerald-600" />
                                Kelola Properti / Usaha
                            </Link>
                        </DropdownMenuItem>

                        <!-- Safe Error Alert inside dropdown if selection fails -->
                        <template v-if="selectError">
                            <DropdownMenuSeparator />
                            <div class="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-md mx-1 my-1">
                                {{ selectError }}
                            </div>
                        </template>
                    </DropdownMenuContent>
                </DropdownMenu>
            </template>
        </SidebarMenuItem>
    </SidebarMenu>
</template>
