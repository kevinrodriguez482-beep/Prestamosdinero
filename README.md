# 💰 Préstamos — Control de deudas

App para llevar registro de préstamos personales. Construida con Next.js, lista para Vercel.

## Características

- Registro de préstamos con nombre, monto, interés, fechas y notas
- Estados automáticos: Activo, Urgente (≤7 días), Vencido, Pagado
- Panel de estadísticas: por cobrar, total prestado, recuperado
- Filtros por estado, búsqueda por nombre, ordenamiento
- Datos guardados en `localStorage` (sin backend necesario)
- Diseño editorial oscuro con tipografía Playfair Display

## Deploy en Vercel

### Opción 1 — GitHub + Vercel (recomendado)

1. Crea un repo en GitHub y sube este proyecto
2. Ve a [vercel.com](https://vercel.com) → New Project → importa el repo
3. Vercel detecta Next.js automáticamente → Deploy ✓

### Opción 2 — Vercel CLI

```bash
npm install -g vercel
vercel
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura

```
prestamos-app/
├── pages/
│   ├── _app.js          # App wrapper
│   └── index.js         # Página principal
├── components/
│   ├── StatCard.js       # Tarjeta de estadística
│   ├── LoanCard.js       # Tarjeta de préstamo
│   ├── LoanModal.js      # Modal crear/editar
│   └── ConfirmModal.js   # Modal de confirmación
├── lib/
│   └── storage.js        # localStorage + utilidades
├── styles/
│   ├── globals.css
│   └── Home.module.css
└── next.config.js
```
