import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ?? ''

function getMexicoCityDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getMexicoCityDisplayDate(date = getMexicoCityDate()) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function formatShortDate(date = getMexicoCityDate()) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function r2Url(key: string | null | undefined) {
  if (!R2_PUBLIC_URL || !key) return ''
  return `${R2_PUBLIC_URL}/${key.replace(/^\/+/, '')}`
}

const TODAY = getMexicoCityDate()

type SectionKey =
  | 'datos_generales'
  | 'mantenimiento'
  | 'calidad_agua'
  | 'zona_litoral'
  | 'deshierbe'
  | 'infraestructura'

interface ReportForm {
  fecha: string
  responsable: string
  descripcion_general: string
  hora_llegada: string
  area_recorrido: string
  puntos_importancia: string
  desc_datos_generales: string
  inicio_jornada: string
  personal_operativo: string
  area_extraccion: string
  area_anterior: string
  areas_prioritarias: string
  desc_mantenimiento: string
  ingreso_cauce: string
  olor_agua: string
  aspecto_agua: string
  lodos_precipitables: string
  ingreso_canales: string
  nota_agua: string
  desc_calidad_agua: string
  estado_orillas: string
  acumulacion_materiales: string
  desc_zona_litoral: string
  zona_desmalezado: string
  cobertura_desmalezado: string
  institucion_desmalezado: string
  nucleo_desmalezado: string
  desc_deshierbe: string
  compuerta_cortina: string
  obra_toma_alta: string
  obra_toma_baja: string
  otras_acciones: string
  desc_infraestructura: string
}

interface WaterReport {
  temperatura_c: number | null
  ph: number | null
  conductividad: number | null
  solidos_disueltos: number | null
  oxigeno_disuelto_mgl: number | null
  oxigeno_disuelto_pct: number | null
}

type WaterParamKey = keyof WaterReport

interface WaterMeasurementRow extends WaterReport {
  visit_point_records: {
    visits: {
      visit_date: string
    } | null
    fixed_points: {
      point_number: number
    } | null
  } | null
}

interface WaterHistoryRecord extends WaterReport {
  visit_date: string
}

interface WaterParamConfig {
  key: WaterParamKey
  label: string
  unit: string
}

interface VisitPhotoRow {
  id: string
  storage_key: string
  thumbnail_key: string | null
  captured_at: string
  visit_point_records: {
    fixed_points: {
      point_number: number
      label: string
    } | null
  } | null
}

interface ReportImage {
  id: string
  name: string
  src: string
  source: 'visit' | 'manual'
  pointNumber?: number
}

interface FieldConfig {
  key: keyof ReportForm
  label: string
  placeholder: string
  rows?: number
  options?: string[]
}

interface SectionConfig {
  key: SectionKey
  title: string
  fields: FieldConfig[]
  descriptionKey: keyof ReportForm
}

const EMPTY: ReportForm = {
  fecha: TODAY,
  responsable: 'M. en GIC. Omar Carbajar Becerra',
  descripcion_general: 'Esta inspección consta de un recorrido diario en donde se realizan observaciones del ANP y se reportan los aspectos de importancia para su mantenimiento y correcto funcionamiento.',
  hora_llegada: '7:00 am',
  area_recorrido: 'Circuito completo del ANP.',
  puntos_importancia: 'Áreas prioritarias de extracción de lirio, periferia ANP, cauce principal de ingreso de agua al bordo, orillas del bordo, infraestructura hidráulica de desfogue del bordo y canales pluviales, zona núcleo del ANP.',
  desc_datos_generales: '',
  inicio_jornada: '7:00 am',
  personal_operativo: '2 personas.',
  area_extraccion: '',
  area_anterior: '',
  areas_prioritarias: '',
  desc_mantenimiento: 'Actividades de mantenimiento y extracción de lirio acuático en la Zona',
  ingreso_cauce: 'Con ingreso de agua.',
  olor_agua: 'Agua con olor a agua residual.',
  aspecto_agua: 'Ligera turbidez en el agua.',
  lodos_precipitables: '',
  ingreso_canales: 'Sin ingreso de agua.',
  nota_agua: '',
  desc_calidad_agua: 'Aspecto del agua que ingresa al bordo',
  estado_orillas: 'Orillas sin acumulación de lirio con incremento de área por la disminución de nivel de agua y superficies fangosas.',
  acumulacion_materiales: 'Zonas (Norte, Noreste y Noroeste) con acumulación excesiva de basura, restos leñosos y madera. Zona (Sur, Suroeste, Este), sin acumulación de residuos. Zona (Sureste), con acumulación de restos leñosos.',
  desc_zona_litoral: '',
  zona_desmalezado: 'Desmalezado de la periferia completa del ANP.',
  cobertura_desmalezado: '100% de la periferia del ANP.',
  institucion_desmalezado: 'INDEREQ',
  nucleo_desmalezado: 'Pendiente.',
  desc_deshierbe: 'Desmalezado realizado por INDEREQ en la periferia total del ANP.',
  compuerta_cortina: '',
  obra_toma_alta: '',
  obra_toma_baja: '',
  otras_acciones: '',
  desc_infraestructura: '',
}

