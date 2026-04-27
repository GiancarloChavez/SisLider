# SisLider — Plan de Implementación General (2 Semanas)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir SisLider, un sistema web de gestión académica que reemplaza procesos manuales en Excel, cubriendo Matrícula, Pagos, Asistencias y Clases para una institución educativa peruana.

**Architecture:** Next.js 15 Full Stack con App Router y Server Actions como capa de negocio, PostgreSQL como base de datos relacional, Prisma como ORM. Un único layout protegido para Secretaría — es el único rol que interactúa con el sistema. Padres consultan físicamente; docentes entregan lista en papel a secretaría.

**Tech Stack:** Next.js 15 · React 19 · TypeScript · Prisma 6 · PostgreSQL · Tailwind CSS 4 · shadcn/ui · NextAuth.js v5

---

## Mapa de 2 Semanas

```
Semana 1: Fundación + Módulos core
Semana 2: Módulos restantes + Integración + Entrega
```

---

## FASE 1 — Fundación del Proyecto (Días 1–2)

> Sin esto, nada más puede avanzar. Bloquea el resto del trabajo.

### Tarea 1.1: Inicializar el proyecto

- [ ] Crear proyecto Next.js 15 con TypeScript y Tailwind
  ```bash
  npx create-next-app@latest sislider --typescript --tailwind --app --src-dir
  ```
- [ ] Instalar dependencias core
  ```bash
  npm install prisma @prisma/client next-auth@beta
  npm install @auth/prisma-adapter
  npx shadcn@latest init
  ```
- [ ] Configurar estructura de carpetas por dominio
- [ ] Inicializar repositorio Git con commit inicial

### Tarea 1.2: Esquema de base de datos (Prisma)

> Traducir el diagrama ER a `schema.prisma`. Este es el contrato de todo el sistema.

- [ ] Definir los 14 modelos del ER:
  `Tutor · Alumno · TutorAlumno · Docente · Aula · Curso · Horario · Matricula · Asistencia · Recuperacion · Descuento · GrupoDescuento · MesPago · Abono`
- [ ] Configurar conexión PostgreSQL en `.env`
- [ ] Ejecutar primera migración: `npx prisma migrate dev --name init`
- [ ] Crear seed con datos de prueba realistas (2 cursos, 3 alumnos, pagos)
- [ ] Verificar relaciones con Prisma Studio: `npx prisma studio`

### Tarea 1.3: Autenticación (Secretaría)

- [ ] Configurar NextAuth.js v5 con credenciales (email + password)
- [ ] `usuarios` table: id, nombre, email, password_hash, activo, created_at (sin roles)
- [ ] Crear página `/login` con formulario (shadcn/ui)
- [ ] Implementar middleware que protege todas las rutas `/secretaria/**`
- [ ] Layout único para secretaría con navegación lateral

---

## FASE 2 — Módulo Matrícula (Días 3–4)

> Dominio central — todo lo demás (pagos, asistencias) depende de que exista una matrícula.

### Tarea 2.1: Gestión de Cursos y Horarios

- [ ] Página `/secretaria/cursos` — listar, crear, editar cursos
- [ ] Página `/secretaria/horarios` — asignar docente + aula + días/horas a un curso
- [ ] Formularios con validación (react-hook-form + zod)
- [ ] Server Actions: `createCurso`, `updateCurso`, `createHorario`

### Tarea 2.2: Registro de Alumnos y Tutores

- [ ] Página `/secretaria/alumnos` — listar y crear alumnos
- [ ] Formulario de alumno incluye datos del tutor/padre y vinculación TutorAlumno
- [ ] Server Actions: `createAlumno`, `createTutor`, `linkTutorAlumno`

### Tarea 2.3: Proceso de Matrícula

> El flujo TOBE: buscar → verificar cupo → seleccionar horario → registrar pago → habilitar alumno.

- [ ] Página `/secretaria/matriculas/nueva` — formulario de matrícula
  - Buscar alumno existente o crear nuevo
  - Mostrar horarios disponibles con cupo
  - Aplicar descuento si corresponde (GrupoDescuento)
  - Registrar matrícula y crear primer MesPago automáticamente
- [ ] Página `/secretaria/matriculas` — lista con estado (activa/inactiva/pendiente)
- [ ] Server Actions: `createMatricula`, `calcularDescuento`

---

## FASE 3 — Módulo Pagos (Días 5–6)

> Reemplaza los Excel de pagos dispersos. Todo vinculado al perfil del alumno.

### Tarea 3.1: Vista de estado financiero del alumno

- [ ] Página `/secretaria/pagos/[alumnoId]` — dashboard financiero
  - Saldo pendiente calculado automáticamente
  - Estado de habilitación (al día / deuda)
  - Historial de MesPago con sus Abonos

### Tarea 3.2: Registro de pagos

- [ ] Formulario de abono — pago completo o parcial
  - Seleccionar mes, monto, método de pago (efectivo/transferencia)
  - Actualizar estado del MesPago automáticamente
  - Cambiar habilitación del alumno si corresponde
- [ ] Server Actions: `registrarAbono`, `actualizarEstadoMesPago`, `actualizarHabilitacion`

### Tarea 3.3: Comprobante digital

- [ ] Generar PDF de comprobante con datos del pago (para entregar físicamente o imprimir)
- [ ] Botón de descarga en el dashboard financiero del alumno: `/secretaria/pagos/[alumnoId]`

---

## FASE 4 — Módulo Asistencias (Días 7–8)

> Vincula asistencia con perfil académico y financiero en tiempo real.

### Tarea 4.1: Registro de asistencia diaria

