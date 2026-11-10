<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Media, Paginated } from '~/types'

const apiBase = useRuntimeConfig().public.apiBase as string

const search = ref('')
const debouncedSearch = ref('')
const type = ref('all')
const status = ref('all')
const page = ref(1)
const perPage = 10

// Wait 400ms after typing before querying the API
let timer: ReturnType<typeof setTimeout>
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debouncedSearch.value = value), 400)
})

// Any filter change goes back to page 1
watch([debouncedSearch, type, status], () => (page.value = 1))

const query = computed(() => ({
  page: page.value,
  per_page: perPage,
  search: debouncedSearch.value || undefined,
  type: type.value === 'all' ? undefined : type.value,
  status: status.value === 'all' ? undefined : status.value
}))

const { data, status: loadStatus, error } = await useFetch<Paginated<Media>>('/api/media', {
  baseURL: apiBase,
  query,
  server: false
})

const typeItems = [
  { label: 'Todos los tipos', value: 'all' },
  { label: 'Billboard', value: 'billboard' },
  { label: 'Screen', value: 'screen' },
  { label: 'Mupi', value: 'mupi' },
  { label: 'Wall', value: 'wall' }
]

const statusItems = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Activo', value: 'active' },
  { label: 'Inactivo', value: 'inactive' }
]

const columns: TableColumn<Media>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'type', header: 'Tipo' },
  { accessorKey: 'location', header: 'Ubicación' },
  { accessorKey: 'dimensions', header: 'Dimensiones' },
  { accessorKey: 'price_per_day', header: 'Precio por día' },
  { accessorKey: 'status', header: 'Estado' }
]

const money = (value: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Listado de medios</h1>

    <div class="flex flex-wrap gap-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar por nombre o ubicación..."
        class="w-72"
      />
      <USelect v-model="type" :items="typeItems" class="w-48" />
      <USelect v-model="status" :items="statusItems" class="w-48" />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="No se pudo cargar el listado"
      :description="error.message"
    />

    <UTable
      :data="data?.data ?? []"
      :columns="columns"
      :loading="loadStatus === 'pending'"
    >
      <template #name-cell="{ row }">
        <NuxtLink :to="`/media/${row.original.id}`" class="font-medium text-primary hover:underline">
          {{ row.original.name }}
        </NuxtLink>
      </template>

      <template #price_per_day-cell="{ row }">
        {{ money(row.original.price_per_day) }}
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :color="row.original.status === 'active' ? 'success' : 'neutral'"
          variant="subtle"
        >
          {{ row.original.status === 'active' ? 'Activo' : 'Inactivo' }}
        </UBadge>
      </template>

      <template #empty>
        <p class="py-6 text-center text-muted">No se encontraron medios.</p>
      </template>
    </UTable>

    <div v-if="data && data.total > perPage" class="flex items-center justify-between">
      <p class="text-sm text-muted">{{ data.total }} medios en total</p>
      <UPagination v-model:page="page" :items-per-page="perPage" :total="data.total" />
    </div>
  </div>
</template>