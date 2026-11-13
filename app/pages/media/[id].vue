<script setup lang="ts">
import type { Media } from '~/types'

const route = useRoute()
const apiBase = useRuntimeConfig().public.apiBase as string
const id = route.params.id as string

const url: string = `/api/media/${id}`

const { data: media, error } = await useFetch(url, {
  baseURL: apiBase,
  server: false,
  transform: (res: { data: Media }) => res.data
})

const startsAt = ref('')
const endsAt = ref('')
const checking = ref(false)
const availability = ref<{ available: boolean; conflicts: { id: number; starts_at: string; ends_at: string; status: string }[] } | null>(null)
const checkError = ref('')

const canCheck = computed(() => startsAt.value && endsAt.value && endsAt.value >= startsAt.value)

async function checkAvailability() {
  checking.value = true
  checkError.value = ''
  availability.value = null
  try {
    availability.value = await $fetch(`/api/media/${id}/availability`, {
      baseURL: apiBase,
      query: { starts_at: startsAt.value, ends_at: endsAt.value }
    })
  } catch (e) {
    checkError.value = e instanceof Error ? e.message : String(e)
  } finally {
    checking.value = false
  }
}

const money = (value: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
</script>

<template>
  <div class="space-y-6">
    <UButton to="/media" icon="i-lucide-arrow-left" variant="ghost" color="neutral" label="Volver al listado" />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="No se encontró el medio"
      :description="error.message"
    />

    <UCard v-else-if="media">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">{{ media.name }}</h1>
          <UBadge :color="media.status === 'active' ? 'success' : 'neutral'" variant="subtle">
            {{ media.status === 'active' ? 'Activo' : 'Inactivo' }}
          </UBadge>
        </div>
      </template>

      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><dt class="text-sm text-muted">Tipo</dt><dd class="font-medium">{{ media.type }}</dd></div>
        <div><dt class="text-sm text-muted">Ubicación</dt><dd class="font-medium">{{ media.location }}</dd></div>
        <div><dt class="text-sm text-muted">Dimensiones</dt><dd class="font-medium">{{ media.dimensions }}</dd></div>
        <div><dt class="text-sm text-muted">Precio por día</dt><dd class="font-medium">{{ money(media.price_per_day) }}</dd></div>
      </dl>
    </UCard>

    <UCard v-if="media">
      <template #header>
        <h2 class="text-lg font-semibold">Consultar disponibilidad</h2>
      </template>

      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Desde">
          <UInput v-model="startsAt" type="date" />
        </UFormField>
        <UFormField label="Hasta">
          <UInput v-model="endsAt" type="date" :min="startsAt" />
        </UFormField>
        <UButton label="Consultar" :loading="checking" :disabled="!canCheck" @click="checkAvailability" />
      </div>

      <UAlert v-if="checkError" class="mt-4" color="error" variant="subtle" :title="checkError" />

      <div v-if="availability" class="mt-4 space-y-3">
        <UAlert
          :color="availability.available ? 'success' : 'warning'"
          variant="subtle"
          :title="availability.available ? 'Disponible en esas fechas' : 'No disponible en esas fechas'"
        />
        <ul v-if="availability.conflicts.length" class="list-disc pl-5 text-sm">
          <li v-for="c in availability.conflicts" :key="c.id">
            Reserva #{{ c.id }}: {{ c.starts_at }} a {{ c.ends_at }} ({{ c.status }})
          </li>
        </ul>
        <UButton
          v-if="availability.available"
          :to="`/bookings/new?media_id=${id}&starts_at=${startsAt}&ends_at=${endsAt}`"
          label="Reservar este medio"
          icon="i-lucide-calendar-plus"
        />
      </div>
    </UCard>
  </div>
</template>