<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

defineOptions({
    inheritAttrs: false,
});

type Props = {
    className?: HTMLAttributes['class'];
};

defineProps<Props>();
</script>

<template>
    <!-- WattWise AI lightning bolt mark -->
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        :class="className"
        v-bind="$attrs"
    >
        <style>
            .fill-current path,
            .fill-current circle {
                fill: currentColor !important;
            }
        </style>
        <defs>
            <!-- Wave cut-out mask for the left leg -->
            <mask id="logo-wave-mask-24">
                <rect x="0" y="0" width="24" height="24" fill="white" />
                <path
                    d="M -1 13.5 C 3 10.5, 6 10.5, 10 13.5 C 14 16.5, 17 12.5, 21 11.5"
                    fill="none"
                    stroke="black"
                    stroke-width="2.5"
                    stroke-linecap="round"
                />
            </mask>
        </defs>

        <!-- Left Leg: adaptive color using currentColor -->
        <path
            d="M 3 4 L 7 4 L 12 19 C 12.3 20 11.7 20 11 20 L 9.2 20 C 8.4 20 7.8 19.5 7.5 18.7 L 3 4 Z"
            fill="currentColor"
            mask="url(#logo-wave-mask-24)"
        />

        <!-- Middle Chevron: Teal (#0D9488) -->
        <path
            d="M 9.5 17.5 L 12 11.5 C 12.3 10.7 12.7 10.7 13 11.5 L 15.5 17.5 C 15.8 18.3 15.2 19 14.4 19 L 10.6 19 C 9.8 19 9.2 18.3 9.5 17.5 Z"
            fill="#0D9488"
        />

        <!-- Right Leg: Emerald (#10B981) -->
        <path
            d="M 12.2 20 L 15.2 20 C 16 20 16.7 19.5 17 18.7 L 22.8 4.5 C 23.1 3.8 22.6 3.5 21.8 3.5 L 18.2 3.5 C 17.4 3.5 16.7 4 16.4 4.8 L 11.2 18 C 10.9 18.7 11.4 20 12.2 20 Z"
            fill="#10B981"
        />

        <!-- Rising Dots -->
        <!-- Dot 1 (Smallest, Teal) -->
        <circle cx="14.2" cy="14.8" r="1.1" fill="#0D9488" />
        <!-- Dot 2 (Medium, Emerald) -->
        <circle cx="16.4" cy="11.8" r="1.3" fill="#10B981" />
        <!-- Dot 3 (Largest, Emerald) -->
        <circle cx="18.6" cy="8.8" r="1.5" fill="#10B981" />
    </svg>
</template>