const GATE_OPTIONS = [
  'Compuerta abierta con desfogue.',
  'Compuerta abierta sin desfogue.',
  'Compuerta cerrada.',
]

const WATER_PARAMS: WaterParamConfig[] = [
  { key: 'temperatura_c', label: 'Temperatura', unit: '°C' },
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'conductividad', label: 'Conductividad', unit: 'mS' },
  { key: 'solidos_disueltos', label: 'Sólidos disueltos', unit: 'ppt' },
  { key: 'oxigeno_disuelto_mgl', label: 'Oxígeno disuelto', unit: 'mg/L' },
  { key: 'oxigeno_disuelto_pct', label: 'Oxígeno disuelto', unit: 'OD%' },
]

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'datos_generales',
    title: '1.- Datos generales',
    descriptionKey: 'desc_datos_generales',
    fields: [
      { key: 'hora_llegada', label: 'Inicio de recorrido de inspección', placeholder: '09:00 am' },
      { key: 'area_recorrido', label: 'Área de recorrido diario', placeholder: 'Circuito completo del ANP.' },
      { key: 'puntos_importancia', label: 'Puntos de importancia en la inspección', placeholder: 'Áreas prioritarias...', rows: 3 },
    ],
  },
  {
    key: 'mantenimiento',
    title: '2.- Seguimiento a operaciones diarias de mantenimiento',
    descriptionKey: 'desc_mantenimiento',
    fields: [
      { key: 'inicio_jornada', label: 'Inicio de jornada de mantenimiento y extracción de lirio acuático', placeholder: '7:00 am' },
      { key: 'personal_operativo', label: 'Personal operativo de extracción', placeholder: '2 personas.' },
      { key: 'area_extraccion', label: 'Área de extracción de lirio', placeholder: 'Zona Noroeste del bordo.' },
      { key: 'area_anterior', label: 'Área anterior de extracción', placeholder: 'Zona Noreste...' },
      { key: 'areas_prioritarias', label: 'Áreas prioritarias para la extracción', placeholder: 'Zona Noroeste.' },
    ],
  },
  {
    key: 'calidad_agua',
    title: '3.- Calidad del agua',
    descriptionKey: 'desc_calidad_agua',
    fields: [
      { key: 'ingreso_cauce', label: 'Ingreso de agua al bordo por cauce principal', placeholder: 'Con ingreso de agua.' },
      { key: 'olor_agua', label: 'Olor del agua', placeholder: 'Agua con olor a...' },
      { key: 'aspecto_agua', label: 'Aspecto del agua que ingresa al bordo', placeholder: 'Ligera turbidez en el agua.' },
      { key: 'lodos_precipitables', label: 'Lodos precipitables en el agua de ingreso', placeholder: 'Sin inspección...' },
      { key: 'ingreso_canales', label: 'Ingreso de agua al bordo por canales pluviales secundarios', placeholder: 'Sin ingreso de agua.' },
      { key: 'nota_agua', label: 'Nota', placeholder: 'No se tomaron muestras...', rows: 2 },
    ],
  },
  {
    key: 'zona_litoral',
    title: '4.- Estado de zona litoral',
    descriptionKey: 'desc_zona_litoral',
    fields: [
      { key: 'estado_orillas', label: 'Estado general de orillas', placeholder: 'Orillas sin acumulación...', rows: 2 },
      { key: 'acumulacion_materiales', label: 'Acumulación de materiales en orillas', placeholder: 'Zonas norte...', rows: 3 },
    ],
  },
  {
    key: 'deshierbe',
    title: '5.- Deshierbe de maleza',
    descriptionKey: 'desc_deshierbe',
    fields: [
      { key: 'zona_desmalezado', label: 'Zona de desmalezado', placeholder: 'Periferia completa del ANP.' },
      { key: 'cobertura_desmalezado', label: 'Cobertura de desmalezado', placeholder: '100% de la periferia del ANP.' },
      { key: 'institucion_desmalezado', label: 'Institución que realiza desmalezado', placeholder: 'INDEREQ' },
      { key: 'nucleo_desmalezado', label: 'Desmalezado de zona núcleo con cuadrilla interinstitucional', placeholder: 'Pendiente.' },
    ],
  },
  {
    key: 'infraestructura',
    title: '6.- Infraestructura hidráulica',
    descriptionKey: 'desc_infraestructura',
    fields: [
      { key: 'compuerta_cortina', label: 'Estado de la compuerta de la cortina del bordo', placeholder: 'Selecciona el estado de la compuerta', options: GATE_OPTIONS },
      { key: 'obra_toma_alta', label: 'Estado de la obra de toma alta', placeholder: 'Selecciona el estado de la compuerta', options: GATE_OPTIONS },
      { key: 'obra_toma_baja', label: 'Estado de la obra de toma baja', placeholder: 'Selecciona el estado de la compuerta', options: GATE_OPTIONS },
      { key: 'otras_acciones', label: 'Otras acciones observadas', placeholder: 'Personal de la CEA...', rows: 3 },
    ],
  },
]

