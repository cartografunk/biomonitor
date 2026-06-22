# biomonitor

Bitácora digital de visitas de campo — Bordo Benito Juárez  
Proyecto Lirio x Benito Juárez

## Stack

- React + TypeScript + Vite
- Supabase (PostgreSQL + PostGIS + Auth)
- MapLibre GL JS
- Cloudflare R2 (almacenamiento de fotos)
- GitHub Pages (hosting)

## Setup local

```bash
npm install
cp .env.example .env.local
# Llena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Deploy a GitHub Pages

```bash
# Solo la primera vez: cambia TU_USUARIO en package.json → homepage
npm run deploy
```

## Estructura

```
src/
  components/   # Componentes reutilizables
  pages/        # Pantallas principales (Mapa, Visita, Agua, Reportes)
  lib/          # supabase.ts y utilidades
  hooks/        # Custom hooks
  types/        # TypeScript interfaces
  styles/       # tokens.css + global.css
```

## Base de datos

Ver `bitacora_init.sql` para el esquema completo de Supabase + PostGIS.

## Puntos fijos

| Punto | Fotos requeridas | Coordenadas | Notas |
|-------|-----------------|-------------|-------|
| P1 | 2 | -100.3969, 20.6189 | Campo |
| P2 | 1 | -100.3935, 20.6205 | Campo |
| P3 | 1 | -100.4001, 20.6208 | Campo |
| P4 | 1 | — | Laboratorio · cono Imhoff + parámetros de agua |
