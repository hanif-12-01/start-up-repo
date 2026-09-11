<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import {
    Building2,
    Check,
    ChevronsUpDown,
    LayoutGrid,
    Loader2,
    Plus,
} from '@lucide/vue';
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
import { useCurrentUrl } from '@/composables/useCurrentUrl';

const page = usePage();
const { isMobile, state } = useSidebar();
const { isCurrentUrl } = useCurrentUrl();
const isPortfolioPage = computed(() => isCurrentUrl('/portfolio'));

const businessContext = computed(() => page.props.businessContext);
const activeBusinesses = computed(
    () => businessContext.value?.activeBusinesses ?? [],
);
const activeBusiness = computed(
    () => businessContext.value?.activeBusiness ?? null,
);

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

    if (isPortfolioPage.value) {
        return `Semua Usaha (${activeBusinesses.value.length} Lokasi)`;
    }

    return `Pilih Usaha: ${activeBusiness.value?.name ?? ''}`;
});

const isSelecting = ref(false);
const selectError = ref<string | null>(null);

const selectBusiness = (businessId: number) => {
    if (activeBusiness.value?.id === businessId && !isPortfolioPage.value) {
        return;
    }

    isSelecting.value = true;
    selectError.value = null;

    router.post(
        '/businesses/select',
        {
            business_id: businessId,
            redirect_to: '/dashboard',
        },
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
        },
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
                        <div
                            class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary"
                        >
                            <Building2 class="size-4" />
                        </div>
                        <div
                            v-if="!isCollapsed"
                            class="grid flex-1 leading-tight"
                        >
                            <span class="truncate text-sm font-semibold"
                                >Belum ada usaha aktif</span
                            >
                            <span
                                class="truncate text-xs font-medium text-emerald-600"
                                >Buat Usaha &rarr;</span
                            >
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
                        <div
                            class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary"
                        >
                            <Building2 class="size-4" />
                        </div>
                        <div
                            v-if="!isCollapsed"
                            class="grid flex-1 leading-tight"
                        >
                            <span class="truncate text-sm font-semibold">{{
                                activeBusiness?.name
                            }}</span>
                            <span
                                class="truncate text-xs text-muted-foreground"
                                >{{
                                    getBusinessTypeLabel(
                                        activeBusiness?.business_type,
                                    )
                                }}</span
                            >
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
                            <div
                                class="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary"
                            >
                                <Loader2
                                    v-if="isSelecting"
                                    class="size-4 animate-spin"
                                />
                                <LayoutGrid
                                    v-else-if="isPortfolioPage"
                                    class="size-4 text-emerald-500"
                                />
                                <Building2 v-else class="size-4" />
                            </div>
                            <div
                                v-if="!isCollapsed"
                                class="grid min-w-0 flex-1 text-left leading-tight"
                            >
                                <template v-if="isPortfolioPage">
                                    <span class="truncate text-sm font-semibold"
                                        >Semua Usaha</span
                                    >
                                    <span
                                        class="truncate text-xs text-muted-foreground"
                                        >{{ activeBusinesses.length }} Lokasi
                                        Aktif</span
                                    >
                                </template>
                                <template v-else>
                                    <span
                                        class="truncate text-sm font-semibold"
                                        >{{ activeBusiness?.name }}</span
                                    >
                                    <span
                                        class="truncate text-xs text-muted-foreground"
                                        >{{
                                            getBusinessTypeLabel(
                                                activeBusiness?.business_type,
                                            )
                                        }}</span
                                    >
                                </template>
                            </div>
                            <ChevronsUpDown
                                v-if="!isCollapsed"
                                class="ml-auto size-4 shrink-0 text-muted-foreground"
                            />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        class="w-(--reka-dropdown-menu-trigger-width) min-w-64 rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
                        :side="
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'right'
                                  : 'bottom'
                        "
                        align="start"
                        :side-offset="4"
                    >
                        <!-- Semua Usaha option for multi-location users -->
                        <DropdownMenuItem :as-child="true">
                            <Link
                                href="/portfolio"
                                class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                                <div
                                    class="flex aspect-square size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/5 text-sidebar-primary"
                                >
                                    <LayoutGrid
                                        class="size-3 text-emerald-600"
                                    />
                                </div>
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <span
                                        class="truncate text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                                        >Semua Usaha</span
                                    >
                                    <span
                                        class="truncate text-xs text-muted-foreground"
                                        >{{ activeBusinesses.length }} lokasi
                                        aktif</span
                                    >
                                </div>
                                <Check
                                    v-if="isPortfolioPage"
                                    class="ml-auto size-4 shrink-0 text-primary"
                                />
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuLabel
                            class="px-3 py-2 text-xs font-semibold text-muted-foreground"
                        >
                            Pilih Lokasi
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            v-for="b in activeBusinesses"
                            :key="b.id"
                            @click="selectBusiness(b.id)"
                            :aria-selected="activeBusiness?.id === b.id"
                            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                            <div
                                class="flex aspect-square size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/5 text-sidebar-primary"
                            >
                                <Building2 class="size-3" />
                            </div>
                            <div class="flex min-w-0 flex-1 flex-col">
                                <span class="truncate text-sm font-medium">{{
                                    b.name
                                }}</span>
                                <span
                                    class="truncate text-xs text-muted-foreground"
                                    >{{
                                        getBusinessTypeLabel(b.business_type)
                                    }}</span
                                >
                            </div>
                            <Check
                                v-if="activeBusiness?.id === b.id"
                                class="ml-auto size-4 shrink-0 text-primary"
                            />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem :as-child="true">
                            <Link
                                href="/businesses"
                                class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-600 hover:bg-accent hover:text-emerald-700"
                            >
                                <Plus class="size-4 text-emerald-600" />
                                Kelola Properti / Usaha
                            </Link>
                        </DropdownMenuItem>

                        <!-- Safe Error Alert inside dropdown if selection fails -->
                        <template v-if="selectError">
                            <DropdownMenuSeparator />
                            <div
                                class="mx-1 my-1 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400"
                            >
                                {{ selectError }}
                            </div>
                        </template>
                    </DropdownMenuContent>
                </DropdownMenu>
            </template>
        </SidebarMenuItem>
    </SidebarMenu>
</template>