- [ ] Página `/secretaria/asistencias` — seleccionar curso y fecha
- [ ] Lista de alumnos matriculados en ese horario con toggle presente/ausente
- [ ] Al marcar ausencia: crear registro `Asistencia` con estado `AUSENTE` vinculado a la matrícula
- [ ] Server Actions: `registrarAsistencia`, `marcarAusencia`

### Tarea 4.2: Gestión de recuperaciones

- [ ] Al registrar ausencia: opción de agendar recuperación
- [ ] Formulario: seleccionar horario disponible del docente + fecha
- [ ] Notificación visible al padre en su portal
- [ ] Si la recuperación tiene costo: genera cargo automático en MesPago
- [ ] Server Actions: `agendarRecuperacion`, `generarCargoRecuperacion`

---

## FASE 5 — Integración y pulido (Días 9–11)

### Tarea 6.1: Búsqueda y filtros globales

- [ ] Buscador de alumnos por nombre/DNI en todas las vistas de secretaria
- [ ] Filtros en listas (por estado, por curso, por mes)
- [ ] Paginación en tablas con muchos registros

### Tarea 6.2: Dashboard de secretaria

- [ ] `/secretaria/dashboard` — métricas clave:
  - Matrículas activas del mes
  - Pagos pendientes
  - Asistencias del día
  - Recuperaciones agendadas

### Tarea 6.3: Validaciones y manejo de errores

- [ ] Validación de cupo antes de matricular
- [ ] Prevenir matrícula duplicada (mismo alumno + mismo horario)
- [ ] Mensajes de error claros en todos los formularios
- [ ] Loading states en Server Actions

### Tarea 6.4: UI final

- [ ] Tema consistente con shadcn/ui (colores, tipografía)
- [ ] Responsive para tablet (secretaria puede usar tablet)
- [ ] Feedback visual en acciones (toasts de éxito/error)

---

## FASE 6 — Testing y Entrega (Días 12–14)

### Tarea 6.1: Pruebas funcionales

- [ ] Flujo completo de matrícula (nuevo alumno → pago → habilitado)
- [ ] Flujo de pago fraccionado (abono parcial → estado pendiente)
- [ ] Flujo de asistencia con recuperación agendada
- [ ] Verificar que rutas `/secretaria/**` requieren login

### Tarea 6.2: Seed de datos de demostración

- [ ] Poblar BD con datos realistas para la demo:
  - 3 cursos (Matemáticas, Inglés, Programación)
  - 2 docentes
  - 5 alumnos con tutores
  - Matrículas activas y pagos del mes
  - Asistencias de la semana

### Tarea 6.3: Deploy

- [ ] Subir a Vercel (o Railway para la BD)
  ```bash
  vercel deploy --prod
  ```
- [ ] Variables de entorno en producción (DATABASE_URL, NEXTAUTH_SECRET)
- [ ] Verificar que el seed corra en producción

### Tarea 6.4: Documentación

- [ ] Actualizar `CLAUDE.md` con el stack y estructura final
- [ ] README con instrucciones de instalación y credenciales de demo

---

## Resumen de archivos principales

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (secretaria)/
│   │   ├── layout.tsx                  ← Nav + guard rol SECRETARIA
│   │   ├── dashboard/page.tsx
│   │   ├── alumnos/page.tsx
│   │   ├── cursos/page.tsx
│   │   ├── horarios/page.tsx
│   │   ├── matriculas/page.tsx
│   │   ├── matriculas/nueva/page.tsx
│   │   ├── pagos/[alumnoId]/page.tsx
│   │   └── asistencias/page.tsx
├── lib/
│   ├── actions/
│   │   ├── matricula.ts               ← Server Actions de matrícula
│   │   ├── pagos.ts
│   │   ├── asistencias.ts
│   │   └── cursos.ts
│   ├── auth.ts                        ← Config NextAuth
│   └── prisma.ts                      ← Cliente Prisma singleton
├── components/
│   ├── ui/                            ← shadcn/ui
│   └── sislider/                      ← Componentes propios
│       ├── AlumnoSearch.tsx
│       ├── AsistenciaTable.tsx
│       ├── PagoForm.tsx
│       └── MatriculaForm.tsx
└── prisma/
    ├── schema.prisma                  ← 14 modelos
    └── seed.ts
```

---

## Dependencias críticas entre fases

```
Fase 1 (Fundación)
    └── Fase 2 (Matrícula) ← necesita schema + auth
            └── Fase 3 (Pagos) ← necesita matrícula existente
            └── Fase 4 (Asistencias) ← necesita matrícula existente
                    └── Fase 5 (Pulido) ← todo lo anterior
                            └── Fase 6 (Entrega)
```

> **Regla:** No avanzar a la siguiente fase sin que la anterior tenga su flujo básico funcionando.

---

## Cronograma sugerido

| Día | Trabajo |
|-----|---------|
| 1 | Fase 1.1 + 1.2 (proyecto + schema) |
| 2 | Fase 1.3 (auth + roles) |
| 3 | Fase 2.1 + 2.2 (cursos + alumnos) |
| 4 | Fase 2.3 (flujo matrícula completo) |
| 5 | Fase 3.1 + 3.2 (estado financiero + abonos) |
| 6 | Fase 3.3 + inicio Fase 4 (comprobante + asistencia) |
| 7 | Fase 4.1 + 4.2 (asistencia + recuperaciones) |
| 8 | Fase 4.2 (recuperaciones) |
| 9 | Fase 5.1 + 5.2 (búsqueda + dashboard) |
| 10 | Fase 5.3 + 5.4 (validaciones + UI) |
| 11 | Buffer / completar pendientes |
| 12 | Fase 6.1 + 6.2 (testing + seed demo) |
| 13 | Fase 6.3 (deploy) |
| 14 | Fase 6.4 + ensayo de demo |
