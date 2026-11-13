<script setup lang="ts">
import type { Customer, Media, Paginated } from '~/types'

const apiBase = useRuntimeConfig().public.apiBase as string
const route = useRoute()
const toast = useToast()

const headers = { Accept: 'application/json' }

// Laravel returns validation errors as { message, errors: { field: [..] } }
function errorMessage(e: any): string {
  const data = e?.data
  if (data?.errors) return Object.values(data.errors).flat().join(' ')
  return data?.message ?? e?.message ?? 'Error desconocido'
}

// ---------- Data ----------
const { data: mediaPage } = await useFetch<Paginated<Media>>('/api/media', {
  baseURL: apiBase,
  query: { status: 'active', per_page: 100 },
  server: false
})

const { data: customers, refresh: refreshCustomers } = await useFetch('/api/customers', {
  baseURL: apiBase,
  server: false,
  transform: (res: { data: Customer[] }) => res.data
})

const mediaItems = computed(() =>
  (mediaPage.value?.data ?? []).map(m => ({ label: `${m.name} (${m.location})`, value: m.id }))
)
const customerItems = computed(() =>
  (customers.value ?? []).map(c => ({ label: `${c.name} (${c.email})`, value: c.id }))
)

// ---------- Form state (prefilled from the URL) ----------
const mediaId = ref<number | undefined>(route.query.media_id ? Number(route.query.media_id) : undefined)
const customerId = ref<number | undefined>()
const startsAt = ref(String(route.query.starts_at ?? ''))
const endsAt = ref(String(route.query.ends_at ?? ''))

const selectedMedia = computed(() => mediaPage.value?.data.find(m => m.id === mediaId.value))

// ---------- Estimated price ----------
const datesValid = computed(() => !!startsAt.value && !!endsAt.value && endsAt.value >= startsAt.value)

const days = computed(() => {
  if (!datesValid.value) return 0
  const diff = new Date(endsAt.value + 'T00:00:00Z').getTime() - new Date(startsAt.value + 'T00:00:00Z').getTime()
  return Math.round(diff / 86400000) + 1 // inclusive, same as the backend
})

const estimatedTotal = computed(() =>
  selectedMedia.value ? days.value * Number(selectedMedia.value.price_per_day) : 0
)

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

// ---------- Live availability check ----------
const availability = ref<{ available: boolean } | null>(null)

watch([mediaId, startsAt, endsAt], async () => {
  availability.value = null
  if (!mediaId.value || !datesValid.value) return
  try {
    availability.value = await $fetch(`/api/media/${mediaId.value}/availability`, {
      baseURL: apiBase,
      headers,
      query: { starts_at: startsAt.value, ends_at: endsAt.value }
    })
  } catch {
    availability.value = null
  }
}, { immediate: true })

// ---------- New customer ----------
const showNewCustomer = ref(false)
const newCustomer = reactive({ name: '', email: '', phone: '' })
const creatingCustomer = ref(false)
const customerError = ref('')

async function createCustomer() {
  creatingCustomer.value = true
  customerError.value = ''
  try {
    const created = await $fetch<{ data: Customer }>('/api/customers', {
    baseURL: apiBase,
    headers,
    method: 'POST',
    body: { name: newCustomer.name, email: newCustomer.email, phone: newCustomer.phone || null }
  })
  await refreshCustomers()
  customerId.value = created.data.id
    showNewCustomer.value = false
    Object.assign(newCustomer, { name: '', email: '', phone: '' })
    toast.add({ title: 'Cliente creado', color: 'success' })
  } catch (e) {
    customerError.value = errorMessage(e)
  } finally {
    creatingCustomer.value = false
  }
}

// ---------- Submit booking ----------
const submitting = ref(false)
const submitError = ref('')

const canSubmit = computed(() =>
  !!mediaId.value && !!customerId.value && datesValid.value && availability.value?.available !== false
)

async function submit() {
  submitting.value = true
  submitError.value = ''
  try {
    await $fetch('/api/bookings', {
      baseURL: apiBase,
      headers,
      method: 'POST',
      body: {
        media_id: mediaId.value,
        customer_id: customerId.value,
        starts_at: startsAt.value,
        ends_at: endsAt.value
      }
    })
    toast.add({ title: 'Reserva creada', color: 'success' })
    await navigateTo('/bookings')
  } catch (e) {
    submitError.value = errorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold">Crear reserva</h1>

    <UCard>
      <div class="space-y-5">
        <UFormField label="Medio publicitario" required>
          <USelect
            v-model="mediaId"
            :items="mediaItems"
            placeholder="Selecciona un medio"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField label="Fecha de inicio" required>
            <UInput v-model="startsAt" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Fecha de fin" required>
            <UInput v-model="endsAt" type="date" :min="startsAt" class="w-full" />
          </UFormField>
        </div>

        <UAlert
          v-if="availability"
          :color="availability.available ? 'success' : 'warning'"
          variant="subtle"
          :title="availability.available ? 'El medio está disponible en esas fechas' : 'El medio no está disponible en esas fechas'"
        />

        <UFormField label="Cliente" required>
          <div class="flex gap-2">
            <USelect
              v-model="customerId"
              :items="customerItems"
              placeholder="Selecciona un cliente"
              class="w-full"
            />
            <UButton
              :label="showNewCustomer ? 'Cancelar' : 'Nuevo cliente'"
              :icon="showNewCustomer ? 'i-lucide-x' : 'i-lucide-user-plus'"
              color="neutral"
              variant="outline"
              @click="showNewCustomer = !showNewCustomer"
            />
          </div>
        </UFormField>

        <UCard v-if="showNewCustomer" variant="subtle">
          <div class="space-y-3">
            <UFormField label="Nombre completo" required>
              <UInput v-model="newCustomer.name" class="w-full" />
            </UFormField>
            <UFormField label="Correo electrónico" required>
              <UInput v-model="newCustomer.email" type="email" class="w-full" />
            </UFormField>
            <UFormField label="Teléfono (opcional)">
              <UInput v-model="newCustomer.phone" class="w-full" />
            </UFormField>

            <UAlert v-if="customerError" color="error" variant="subtle" :title="customerError" />

            <UButton
              label="Guardar cliente"
              :loading="creatingCustomer"
              :disabled="!newCustomer.name || !newCustomer.email"
              @click="createCustomer"
            />
          </div>
        </UCard>
      </div>

      <template #footer>
        <div class="space-y-4">
          <div v-if="selectedMedia && datesValid" class="flex items-center justify-between">
            <span class="text-sm text-muted">
              {{ days }} {{ days === 1 ? 'día' : 'días' }} × {{ money(Number(selectedMedia.price_per_day)) }}
            </span>
            <span class="text-xl font-bold">{{ money(estimatedTotal) }}</span>
          </div>

          <UAlert v-if="submitError" color="error" variant="subtle" :title="submitError" />

          <div class="flex justify-end gap-2">
            <UButton to="/bookings" label="Cancelar" color="neutral" variant="ghost" />
            <UButton label="Crear reserva" :loading="submitting" :disabled="!canSubmit" @click="submit" />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>