<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <main
    data-slot="sidebar-inset"
    :class="cn(
      'bg-background relative flex w-full flex-1 flex-col',
      'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-1 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border md:peer-data-[variant=inset]:shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 dark:md:peer-data-[variant=inset]:border-white/8',
      props.class,
    )"
  >
    <slot />
  </main>
</template>
