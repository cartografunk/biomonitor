export type UserRole = 'editor' | 'visualizador'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface FixedPoint {
  id: string
  point_number: number
  label: string
  required_photos: number
  location: { type: 'Point'; coordinates: [number, number] } | null
  is_lab_point: boolean
  has_water_sampling: boolean
}

export interface Visit {
  id: string
  created_by: string
  visit_date: string
  status: 'completa' | 'incompleta'
  created_at: string
}

export interface VisitPointRecord {
  id: string
  visit_id: string
  fixed_point_id: string
  observations: string | null
  recorded_at: string
}

export interface WaterMeasurement {
  id: string
  visit_point_record_id: string
  temperatura_c: number | null
  ph: number | null
  conductividad: number | null
  solidos_disueltos: number | null
  oxigeno_disuelto_mgl: number | null
  oxigeno_disuelto_pct: number | null
  measured_at: string
}

export interface Photo {
  id: string
  visit_id: string
  visit_point_record_id: string | null
  extra_event_id: string | null
  storage_key: string
  thumbnail_key: string
  file_size_kb: number | null
  captured_at: string
}

export interface ExtraEvent {
  id: string
  visit_id: string
  created_by: string
  location: { type: 'Point'; coordinates: [number, number] }
  observations: string | null
  importance: 1 | 2 | 3
  recorded_at: string
}

export interface VisitPointStatus {
  visit_id: string
  visit_date: string
  point_number: number
  label: string
  required_photos: number
  is_lab_point: boolean
  has_water_sampling: boolean
  uploaded_photos: number
  photo_status: 'completo' | 'pendiente'
  has_water_measurements: boolean
}
