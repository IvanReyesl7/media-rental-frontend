<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  { label: 'Listado de medios', to: '/media', active: route.path.startsWith('/media') },
  { label: 'Crear reserva', to: '/bookings/new', active: route.path === '/bookings/new' },
  { label: 'Listado de reservas', to: '/bookings', active: route.path === '/bookings' }
])
</script>

<template>
  <UHeader title="Medios publicitarios" mode="slideover" toggle-side="right" :menu="{ side: 'right' }">
    <UNavigationMenu :items="items" />
    <template #right>
      <UColorModeButton />
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
    </template>

  </UHeader>

  <UMain>
    <UContainer class="py-8">
      <slot />
    </UContainer>
  </UMain>
</template>