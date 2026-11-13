<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Booking, Paginated } from '~/types'

const apiBase = useRuntimeConfig().public.apiBase as string
const toast = useToast()

const status = ref('all')
const from = ref('')
const to = ref('')
const page = ref(1)
const perPage = 10

watch([status, from, to], () => (page.value = 1))

const query = computed(() => ({
  page: page.value,
  per_page: perPage,
  status: status.value === 'all' ? undefined : status.value,
  from: from.value || undefined,
  to: to.value || undefined
}))

const { data, status: loadStatus, error, refresh } = await useFetch<Paginated<Booking>>('/api/bookings', {
  baseURL: apiBase,
  headers: { Accept: 'application/json' },
  query,
  server: false
})

const statusItems = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Cancelada', value: 'cancelled' }
]

const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' } as const
const statusColor = { pending: 'warning', confirmed: 'success', cancelled: 'neutral' } as const

const columns: TableColumn<Booking>[] = [
  { accessorKey: 'id', header: '#' },
  { accessorKey: 'media_id', header: 'Medio' },
  { accessorKey: 'customer_id', header: 'Cliente' },
  { accessorKey: 'starts_at', header: 'Periodo' },
  { accessorKey: 'total_price', header: 'Total' },
  { accessorKey: 'status', header: 'Estado' },
  { id: 'actions', header: '' }
]

const money = (value: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))

const updating = ref<number | null>(null)

async function changeStatus(booking: Booking, newStatus: Booking['status']) {
  if (newStatus === 'cancelled' && !confirm(`¿Cancelar la reserva #${booking.id}?`)) return

  updating.value = booking.id
  try {
    await $fetch(`/api/bookings/${booking.id}/status`, {
      baseURL: apiBase,
      method: 'PATCH',
      headers: { Accept: 'application/json' },
      body: { status: newStatus }
    })
    toast.add({ title: `Reserva #${booking.id}: ${statusLabel[newStatus].toLowerCase()}`, color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'No se pudo actualizar', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    updating.value = null
  }
}

function clearFilters() {
  status.value = 'all'
  from.value = ''
  to.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Listado de reservas</h1>
      <UButton to="/bookings/new" label="Nueva reserva" icon="i-lucide-plus" />
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="Estado">
        <USelect v-model="status" :items="statusItems" class="w-48" />
      </UFormField>
      <UFormField label="Desde">
        <UInput v-model="from" type="date" />
      </UFormField>
      <UFormField label="Hasta">
        <UInput v-model="to" type="date" :min="from" />
      </UFormField>
      <UButton label="Limpiar" color="neutral" variant="ghost" @click="clearFilters" />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="No se pudo cargar el listado"
      :description="error.message"
    />

    <UTable :data="data?.data ?? []" :columns="columns" :loading="loadStatus === 'pending'">
      <template #media_id-cell="{ row }">
        <NuxtLink :to="`/media/${row.original.media_id}`" class="font-medium text-primary hover:underline">
          {{ row.original.media?.name ?? `Medio #${row.original.media_id}` }}
        </NuxtLink>
      </template>

      <template #customer_id-cell="{ row }">
        <div>
          <p class="font-medium">{{ row.original.customer?.name }}</p>
          <p class="text-xs text-muted">{{ row.original.customer?.email }}</p>
        </div>
      </template>

      <template #starts_at-cell="{ row }">
        {{ row.original.starts_at }} → {{ row.original.ends_at }}
      </template>

      <template #total_price-cell="{ row }">
        {{ money(row.original.total_price) }}
      </template>

      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status]" variant="subtle">
          {{ statusLabel[row.original.status] }}
        </UBadge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UButton
            v-if="row.original.status === 'pending'"
            label="Confirmar"
            size="xs"
            color="success"
            variant="soft"
            :loading="updating === row.original.id"
            @click="changeStatus(row.original, 'confirmed')"
          />
          <UButton
            v-if="row.original.status !== 'cancelled'"
            label="Cancelar"
            size="xs"
            color="error"
            variant="soft"
            :disabled="updating === row.original.id"
            @click="changeStatus(row.original, 'cancelled')"
          />
        </div>
      </template>

      <template #empty>
        <p class="py-6 text-center text-muted">No se encontraron reservas.</p>
      </template>
    </UTable>

    <div v-if="data && data.total > perPage" class="flex items-center justify-between">
      <p class="text-sm text-muted">{{ data.total }} reservas en total</p>
      <UPagination v-model:page="page" :items-per-page="perPage" :total="data.total" />
    </div>
  </div>
</template>