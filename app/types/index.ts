
export interface Customer {
  id: number
  name: string
  email: string
  phone: string | null
}

export interface Booking {
  id: number
  media_id: number
  customer_id: number
  starts_at: string
  ends_at: string
  total_price: number
  status: 'pending' | 'confirmed' | 'cancelled'
  media?: Media
  customer?: Customer
}

export interface Media {
  id: number
  name: string
  type: string
  location: string
  dimensions: string
  price_per_day: number | string
  status: 'active' | 'inactive'
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}