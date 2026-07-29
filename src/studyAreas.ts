export interface StudyArea {
  slug: string
  path: string
  name: string
  shortName: string
  description: string
}

export const STUDY_AREAS: StudyArea[] = [
  {
    slug: 'bbj',
    path: '/bbj',
    name: 'Bordo Benito Juárez',
    shortName: 'BBJ',
    description: 'Mapa, visitas, agua, fotos y reportes',
  },
]

export function studyAreaFromPath(pathname: string) {
  return STUDY_AREAS.find(area => (
    pathname === area.path || pathname.startsWith(`${area.path}/`)
  )) ?? null
}