function createEmptyImages(): Record<SectionKey, ReportImage[]> {
  return {
    datos_generales: [],
    mantenimiento: [],
    calidad_agua: [],
    zona_litoral: [],
    deshierbe: [],
    infraestructura: [],
  }
}

const POINT_SECTION_MAP: Record<number, SectionKey> = {
  1: 'datos_generales',
  2: 'datos_generales',
  3: 'datos_generales',
  4: 'calidad_agua',
}

function addIfPresent(lines: string[], label: string, value: number | null, unit = '') {
  if (value !== null) {
    lines.push(`• ${label}: ${value}${unit ? ` ${unit}` : ''}`)
  }
}

function buildWaterBlock(water: WaterReport | null) {
  if (!water) return []

  const lines = ['Parámetros de agua (P4):']
  addIfPresent(lines, 'Temperatura', water.temperatura_c, '°C')
  addIfPresent(lines, 'pH', water.ph)
  addIfPresent(lines, 'Conductividad', water.conductividad, 'mS')
  addIfPresent(lines, 'Sólidos disueltos', water.solidos_disueltos, 'ppt')

  const oxygen = [
    water.oxigeno_disuelto_mgl !== null ? `${water.oxigeno_disuelto_mgl} mg/L` : null,
    water.oxigeno_disuelto_pct !== null ? `${water.oxigeno_disuelto_pct} OD%` : null,
  ].filter((value): value is string => value !== null)

  if (oxygen.length > 0) {
    lines.push(`• Oxígeno disuelto: ${oxygen.join(' / ')}`)
  }

  return lines.length > 1 ? lines : []
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function formatDelta(delta: number | null | undefined) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return '—'
  if (delta === 0) return '0'
  const formatted = formatMetric(Math.abs(delta))
  return `${delta > 0 ? '+' : '-'}${formatted}`
}

function waterTrend(delta: number | null | undefined) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return { label: '—', className: 'neutral', title: 'Sin toma anterior' }
  if (delta > 0) return { label: '▲', className: 'up', title: 'Subió' }
  if (delta < 0) return { label: '▼', className: 'down', title: 'Bajó' }
  return { label: '—', className: 'neutral', title: 'Sin cambio' }
}

