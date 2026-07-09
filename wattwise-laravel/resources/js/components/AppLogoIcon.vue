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
        <path
            fill="currentColor"
            d="M13.5 2 4 13.2c-.42.5-.07 1.3.58 1.3H10l-1.4 7.06c-.14.72.78 1.14 1.24.56L20 10.8c.42-.5.07-1.3-.58-1.3H14l1.02-6.94c.1-.72-.78-1.12-1.24-.56z"
        />
    </svg>
</template>
