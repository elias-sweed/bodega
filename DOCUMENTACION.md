# Bodega POS — Documentación Técnica

Sistema de punto de venta (POS) para una bodega, construido en **5 fases incrementales**.
Este documento explica en detalle cada fase, el modelo de datos, los scripts SQL de Supabase
(línea por línea) y las convenciones internas del código.

---

## 1. Resumen general

| Aspecto | Detalle |
|---|---|
| Frontend | React 19 + TypeScript 6, Vite 8, Tailwind CSS v4 |
| Backend/Datos | Supabase (PostgreSQL + PostgREST) |
| Cliente de datos | `@supabase/supabase-js` con **tipos manuales de la base** |
| Ruteo | `react-router-dom` v7 (SPA con rewrites para Vercel) |
| Lint | oxlint (0 warnings / 0 errors) |
| Moneda | Sol peruano (**S/**, locale `es-PE`, Intl `PEN`) |
| Pantallas | Resumen (`/`), Caja (`/caja`), Inventario (`/inventario`), Compras (`/compras`) |

### Modelo de datos (PostgreSQL)

```
productos
  id (uuid PK, default gen_random_uuid())
  codigo_barras (text, UNIQUE, nullable)
  nombre (text NOT NULL)
  categoria (text NOT NULL)          -- texto libre
  precio_venta (numeric(12,2) >= 0)
  costo (numeric(12,2) >= 0)
  stock_actual (integer >= 0)
  stock_minimo (integer >= 0)
  created_at (timestamptz, default now())

ventas
  id (uuid PK)
  fecha (timestamptz, default now())
  total (numeric(12,2) >= 0)

detalle_ventas
  id (uuid PK)
  venta_id (uuid -> ventas.id, ON DELETE CASCADE)
  producto_id (uuid -> productos.id, ON DELETE SET NULL)
  cantidad (integer > 0)
  precio_unitario (numeric(12,2) >= 0)   -- precio congelado al momento de vender
  subtotal (numeric(12,2) >= 0)          -- precio_unitario * cantidad

proveedores
  id (uuid PK)
  nombre (text NOT NULL)
  empresa (text NULL)
  created_at (timestamptz, default now())

ingresos_mercaderia
  id (uuid PK)
  proveedor_id (uuid -> proveedores.id, ON DELETE SET NULL)
  producto_id (uuid -> productos.id, ON DELETE SET NULL)
  cantidad_ingresada (integer > 0)
  costo_total (numeric(12,2) >= 0)
  fecha (timestamptz, default now())
```

Funciones transaccionales (RPC): `registrar_venta(json)` y `registrar_ingreso(uuid, uuid, integer, numeric)`.

---

## 2. Estructura del proyecto

```
bodega/
├─ .env.example                 # Plantilla de credenciales Supabase
├─ .vercel.json                 # Rewrite SPA (todo cae a index.html)
├─ vite.config.ts               # plugins: react + tailwindcss v4
├─ package.json                 # scripts: dev, build, lint, preview
├─ supabase/
│  ├─ schema.sql                # Fase 2: tabla productos + RLS
│  ├─ ventas.sql                # Fase 3: ventas, detalle, registrar_venta
│  └─ compras.sql               # Fase 4: proveedores, ingresos, registrar_ingreso
└─ src/
   ├─ main.tsx                  # Bootstrapping de React
   ├─ App.tsx                   # Rutas: /, /caja, /inventario, /compras
   ├─ index.css                 # @import 'tailwindcss' (Tailwind v4)
   ├─ layouts/PosLayout.tsx     # Header global: logo, nav, fecha
   ├─ pages/
   │  ├─ DashboardPage.tsx      # Fase 5: resumen del día
   │  ├─ PosPage.tsx            # Fase 3: caja / cobro
   │  ├─ InventoryPage.tsx      # Fase 2: gestión de productos
   │  └─ PurchasesPage.tsx      # Fase 4: wizard de compras
   ├─ components/
   │  ├─ common/Toast.tsx
   │  ├─ dashboard/             # SalesTodayCard, LowStockList
   │  ├─ inventory/             # ProductTable, ProductFormModal, StockBadge
   │  ├─ pos/                   # Cart, CartItemRow, ProductGrid, ProductButton,
   │  │                         # CategoryGrid, CategoryButton, SearchBar
   │  └─ purchases/             # StepIndicator, ProveedorSelect, ProductoSelect, CostoStep
   ├─ hooks/
   │  ├─ useProducts.ts         # productos + CRUD básico
   │  ├─ useProveedores.ts      # proveedores
   │  └─ useDashboardStats.ts   # resumen del día
   ├─ services/
   │  ├─ supabase.ts            # cliente tipado (lanza si faltan variables)
   │  ├─ products.ts            # fetchProducts, insertProduct
   │  ├─ sales.ts               # registrarVenta (RPC)
   │  ├─ purchases.ts           # fetchProveedores, registrarIngreso (RPC)
   │  └─ dashboard.ts           # ventas de hoy + productos bajo stock
   ├─ types/
   │  ├─ index.ts               # Category, CartItem
   │  └─ database.types.ts      # Tipos manuales de la BD + tipo Database
   └─ utils/
      ├─ categories.ts          # deriveCategories (emojis + pastel)
      └─ format.ts              # formatMoney (PEN)
```

---

## 3. Configuración y arranque

### Variables de entorno

`.env.example`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

`src/services/supabase.ts` valida en arranque que ambas existan; si falta alguna
lanza un error claro. El cliente se crea con `createClient<Database>(url, anonKey)`,
donde `Database` viene de `src/types/database.types.ts` para tener **tipado de extremo a extremo**
en las consultas (`.from('productos').insert(...)` sabe las columnas permitidas).

> Importante: `VITE_` es el prefijo obligatorio para que Vite exponga la variable al frontend.

### Scripts npm

```json
"dev": "vite",
"build": "tsc -b && vite build",
"lint": "oxlint",
"preview": "vite preview"
```

- `build` combina typecheck (`tsc -b`) y empaquetado para producción.
- `lint` usa oxlint, el linter que aplica la regla `react(set-state-in-effect)`
  (ver convenciones, §8).

### Despliegue (Vercel)

`.vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Como es una SPA con rutas de `react-router`, cualquier ruta como `/caja` debe servir
`index.html` de nuevo; este rewrite lo garantiza.

---

## 4. Fase 1 — Base de la aplicación POS

**Objetivo:** levantar el esqueleto de la app con la pantalla de Caja navegable.

### Decisiones clave

- **Vite + React + TS + Tailwind v4**: Tailwind v4 se integra vía el plugin
  `@tailwindcss/vite` y un único `@import 'tailwindcss';` en `index.css` (sin archivo
  `tailwind.config.js`). Esto permite además **utilidades dinámicas** (p. ej. `h-13`)
  porque la escala de spacing se genera bajo demanda.
- **Ruteo con `PosLayout`**: un solo layout de pantalla completa (header oscuro +
  `main` con scroll) envuelve todas las rutas. El `NavLink` marca la pestaña activa.
- **Componentes POS puros**: `SearchBar`, `CategoryGrid`/`CategoryButton`, `ProductGrid`/
  `ProductButton`, `Cart`/`CartItemRow` son componentes presentacionales que reciben
  datos por props.

### Diseño visual

- Tarjetas blancas `rounded-2xl/3xl` con `shadow-sm` y hover `shadow-md` + `active:scale-95`.
- Botón COBRAR verde esmeralda enorme (`text-2xl font-black`), deshabilitado si el carrito
  está vacío o mientras se procesa.
- Producto agotado (`stock_actual <= 0`): gris atenuado, `cursor-not-allowed` y badge "Agotado".
- `formatMoney` formatea con `Intl.NumberFormat` (`es-PE`, `PEN` → `S/ 12.00`).

### Tipos base (`src/types/index.ts`)

```ts
export interface Category { id: string; label: string; emoji: string; className: string }
export interface CartItem { product: ProductosRow; quantity: number }
```

`Category` se deriva de las categorías reales del catálogo (Fase 2); en Fase 1 existía
un `mockData.ts` con productos quemados que **fue eliminado** al conectar la base real.

---

## 5. Fase 2 — Inventario + Supabase

**Objetivo:** catálogo real en PostgreSQL, pantalla de Inventario con alta de productos.

### 5.1 Script `supabase/schema.sql` (línea por línea)

```sql
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo_barras text unique,
  nombre text not null,
  categoria text not null,
  precio_venta numeric(12, 2) not null default 0 check (precio_venta >= 0),
  costo numeric(12, 2) not null default 0 check (costo >= 0),
  stock_actual integer not null default 0,
  stock_minimo integer not null default 0,
  created_at timestamptz not null default now()
);
```

| Columna | Detalle |
|---|---|
| `id` | UUID generado por la propia BD (`gen_random_uuid()`); el cliente nunca envía el id. |
| `codigo_barras` | `UNIQUE` (cada código aparece una vez); nullable porque no todos los productos lo tienen. |
| `nombre` / `categoria` | `NOT NULL`; la categoría es **texto libre** (el dashboard de categorías se deriva de aquí). |
| `precio_venta` / `costo` | `numeric(12,2)` (hasta 10 dígitos enteros, 2 decimales) con `check >= 0`. |
| `stock_actual` / `stock_minimo` | enteros; el mínimo alimenta las alertas de reposición. |
| `created_at` | `timestamptz` (almacena instante UTC con zona), default `now()`. |

Índices y RLS:

```sql
create index productos_nombre_idx on public.productos (nombre);
create index productos_codigo_barras_idx on public.productos (codigo_barras);
alter table public.productos enable row level security;
create policy "productos_select" on public.productos for select using (true);
create policy "productos_insert" on public.productos for insert with check (true);
create policy "productos_update" on public.productos for update using (true);
create policy "productos_delete" on public.productos for delete using (true);
```

- **Índices**: aceleran búsqueda por nombre y por código de barras (usados en la Caja).
- **RLS** con políticas `using (true)` / `with check (true)`: en esta fase **no hay**
  autenticación, así que cualquier rol anónimo puede leer y escribir. Las políticas
  existen desde el inicio para que, cuando se añada Supabase Auth, solo haya que
  reemplazar `true` por `auth.uid()` — la infraestructura ya está montada.

### 5.2 Tipos de la base — la regla crítica

`src/types/database.types.ts` define los tipos y un objeto `Database` que se pasa a
`createClient<Database>()`. **Punto importante descubierto durante el desarrollo:**

> Los tipos de fila deben ser **`export type` (type alias), NUNCA `interface`**.
> Al definir tablas con un `interface`, el tipo no satisface el constraint interno
> `GenericTable extends Record<string, unknown>` de `supabase-js` (las interfaces de
> TypeScript no tienen índice implícito), y las operaciones tipadas colapsan a `never[]`,
> rompiendo silenciosamente el tipado de `insert`/`update`.

Ejemplo del patrón correcto:

```ts
export type ProductosRow = {
  id: string
  codigo_barras: string | null
  nombre: string
  precio_venta: number
  costo: number
  stock_actual: number
  stock_minimo: number
  categoria: string
  created_at: string
}
export type ProductosInsert = Omit<ProductosRow, 'id' | 'created_at'>
export type ProductosUpdate = Partial<ProductosInsert>
```

`ProductosRow` es la forma que devuelve la base; `Insert` omite los campos que la BD
genera; `Update` es parcial. La generación manual mantiene el control total sin depender
de `supabase gen types`.

### 5.3 Capa de datos y UI

- `services/products.ts`: `fetchProducts()` (`.select('*').order('nombre')`) e
  `insertProduct()` (`.insert(...).select().single()` para devolver el renglón creado).
- `hooks/useProducts.ts`: expone `{ products, loading, error, refresh, addProduct }`.
- `InventoryPage.tsx` muestra la **`ProductTable`** (columnas producto/código/categoría/
  precio/costo/stocks/estado; filas con stock bajo resaltadas en rosa suave) y abre el
  **`ProductFormModal`** (modal accesible `role="dialog"`, cierra con clic al fondo) para
  crear productos. `StockBadge` muestra "✓ En stock" o "⚠ Stock bajo".

---

## 6. Fase 3 — Ventas (la Caja cobra de verdad)

**Objetivo:** cobrar el carrito: insertar la venta + su detalle, **descontar stock** y
calcular el total, todo atómico.

### 6.1 Script `supabase/ventas.sql` (línea por línea)

```sql
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  total numeric(12, 2) not null default 0 check (total >= 0)
);
create table public.detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);
create index detalle_ventas_venta_id_idx on public.detalle_ventas (venta_id);
create index detalle_ventas_producto_id_idx on public.detalle_ventas (producto_id);
```

- `ventas` es el **encabezado**; `detalle_ventas` son las **líneas** (1 a N por venta).
- FKs:
  - `venta_id ... on delete cascade`: si se borra el encabezado, se borran sus líneas.
  - `producto_id ... on delete set null`: si se borra el producto, la línea **se conserva**
    con `producto_id = NULL`. Esto preserva el histórico de ventas (no perder cuentas por
    borrar un producto); el precio ya está congelado en `precio_unitario`.
- `precio_unitario` no dice `references`: aunque el producto cambie de precio después, el
  detalle conserva el precio cobrado. `subtotal = precio_unitario * cantidad` se calcula
  **en la base** (no se confía en cálculos del cliente).
- Índices en ambas FKs para joins rápidos (dashboard, historial).

RLS:

```sql
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;
create policy "ventas_select" on public.ventas for select using (true);
create policy "detalle_ventas_select" on public.detalle_ventas for select using (true);
```

Solo políticas de `select`: **no se permite insertar** `ventas` ni `detalle_ventas`
directamente desde el cliente. El único camino de escritura es la función RPC
`registrar_venta` (que corre como `security definer`). Esto es una protección deliberada:
ningún cliente "malicioso" puede insertar una venta sin pasar por la lógica de stock.

### 6.2 La función `registrar_venta(json)` — detalle profundo

```sql
create or replace function public.registrar_venta(p_articulos json)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta_id uuid;
  v_item json;
  v_producto_id uuid;
  v_cantidad integer;
  v_precio numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_stock_actual integer;
begin
  insert into public.ventas (total)
  values (0)
  returning id into v_venta_id;

  for v_item in select * from json_array_elements(p_articulos)
  loop
    v_producto_id := (v_item ->> 'producto_id')::uuid;
    v_cantidad := (v_item ->> 'cantidad')::integer;
    v_precio := (v_item ->> 'precio_unitario')::numeric(12, 2);

    select stock_actual into v_stock_actual
    from public.productos
    where id = v_producto_id
    for update;

    if not found then
      raise exception 'El producto % no existe', v_producto_id;
    end if;

    if v_stock_actual < v_cantidad then
      raise exception 'Stock insuficiente... (disponible: %)', v_producto_id, v_stock_actual;
    end if;

    v_subtotal := v_precio * v_cantidad;
    v_total := v_total + v_subtotal;

    insert into public.detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
    values (v_venta_id, v_producto_id, v_cantidad, v_precio, v_subtotal);

    update public.productos
    set stock_actual = stock_actual - v_cantidad
    where id = v_producto_id;
  end loop;

  update public.ventas
  set total = v_total
  where id = v_venta_id;

  return json_build_object('venta_id', v_venta_id, 'total', v_total);
end;
$$;
grant execute on function public.registrar_venta(json) to anon, authenticated;
```

Explicación de cada decisión:

1. **`security definer`**: la función se ejecuta con los permisos del **propietario** de la
   función (el rol que creó la tabla), no del cliente. Así puede `insert`/`update` sobre
   las tablas que al cliente le están vedadas por RLS, sin necesidad de dar permisos
   directos al rol `anon`.
2. **`set search_path = public`**: endurece la función contra *search-path hijacking*
   (evita que un esquema malicioso adelante a `public` con objetos homónimos).
3. **Parámetro `json`, entrada con `->>`**: el frontend manda `[{producto_id, cantidad,
   precio_unitario}, ...]`. `json_array_elements` itera cada elemento; `v_item ->> 'campo'`
   extrae texto y el cast `::uuid` / `::integer` / `::numeric(12,2)` valida el tipo.
4. **`for update` (Fila bloqueada)**: dentro de la transacción, el `select ... for update`
   **bloquea la fila de producto** hasta el commit/rollback. Si dos cajas cobran el mismo
   producto a la vez, la segunda se espera y al entrar ya ve el stock **ya descontado**.
   Esto evita la venta de más unidades de las existentes (race condition → stock negativo).
5. **`if not found`**: PL/pgSQL detecta que el `select into` no devolvió filas → el
   producto no existe → `raise exception`, que aborta **toda** la transacción.
6. **`if v_stock_actual < v_cantidad`**: la última barrera de integridad. La UI ya limita
   el carrito a `stock_actual`, pero la base **no confía en el cliente**.
7. **Atomiciad**: un `raise exception` revierte el `insert` del encabezado, las líneas
   insertadas antes y los updates de stock. Nunca quedarán ventas parciales. La función
   PL/pgSQL corre en una transacción implícita única.
8. **Resultado**: devuelve `{ venta_id, total }` con el total **calculado en la base**
   (suma de subtotales), y la UI lo muestra en el toast de éxito. Nota: el total enviado es
   0 y se recalcula; el campo `total` de la fila `ventas` lo fija la función.

### 6.3 Frontend del cobro

- `services/sales.ts` transforma `CartItem[]` al JSON esperado por la RPC
  (`producto_id`, `cantidad`, `precio_unitario` obtenido de `product.precio_venta`).
- `PosPage.tsx`:
  - Filtrado por **búsqueda** (nombre o código) o por **categoría** (grilla derivada).
  - `addProduct` / `increaseQuantity` **topan** la cantidad en `stock_actual`.
  - `decreaseQuantity` usa `flatMap` para eliminar el ítem si la cantidad llega a 1 o menos.
  - `handleCharge` llama a la RPC, limpia carrito y búsqueda, muestra toast
    "Venta por S/ X registrada" y hace `refresh(true)` (recarga **silenciosa** de productos,
    para que el stock descontado se refleje sin parpadeo de loading).
- `Toast` global fijo en la parte inferior, color verde (éxito) / rojo (error).

---

## 7. Fase 4 — Compras (ingreso de mercadería)

**Objetivo:** registrar ingresos de mercadería por proveedor y sumar stock.

### 7.1 Script `supabase/compras.sql` (línea por línea)

```sql
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text,
  created_at timestamptz not null default now()
);

create table public.ingresos_mercaderia (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid references public.proveedores(id) on delete set null,
  producto_id uuid references public.productos(id) on delete set null,
  cantidad_ingresada integer not null check (cantidad_ingresada > 0),
  costo_total numeric(12, 2) not null default 0 check (costo_total >= 0),
  fecha timestamptz not null default now()
);

create index ingresos_mercaderia_proveedor_id_idx on public.ingresos_mercaderia (proveedor_id);
create index ingresos_mercaderia_producto_id_idx on public.ingresos_mercaderia (producto_id);
create index ingresos_mercaderia_fecha_idx on public.ingresos_mercaderia (fecha);
```

- `proveedores` guarda el nombre (persona/negocio) y opcionalmente la empresa.
- `ingresos_mercaderia` queda como **histórico inmutable** de cada entrada: quién (proveedor),
  qué (producto), cuánto (`cantidad_ingresada > 0`) y su costo total. Las FKs usan
  `on delete set null` (si se borra un proveedor o producto el registro histórico sobrevive).
- Índices en las dos FKs **y en `fecha`** (útil para reportes por período).

RLS: solo `select` (igual patrón que ventas: la escritura pasa únicamente por la RPC).

```sql
create policy "proveedores_select" on public.proveedores for select using (true);
create policy "ingresos_select" on public.ingresos_mercaderia for select using (true);
```

+ seed de proveedores de ejemplo (`Juan Pérez / Distribuidora La Central`, etc.) para
  poder probar el dropdown sin configurar nada.

### 7.2 La función `registrar_ingreso(uuid, uuid, integer, numeric)` — detalle

```sql
create or replace function public.registrar_ingreso(
  p_proveedor_id uuid,
  p_producto_id uuid,
  p_cantidad integer,
  p_costo_total numeric(12, 2)
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ingreso_id uuid;
  v_stock_actual integer;
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  update public.productos
  set stock_actual = stock_actual + p_cantidad
  where id = p_producto_id
  returning stock_actual into v_stock_actual;

  if not found then
    raise exception 'El producto % no existe', p_producto_id;
  end if;

  insert into public.ingresos_mercaderia (proveedor_id, producto_id, cantidad_ingresada, costo_total)
  values (p_proveedor_id, p_producto_id, p_cantidad, p_costo_total)
  returning id into v_ingreso_id;

  return json_build_object('ingreso_id', v_ingreso_id, 'stock_actual', v_stock_actual);
end;
$$;
grant execute on function public.registrar_ingreso(uuid, uuid, integer, numeric)
  to anon, authenticated;
```

Decisión clave: `update ... returning stock_actual into v_stock_actual`.

- Primero **suma** la cantidad y captura el stock resultante en un solo statement
  (equivale a `select ... for update` + `update`, pero más compacto).
- `if not found` → el producto no existe → `raise exception` → rollback.
- Luego inserta la fila de ingreso (histórico).
- Devuelve `{ ingreso_id, stock_actual }`; el frontend muestra "7 unidades de X
  registradas (stock: N)" en el toast.
- Validación `p_cantidad <= 0` como primera línea, incluso antes de tocar datos.

Como `detalle_ventas` y `ingresos_mercaderia` escriben sobre la misma fila de
`productos`, ambas funciones operan con la exclusión de fila (`UPDATE` bloquea la fila),
así que una venta y un ingreso simultáneos nunca se pisan el stock.

### 7.3 Frontend: wizard de 3 pasos

`PurchasesPage.tsx` orquesta el flujo con un estado `step` (1..3) y un `StepIndicator`
(numérico, con ✓ en pasos completados y barra de progreso):

| Paso | Componente | Contenido |
|---|---|---|
| 1 | `ProveedorSelect` | Dropdown de proveedores (nombre — empresa). |
| 2 | `ProductoSelect` | Input de búsqueda por nombre/código que filtra un dropdown que muestra "nombre — stock: N". |
| 3 | `CostoStep` | Dos inputs numéricos: cantidad a ingresar (`min=1`) y costo total (`min=0`, 2 decimales). |

- Los botones **Siguiente →** se deshabilitan hasta llenar el paso actual; **← Atrás**
  retrocede (deshabilitado en paso 1); en paso 3 el botón es **Guardar ingreso**.
- Guardar: llama `registrarIngreso`, muestra toast de éxito con el **nuevo stock**,
  resetea el formulario a paso 1 y hace `refreshProductos(true)` para que Caja, Inventario
  y Dashboard reflejen el stock actualizado (silencioso, sin parpadeo).
- Estados: loader de proveedores, tarjeta de error con "Reintentar", y aviso en paso 2 si
  aún no hay productos en el catálogo.

---

## 8. Fase 5 — Dashboard analítico "Cero Esfuerzo"

**Objetivo:** pantalla de inicio con métricas del día sin esfuerzo.

### 8.1 Consultas (`services/dashboard.ts`)

**Ventas de hoy:**

```ts
function todayRange(): { start: string; end: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)                    // medianoche local (día actual)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)                // medianoche local (día siguiente)
  return { start: start.toISOString(), end: end.toISOString() }
}

const { data, error } = await supabase
  .from('ventas')
  .select('total')
  .gte('fecha', start)
  .lt('fecha', end)

return (data ?? []).reduce((sum, row) => sum + row.total, 0)
```

- Se toma la **medianoche local** y la del día siguiente; `.toISOString()` las convierte a
  UTC y PostgREST compara correctamente contra `timestamptz` (que guarda los instantes en
  UTC). El rango `[inicio, fin)` define "el día de hoy" sin importar la zona horaria del
  usuario.
- La suma se hace en el cliente sobre `total` (los `total` ya fueron calculados por la RPC
  en la base); para catálogos pequeños es más simple que una función de agregación.
- `.lt('fecha', end)` excluye ventas del futuro (protección extra).

**Productos por agotarse:**

```ts
const { data, error } = await supabase
  .from('productos')
  .select('*')
  .order('stock_actual', { ascending: true })

return (data ?? [])
  .filter((producto) => producto.stock_actual <= producto.stock_minimo)
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
```

Se filtra en JS porque PostgREST **no compara columna contra columna** en un `.lte()`
(solo valores literales). El dataset es pequeño, así que traer todo y filtrar es
correcto y simple.

### 8.2 Hook `useDashboardStats.ts`

Mismo patrón de `useProducts`: carga con `Promise.all` de ambas consultas en paralelo,
`cancelled` flag para evitar `setState` tras desmontaje, `reloadToken` para re-consultar y
`refresh(silent)` opcional.

### 8.3 UI

- **`SalesTodayCard`**: tarjeta grande con degradado `sky → indigo`, `text-6xl font-black`,
  "Ventas de Hoy" + `formatMoney(total)` (→ `S/ 1,234.56`) y mensaje motivador.
- **`LowStockList`**: filas con fondo pastel; **rojo** (`rose`) si `stock_actual === 0`
  ("Agotado") y **amarillo** (`amber`) si queda stock pero está por debajo del mínimo
  ("Por agotarse", mostrando "N en bodega · mín M"). Si no hay productos por reponer,
  tarjeta verde "Todo en orden".
- Encabezado con botón "Actualizar" (re-consulta) y estados de carga/error con "Reintentar".

### 8.4 Cambio de ruta

Con el Dashboard como pantalla de inicio, `PosPage` se movió a `/caja`:

```tsx
<Route path="/" element={<DashboardPage />} />
<Route path="/caja" element={<PosPage />} />
<Route path="/inventario" element={<InventoryPage />} />
<Route path="/compras" element={<PurchasesPage />} />
```

Y el nav quedó **Resumen · Caja · Inventario · Compras**. Además la moneda pasó a
`es-PE`/`PEN` (todo el sistema muestra S/) y la fecha del header usa `toLocaleDateString('es-PE')`.

---

## 9. Fase 6 — Autenticación, RLS e Historial de Transacciones

**Objetivo:** proteger la app y los datos con Supabase Auth + Google OAuth, recuperación
de contraseña sin el desarrollador, RLS estricto y un módulo de historial.

### 9.1 Aislamiento de datos (decisión)

El esquema está modelado como **una sola bodega**: ninguna tabla tiene `bodega_id`/
`organization_id`. Por ello la estrategia RLS correcta es `TO authenticated` (todo usuario
autenticado del proyecto accede a los datos). Un multitenancy con bodegas independientes
requeriría migración (tabla de perfiles + columna tenant + políticas con `auth.uid()`).

### 9.2 Script `supabase/auth.sql` (RLS)

- Elimina todas las políticas abiertas de las fases 2-4 (`using (true)` sin rol).
- **`productos`**: CRUD completo `TO authenticated` (SELECT/INSERT/UPDATE con `using` +
  `with check`/DELETE), porque el Inventario escribe directo.
- **`ventas`, `detalle_ventas`, `proveedores`, `ingresos_mercaderia`**: solo `SELECT` para
  `authenticated`. Las escrituras siguen pasando únicamente por las RPC
  `registrar_venta`/`registrar_ingreso` (`SECURITY DEFINER` del dueño de la tabla → no pasan
  por RLS, por eso el stock, los inserts y las validaciones continúan funcionando).
- **Revoca `execute` de `anon`** en ambas funciones RPC (solo `authenticated` las invoca).
- El rol `anon` queda sin políticas y sin RPC → no puede leer ni modificar nada.

### 9.3 Autenticación (`src/hooks/useAuth.ts`)

Contexto de autenticación dividido en 3 archivos (para mantener Fast Refresh limpio):
`src/context/AuthContext.ts` (tipos + `createContext`), `src/context/AuthProvider.tsx`
(estado y métodos) y `src/hooks/useAuth.ts` (hook consumidor). API expuesta: `user`,
`session`, `loading`, `signInWithGoogle(redirect?)`, `signInWithPassword(email, password)`,
`signOut()`, `resetPassword(email)` y `updatePassword(password)`.

- Estado global: `user`, `session`, `loading`.
- Inicialización: `supabase.auth.getSession()` + `supabase.auth.onAuthStateChange()`
  (eventos como `PASSWORD_RECOVERY` detectan el enlace de recuperación). Suscripción
  cancelada al desmontar + flag `active` contra condiciones de carrera.
- Las operaciones usan las APIs oficiales de Supabase Auth. No se almacenan
  contraseñas ni JWT propios.
- `getAppUrl()` usa `VITE_APP_URL` o `window.location.origin` (nada hardcodeado).

### 9.4 Páginas públicas y rutas protegidas

- `/login` (`LoginPage`): Google OAuth (ícono oficial), email/contraseña, "¿Olvidaste tu
  contraseña?" → `/forgot-password`. Si ya hay sesión re-dirige al destino guardado.
- `/forgot-password` (`ForgotPasswordPage`): mensaje **genérico** de éxito (no revela si
  el correo existe), evita doble envío.
- `/reset-password` (`ResetPasswordPage`): nueva contraseña + confirmación (mín 6, deben
  coincidir), actualiza, cierra sesión y redirige a `/login`. Si el enlace expiró muestra
  aviso → solicitar uno nuevo.
- `ProtectedRoute` (componente layout): while `loading` muestra "Cargando…"; sin sesión
  redirige a `/login?redirect=<ruta>`; con sesión renderiza `<Outlet />`. Protege `/`,
  `/caja`, `/inventario`, `/compras`, `/historial`.
- Google OAuth devuelve al usuario al mismo `redirect` original (rewrite del `redirectTo`).

### 9.5 Historial (`/historial`)

- Tabs **Ventas** / **Compras** (`HistoryPage`).
- **Ventas** (`VentasTab`): filas con ID corto, `fecha DESC` formateada `es-PE`
  (`07/09/2026 08:35` vía `formatDateTime`) y total; expansión lazy por fila que carga
  `detalle_ventas` + nombres de productos (con `fetchProductNames`). Productos borrados →
  "Producto eliminado".
- **Compras** (`ComprasTab`): tabla `ingresos_mercaderia` `fecha DESC` con proveedor y
  producto resueltos mapeando `proveedor_id`/`producto_id` contra sus tablas (sin joins con
  casts, completamente tipado). Cada ingreso histórico es **un producto por fila** (así está
  modelado en `ingresos_mercaderia`).
- Estados: loading, error con "Reintentar", empty states "No hay ventas/compras
  registradas todavía.", toasts para errores recuperables (sin texto SQL).

### 9.6 Layout y sesión

`PosLayout` pasó a renderizar `<Outlet />` + NavLink **Historial** + `UserMenu` (avatar de
Google, nombre desde `user_metadata` con fallback al email, botón "Cerrar sesión" con
loading que redirige a `/login`). `main.tsx` envuelve la app en `AuthProvider`.

### 9.7 Configuración externa (Supabase, Google, Vercel)

Ver el detalle completo en la sección de entregables del desarrollo de la Fase 6
(variables, Redirect URLs, OAuth Client ID/Secret, `VITE_APP_URL` en Vercel).

---

## 10. Convenciones internas del código

1. **Regla de tipado Supabase**: tipos de fila siempre `export type`, nunca `interface`
   (evita el colapso a `never[]` por el constraint `Record<string, unknown>`). §5.2.
2. **Patrón de hooks** (para lint `react(set-state-in-effect)`): dentro del `useEffect`,
   cualquier `setState` ocurre **después** de un `await` (post-microtarea), nunca en la
   primera renderización síncrona. El flag `cancelled` protege el desmontaje y `reloadToken`
   fuerza recargas.
3. **Recarga silenciosa**: `refresh(true)` recarga datos **sin** activar el estado de
   `loading` (usado tras cobrar o ingresar mercadería, para no parpadear).
4. **Escritura solo vía RPC**: `ventas`, `detalle_ventas`, `ingresos_mercaderia` no tienen
   políticas de escritura desde el cliente; todo pasa por funciones `security definer`
   transaccionales. `productos` sí tiene CRUD directo (Inventario).
5. **Toda operación crítica es atómica**: `registrar_venta` y `registrar_ingreso` corren en
   una sola transacción; un `raise exception` revierte todo. Nunca hay escrituras parciales.
6. **No confiar en el cliente**: precios, subtotales, totales y validación de stock se
   recalculan/validan en la base.
7. **Errores en cadena**: los servicios lanzan `Error(error.message)`; las páginas lo
   muestran en un toast o en una tarjeta con botón "Reintentar".
8. **Sin comentarios en el código**: los comentarios explicativos viven en los scripts SQL
   y en esta documentación, no en el TS.

---

## 11. Pendientes / mejoras posibles

- Añadir **Supabase Auth** y reemplazar las políticas `using (true)` por
  `auth.uid()` para multi-sucursal o personal con roles.
- Historial/exportación de ventas (la tabla `fecha` ya está indexada) y reportes de
  compras por período (`ingresos_mercaderia.fecha`).
- Recalcular el **costo promedio** del producto al registrar un ingreso (hoy solo suma stock).
- Editar/eliminar productos con soft-delete (FKs usan `set null`, el histórico se preserva).
- Paginación o filtros de categoría en Inventario.
- Verificación de stock durante el cobro si se usa en varias cajas simultáneas
  (el `for update` ya lo resuelve del lado de la base).