function getWaterComparisonRows(water: WaterReport | null, history: WaterHistoryRecord[], selectedDate: string) {
  if (!water) return []

  const previousRows = history
    .filter(row => row.visit_date < selectedDate)
    .sort((a, b) => a.visit_date.localeCompare(b.visit_date))

  const previous = previousRows[previousRows.length - 1] ?? null

  return WATER_PARAMS
    .map(param => {
      const current = water[param.key]
      if (current === null) return null

      const previousValue = previous?.[param.key] ?? null
      const historicalValues = previousRows
        .map(row => row[param.key])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      const historicalAverage = historicalValues.length > 0
        ? historicalValues.reduce((sum, value) => sum + value, 0) / historicalValues.length
        : null
      const delta = previousValue !== null ? current - previousValue : null
      const trend = waterTrend(delta)

      return {
        ...param,
        current,
        previous: previousValue,
        previousDate: previous?.visit_date ?? null,
        delta,
        trendLabel: trend.label,
        trendClassName: trend.className,
        trendTitle: trend.title,
        historicalAverage,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
}

function buildText(form: ReportForm, water: WaterReport | null): string {
  const lines: string[] = []
  lines.push('Reporte de inspección — Bordo Benito Juárez')
  lines.push(getMexicoCityDisplayDate(form.fecha))
  lines.push(`Responsable: ${form.responsable}`)
  lines.push('')

  SECTION_CONFIGS.forEach(section => {
    lines.push(section.title)
    section.fields.forEach(field => {
      const value = form[field.key]
      if (value) lines.push(`- ${field.label}: ${value}`)
    })
    if (section.key === 'calidad_agua') {
      const waterBlock = buildWaterBlock(water)
      if (waterBlock.length > 0) lines.push(...waterBlock)
    }
    lines.push('')
  })

  return lines.join('\n').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function fetchAsDataUrl(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  return readFileAsDataUrl(new File([blob], 'letterhead-bbj.png', { type: blob.type }))
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

function sectionFieldsHtml(section: SectionConfig, form: ReportForm) {
  return section.fields
    .filter(field => form[field.key])
    .map(field => `
      <li>
        <span>${escapeHtml(field.label)}:</span>
        ${escapeHtml(form[field.key])}
      </li>
    `)
    .join('')
}

function waterHtml(water: WaterReport | null, history: WaterHistoryRecord[], selectedDate: string) {
  const rows = getWaterComparisonRows(water, history, selectedDate)
  if (rows.length === 0) return ''

  return `
    <div class="water-section">
      <h3>Parámetros fisicoquímicos</h3>
      <table class="water-table">
        <thead>
          <tr>
            <th>Parámetro</th>
            <th>Valor actual</th>
            <th>Unidad</th>
            <th>Tendencia</th>
            <th>Diferencial</th>
            <th>Promedio histórico</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td>${escapeHtml(formatMetric(row.current))}</td>
              <td>${escapeHtml(row.unit)}</td>
              <td class="trend ${row.trendClassName}" title="${escapeHtml(row.trendTitle)}">${escapeHtml(row.trendLabel)}</td>
              <td class="${row.trendClassName}">${escapeHtml(formatDelta(row.delta))}</td>
              <td>${escapeHtml(formatMetric(row.historicalAverage))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function photosHtml(form: ReportForm, section: SectionConfig, photos: ReportImage[], continuation = false) {
  if (photos.length === 0) return ''

  const gridClass = photos.length === 1 ? 'one' : photos.length === 2 ? 'two' : 'four'

  return `
    <table class="photo-table">
      <thead>
        <tr>
          <th>Fecha: ${escapeHtml(formatShortDate(form.fecha))}</th>
          <th>Descripción: ${escapeHtml(form[section.descriptionKey])}${continuation ? ' (continuación)' : ''}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="2">
            <div class="photo-grid ${gridClass}">
              ${photos.map(photo => `
                <figure>
                  <img src="${photo.src}" alt="${escapeHtml(photo.name)}" />
                </figure>
              `).join('')}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `
}

function printablePage(letterheadDataUrl: string, pageNumber: number, content: string) {
  return `
    <section class="pdf-page" style="background-image: url('${letterheadDataUrl}')">
      <main class="page-content">${content}</main>
      <div class="page-number">Página ${pageNumber}</div>
    </section>
  `
}

function buildPrintableReport(
  form: ReportForm,
  water: WaterReport | null,
  waterHistory: WaterHistoryRecord[],
  images: Record<SectionKey, ReportImage[]>,
  letterheadDataUrl: string
) {
  let pageNumber = 1
  const pages: string[] = []
  const [firstSection, ...otherSections] = SECTION_CONFIGS
  const firstPhotoGroups = chunk(images.datos_generales, 4)

  pages.push(printablePage(letterheadDataUrl, pageNumber++, `
    <h1>REPORTE DE INSPECCIÓN</h1>
    <table class="meta-table">
      <tbody>
        <tr><th>Fecha:</th><td>${escapeHtml(getMexicoCityDisplayDate(form.fecha))}</td></tr>
        <tr><th>Responsable:</th><td>${escapeHtml(form.responsable)}</td></tr>
        <tr><th>Descripción:</th><td>${escapeHtml(form.descripcion_general)}</td></tr>
      </tbody>
    </table>
    <h2>${escapeHtml(firstSection.title)}</h2>
    <ul class="section-list">${sectionFieldsHtml(firstSection, form)}</ul>
    ${firstPhotoGroups[0] ? photosHtml(form, firstSection, firstPhotoGroups[0]) : ''}
  `))

  firstPhotoGroups.slice(1).forEach(group => {
    pages.push(printablePage(letterheadDataUrl, pageNumber++, photosHtml(form, firstSection, group, true)))
  })

  otherSections.forEach(section => {
    const photoGroups = chunk(images[section.key], 4)
    pages.push(printablePage(letterheadDataUrl, pageNumber++, `
      <h2>${escapeHtml(section.title)}</h2>
      <ul class="section-list">${sectionFieldsHtml(section, form)}</ul>
      ${section.key === 'calidad_agua' ? waterHtml(water, waterHistory, form.fecha) : ''}
      ${photoGroups[0] ? photosHtml(form, section, photoGroups[0]) : ''}
    `))

    photoGroups.slice(1).forEach(group => {
      pages.push(printablePage(letterheadDataUrl, pageNumber++, photosHtml(form, section, group, true)))
    })
  })

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte BBJ ${escapeHtml(form.fecha)}</title>
        <style>
          @page { size: letter; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #d8d8d8;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
          }
          .pdf-page {
            width: 8.5in;
            height: 11in;
            position: relative;
            margin: 0 auto;
            overflow: hidden;
            page-break-after: always;
            background-size: 100% 100%;
            background-repeat: no-repeat;
          }
          .page-content {
            position: absolute;
            left: 0.58in;
            right: 0.58in;
            top: 1.18in;
            bottom: 0.72in;
          }
          h1 {
            margin: 0 0 0.22in;
            text-align: center;
            font-size: 15pt;
            line-height: 1.15;
            text-decoration: underline;
          }
          h2 {
            margin: 0.2in 0 0.12in;
            font-size: 10.5pt;
            font-weight: 400;
          }
          .meta-table, .photo-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          .meta-table th, .meta-table td,
          .photo-table th, .photo-table td {
            border: 1px solid #111;
          }
          .meta-table th {
            width: 24%;
            background: #e8e8e8;
            text-align: left;
            vertical-align: top;
            padding: 0.04in 0.08in;
          }
          .meta-table td {
            padding: 0.04in 0.08in;
            vertical-align: top;
          }
          .section-list {
            margin: 0 0 0.22in 0.38in;
            padding-left: 0.25in;
            font-size: 9.2pt;
            line-height: 1.45;
          }
          .section-list li {
            margin: 0 0 0.06in;
          }
          .section-list span {
            font-weight: 400;
          }
          .photo-table {
            margin-top: 0.14in;
          }
          .photo-table th {
            padding: 0.035in 0.06in;
            font-size: 8.5pt;
            text-align: center;
            font-weight: 700;
          }
          .photo-table td {
            padding: 0.08in;
          }
          .photo-grid {
            display: grid;
            gap: 0.06in;
            height: 5.2in;
          }
          .photo-grid.one {
            grid-template-columns: 1fr;
            height: 6.45in;
          }
          .photo-grid.two {
            grid-template-columns: repeat(2, 1fr);
            height: 5.9in;
          }
          .photo-grid.four {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
          }
          figure {
            margin: 0;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            overflow: hidden;
          }
          img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          h3 {
            margin: 0 0 0.08in;
            font-size: 9.5pt;
            font-weight: 700;
          }
          .water-section {
            margin: 0.12in 0 0.18in;
          }
          .water-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.8pt;
          }
          .water-table th,
          .water-table td {
            border: 1px solid #111;
            padding: 0.04in 0.045in;
            line-height: 1.2;
          }
          .water-table th {
            background: #e8e8e8;
            text-align: center;
            font-weight: 700;
          }
          .water-table td:nth-child(2),
          .water-table td:nth-child(3),
          .water-table td:nth-child(5),
          .water-table td:nth-child(6) {
            text-align: center;
          }
          .water-table .up {
            color: #17883b;
            font-weight: 700;
          }
          .water-table .down {
            color: #c62828;
            font-weight: 700;
          }
          .water-table .neutral {
            color: #666;
            font-weight: 700;
          }
          .water-table .trend {
            font-size: 11pt;
            line-height: 1;
            text-align: center;
          }
          .page-number {
            position: absolute;
            left: 0.55in;
            bottom: 0.34in;
            font-size: 8.5pt;
            color: #777;
          }
          @media screen {
            .pdf-page {
              margin: 24px auto;
              box-shadow: 0 8px 26px rgba(0,0,0,0.18);
            }
          }
          @media print {
            body { background: #fff; }
            .pdf-page { margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>${pages.join('')}</body>
    </html>`
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg)',
  outline: 'none',
  lineHeight: 1.5,
} satisfies React.CSSProperties

export default function ReportesView({
  role,
  visitDate,
  onVisitDateChange,
}: {
  role: UserRole | null
  visitDate: string
  onVisitDateChange: (date: string) => void
}) {
  const [form, setForm] = useState<ReportForm>({ ...EMPTY, fecha: visitDate })
  const [images, setImages] = useState<Record<SectionKey, ReportImage[]>>(createEmptyImages)
  const [visitImages, setVisitImages] = useState<Record<SectionKey, ReportImage[]>>(createEmptyImages)
  const [visitImagesLoading, setVisitImagesLoading] = useState(false)
  const [visitImagesError, setVisitImagesError] = useState<string | null>(null)
  const [water, setWater] = useState<WaterReport | null>(null)
  const [waterHistory, setWaterHistory] = useState<WaterHistoryRecord[]>([])
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const canEdit = role === 'editor'

  useEffect(() => {
    setForm(current => (
      current.fecha === visitDate ? current : { ...current, fecha: visitDate }
    ))
  }, [visitDate])

  useEffect(() => {
    let isMounted = true

    async function loadVisitImages() {
      setVisitImagesLoading(true)
      setVisitImagesError(null)
      setVisitImages(createEmptyImages())

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select('id')
        .eq('visit_date', form.fecha)
        .maybeSingle()

      if (!isMounted) return

      if (visitError) {
        setVisitImagesError('No se pudo buscar la visita de esa fecha.')
        setVisitImagesLoading(false)
        return
      }

      if (!visit?.id) {
        setVisitImagesLoading(false)
        return
      }

      const { data, error: photosError } = await supabase
        .from('photos')
        .select(`
          id,
          storage_key,
          thumbnail_key,
          captured_at,
          visit_point_records (
            fixed_points (
              point_number,
              label
            )
          )
        `)
        .eq('visit_id', visit.id)
        .order('captured_at', { ascending: true })

      if (!isMounted) return

      if (photosError) {
        setVisitImagesError('No se pudieron cargar las fotos ya registradas de la visita.')
        setVisitImagesLoading(false)
        return
      }

      const nextImages = createEmptyImages()

      ;((data ?? []) as unknown as VisitPhotoRow[]).forEach(photo => {
        const pointNumber = photo.visit_point_records?.fixed_points?.point_number
        if (!pointNumber) return

        const section = POINT_SECTION_MAP[pointNumber]
        const src = r2Url(photo.storage_key)
        if (!section || !src) return

        nextImages[section].push({
          id: `visit-${photo.id}`,
          name: `Punto ${pointNumber}${pointNumber === 4 ? ' · Cono Imhoff' : ''}`,
          src,
          source: 'visit',
          pointNumber,
        })
      })

      setVisitImages(nextImages)
      setVisitImagesLoading(false)
    }

    loadVisitImages()

    return () => {
      isMounted = false
    }
  }, [form.fecha])

  useEffect(() => {
    let isMounted = true

    async function loadWaterHistory() {
      const { data: rows, error: waterError } = await supabase
        .from('water_measurements')
        .select(`
          temperatura_c,
          ph,
          conductividad,
          solidos_disueltos,
          oxigeno_disuelto_mgl,
          oxigeno_disuelto_pct,
          visit_point_records (
            visits (
              visit_date
            ),
            fixed_points (
              point_number
            )
          )
        `)

      if (!isMounted) return

      if (waterError) {
        setWater(null)
        setWaterHistory([])
        return
      }

      const p4History = ((rows ?? []) as unknown as WaterMeasurementRow[])
        .map(row => {
          const visitDate = row.visit_point_records?.visits?.visit_date
          const pointNumber = row.visit_point_records?.fixed_points?.point_number
          if (!visitDate || pointNumber !== 4) return null

          return {
            visit_date: visitDate,
            temperatura_c: row.temperatura_c,
            ph: row.ph,
            conductividad: row.conductividad,
            solidos_disueltos: row.solidos_disueltos,
            oxigeno_disuelto_mgl: row.oxigeno_disuelto_mgl,
            oxigeno_disuelto_pct: row.oxigeno_disuelto_pct,
          }
        })
        .filter((row): row is WaterHistoryRecord => row !== null)
        .sort((a, b) => a.visit_date.localeCompare(b.visit_date))

      const current = [...p4History].reverse().find(row => row.visit_date === form.fecha)
      setWaterHistory(p4History)

      if (current) {
        setWater({
          temperatura_c: current.temperatura_c,
          ph: current.ph,
          conductividad: current.conductividad,
          solidos_disueltos: current.solidos_disueltos,
          oxigeno_disuelto_mgl: current.oxigeno_disuelto_mgl,
          oxigeno_disuelto_pct: current.oxigeno_disuelto_pct,
        })
      } else {
        setWater(null)
      }
    }

    loadWaterHistory()

    return () => {
      isMounted = false
    }
  }, [form.fecha])

  const text = useMemo(() => buildText(form, water), [form, water])
  const reportImages = useMemo(() => {
    const combined = {} as Record<SectionKey, ReportImage[]>
    SECTION_CONFIGS.forEach(section => {
      combined[section.key] = [...visitImages[section.key], ...images[section.key]]
    })
    return combined
  }, [images, visitImages])

  const set = (key: keyof ReportForm, value: string) =>
    setForm(current => ({ ...current, [key]: value }))

  const setReportDate = (value: string) => {
    onVisitDateChange(value)
    set('fecha', value)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const handleAddImages = async (section: SectionKey, files: FileList | null) => {
    if (!files?.length) return

    const nextImages = await Promise.all(Array.from(files).map(async file => ({
      id: `${section}-${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      src: await readFileAsDataUrl(file),
      source: 'manual' as const,
    })))

    setImages(current => ({
      ...current,
      [section]: [...current[section], ...nextImages],
    }))
  }

  const removeImage = (section: SectionKey, imageId: string) => {
    setImages(current => ({
      ...current,
      [section]: current[section].filter(image => image.id !== imageId),
    }))
  }

  const handlePrintPdf = async () => {
    setGenerating(true)
    try {
      const base = import.meta.env.BASE_URL || '/'
      const letterhead = await fetchAsDataUrl(`${base}letterhead-bbj.png`)
      const printable = buildPrintableReport(form, water, waterHistory, reportImages, letterhead)
      const printWindow = window.open('', '_blank')

      if (!printWindow) {
        alert('No se pudo abrir la vista de PDF. Permite ventanas emergentes para generar el reporte.')
        return
      }

      printWindow.document.open()
      printWindow.document.write(printable)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Reporte definitivo</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
          Formulario + imágenes + hoja membretada
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 150px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Encabezado</div>
          <Field
            label="Fecha"
            canEdit={canEdit}
            value={form.fecha}
            onChange={setReportDate}
            type="date"
          />
          <Field
            label="Responsable"
            canEdit={canEdit}
            value={form.responsable}
            onChange={value => set('responsable', value)}
            placeholder="Nombre del responsable"
          />
          <Field
            label="Descripción"
            canEdit={canEdit}
            value={form.descripcion_general}
            onChange={value => set('descripcion_general', value)}
            placeholder="Descripción general del reporte"
            rows={3}
          />
        </section>

        {SECTION_CONFIGS.map(section => (
          <section
            key={section.key}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{section.title}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Las imágenes se insertan completas, sin recorte. Si son muchas, el reporte agrega páginas.
              </div>
            </div>

            {section.fields.map(field => (
              <Field
                key={field.key}
                label={field.label}
                canEdit={canEdit}
                value={form[field.key]}
                onChange={value => set(field.key, value)}
                placeholder={field.placeholder}
                rows={field.rows}
                options={field.options}
              />
            ))}

            {section.key === 'calidad_agua' && (
              <WaterReadout water={water} history={waterHistory} selectedDate={form.fecha} />
            )}

            <Field
              label="Descripción para tabla de imágenes"
              canEdit={canEdit}
              value={form[section.descriptionKey]}
              onChange={value => set(section.descriptionKey, value)}
              placeholder="Descripción que irá junto a la fecha arriba de las fotos"
              rows={2}
            />

            <div>
              <label style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                display: 'block',
                marginBottom: 6,
              }}>
                Imágenes de la sección
              </label>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                {visitImagesLoading
                  ? 'Buscando fotos ya registradas para esta fecha...'
                  : visitImagesError
                    ? visitImagesError
                    : `${visitImages[section.key].length} foto(s) cargada(s) automáticamente de la visita.`}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!canEdit}
                onChange={event => {
                  handleAddImages(section.key, event.target.files)
                  event.currentTarget.value = ''
                }}
                style={{
                  width: '100%',
                  border: '1.5px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 10,
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-muted)',
                }}
              />
              {reportImages[section.key].length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 8,
                  marginTop: 10,
                }}>
                  {reportImages[section.key].map(image => (
                    <div key={image.id} style={{ position: 'relative' }}>
                      <img
                        src={image.src}
                        alt={image.name}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          display: 'block',
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        left: 4,
                        bottom: 4,
                        borderRadius: 999,
                        padding: '2px 6px',
                        background: image.source === 'visit' ? 'rgba(56,176,0,.9)' : 'rgba(0,0,0,.62)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        {image.source === 'visit' ? image.name : 'Manual'}
                      </span>
                      {canEdit && image.source === 'manual' && (
                        <button
                          onClick={() => removeImage(section.key, image.id)}
                          title="Quitar imagen"
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(0,0,0,.62)',
                            color: '#fff',
                            fontSize: 14,
                            lineHeight: '24px',
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        padding: '12px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <button
          onClick={handlePrintPdf}
          disabled={generating}
          style={{
            width: '100%',
            padding: '13px 0',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 15,
            fontWeight: 700,
            cursor: generating ? 'default' : 'pointer',
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? 'Preparando reporte...' : 'Generar PDF con membrete'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleWhatsApp}
            style={{
              flex: 1,
              padding: '11px 0',
              background: '#25D366',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            WhatsApp texto
          </button>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: '11px 0',
              background: 'none',
              color: 'var(--color-text-muted)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar texto'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  canEdit,
  placeholder,
  rows,
  options,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  canEdit: boolean
  placeholder?: string
  rows?: number
  options?: string[]
  type?: 'text' | 'date'
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      {options ? (
        <select
          value={value}
          disabled={!canEdit}
          onChange={event => onChange(event.target.value)}
          style={{ ...inputStyle, opacity: canEdit ? 1 : 0.65 }}
        >
          <option value="">{placeholder ?? 'Selecciona una opción'}</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : rows ? (
        <textarea
          value={value}
          disabled={!canEdit}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{ ...inputStyle, resize: 'vertical', opacity: canEdit ? 1 : 0.65 }}
        />
      ) : (
        <input
          type={type}
          value={value}
          disabled={!canEdit}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, opacity: canEdit ? 1 : 0.65 }}
        />
      )}
    </label>
  )
}

function WaterReadout({
  water,
  history,
  selectedDate,
}: {
  water: WaterReport | null
  history: WaterHistoryRecord[]
  selectedDate: string
}) {
  const rows = getWaterComparisonRows(water, history, selectedDate)

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg)',
      padding: 12,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        Parámetros fisicoquímicos cargados automáticamente
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Sin parámetros registrados para P4 / Cono Imhoff en la fecha seleccionada.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 620 }}>
            <thead>
              <tr>
                {['Parámetro', 'Actual', 'Unidad', 'Tendencia', 'Diferencial', 'Promedio histórico'].map(header => (
                  <th
                    key={header}
                    style={{
                      textAlign: header === 'Parámetro' ? 'left' : 'center',
                      color: 'var(--color-text-muted)',
                      borderBottom: '1px solid var(--color-border)',
                      padding: '5px 6px',
                      fontWeight: 700,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const trendColor = row.trendClassName === 'up'
                  ? '#17883b'
                  : row.trendClassName === 'down'
                    ? '#c62828'
                    : 'var(--color-text-muted)'

                return (
                  <tr key={row.key}>
                    <td style={{ padding: '6px', color: 'var(--color-text-muted)' }}>{row.label}</td>
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{formatMetric(row.current)}</td>
                    <td style={{ padding: '6px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{row.unit}</td>
                    <td
                      title={row.trendTitle}
                      style={{
                        padding: '6px',
                        textAlign: 'center',
                        color: trendColor,
                        fontWeight: 900,
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      {row.trendLabel}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center', color: trendColor, fontWeight: 700 }}>{formatDelta(row.delta)}</td>
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{formatMetric(row.historicalAverage)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
