# ESPECIFICACIÓN COMPLETA DEL PROYECTO

> Documento funcional de referencia. El estado ejecutable final y el orden vigente de base de datos están en `README.md`; la migración final obligatoria es `supabase/corregimientos_finales.sql`. En la versión final, ADMIN administra productos, compras, ajustes y usuarios; CAJERO puede vender y consultar.

> Documento de contexto exhaustivo. Diseñado para ser leído por una IA (o un
> desarrollador nuevo) y permitir continuar, depurar o ampliar el proyecto sin
> tener que reconstruir la información desde cero.
>
> Generado a partir de la inspección real del código, los scripts SQL y las
> decisiones tomadas durante el desarrollo.

---

## 1. FICHA TÉCNICA

| Campo | Valor |
|---|---|
| Nombre del proyecto | **Bodega POS** |
| Tipo | Sistema de punto de venta (POS) web para una bodega / pequeño negocio |
| Plataforma | Web (responsive, se usa en computadora y en el celular del negocio) |
| Idioma de la UI | Español |
| Moneda | Soles (S/), formato `S/ 1,234.56` |
| URL de producción | https://evanlu.vercel.app |
| Hosting frontend | Vercel |
| Backend | Supabase (Auth + PostgreSQL + RLS + RPC) |
| Estado | Operativo en producción; Fases 1–6 + mejoras de integridad (v2) implementadas; SQL mejoras_v2 pendiente de ejecutar |

### Stack tecnológico (versiones de `package.json`)

| Capa | Tecnología |
|---|---|
| Framework | React 19.2 + TypeScript 6.0 |
| Build / dev | Vite 8.2, `@vitejs/plugin-react` |
| Router | react-router-dom 7.18 |
| Estilos | Tailwind CSS 4.3 (`@tailwindcss/vite`, sin archivo de config) |
| Íconos | lucide-react |
| Backend / BD | Supabase (`@supabase/supabase-js` 2.115) — PostgreSQL + Auth + RLS |
| Animación fondo auth | three.js 0.186 + `@react-three/fiber` 9.7 (componente `Beams`) |
| Linter | oxlint (~1.79), 0 warnings/errors |
| Tags/badges | Sin emojis en código; licencia y detalle de deps limpias (sin `ogl` ni íconos muertos) |

### Scripts disponibles

- `npm run dev` → Vite dev server
- `npm run build` → `tsc -b && vite build`
- `npm run lint` → `oxlint`
- `npm run preview` → sirve el build

---

## 2. ¿QUÉ ES / LA IDEA?

**Bodega POS** es un punto de venta en la nube para una bodega familiar.
Permite:

- **Vender** de forma rápida desde una cuadrícula de productos por categoría,
  con búsqueda por nombre/código de barras y cobro en **Efectivo, Yape o Plin**.
- **Llevar el inventario** (stock actual y mínimo, costo, precio, código de
  barras, categorías) y ajustarlo con **trazabilidad total** (entradas, salidas,
  mermas, ajustes manuales).
- **Registrar compras / ingresos de mercadería** a proveedores, recalculando el
  **costo ponderado** del producto automáticamente.
- **Auditar todo**: historial de ventas (con sus líneas), de compras/ingresos y
  de ajustes de stock.
- **Controlar quién entra y qué puede hacer** con roles `admin` / `cajero`
  gestionados desde una pantalla web.
- **Ver un dashboard** con ventas del día, producto más vendido, inventario
  bajo stock, etc.

La idea central: **un negocio pequeño no necesita una caja registradora cara ni
un ERP pesado**; necesita una herramienta simple, accesible desde cualquier
navegador, que registre cada venta y cada movimiento de stock de forma
confiable, sin hojas de Excel ni libretas.

---

## 3. PROBLEMA QUE RESUELVE (ORIGEN Y MOTIVACIÓN)

El proyecto nace del contexto real de una bodega familiar (los dueños: una
pareja y la hermana de uno de ellos). Problemas concretos que se enfrentaban:

1. **Ventas sin registro**: cada venta se cobraba y no quedaba constancia.
   Al cierre del día no se sabía cuánto se vendió, ni de qué productos, ni a qué
   precio (los precios cambiaban "en caliente" y luego se olvidaban).
2. **Inventario a ojo / en Excel**: el stock se controlaba contando a mano.
   El Excel (si existía) se desactualizaba, no servía en la bodega mientras se
   atendía y nadie lo mantenía con disciplina.
3. **Sin conocimiento del costo real**: se compraba mercadería a proveedores y
   no se sabía ni el margen de cada producto ni cuánto se gastaba en compras.
   El costo además cambia en cada compra, y no se calculaba.
4. **Mermas y sobrantes invisibles**: cuando algo se caía, se vencía o sobraba,
   no quedaba rastro. No se podía distinguir si el stock bajó por venta, por
   merma o por un error.
5. **Quién hace qué**: no había forma de distinguir entre el dueño (que puede
   editar/borrar) y el cajero (que solo vende). Cualquiera que accediera podía
   romper datos.
6. **Cobros, no facturas**: el negocio no emite facturas electrónicas; el
   "comprobante" es informal. Por eso el sistema no contempla RUC/SUNAT (ver
   sección 13, limitaciones), pero sí deja un **recibo imprimible o enviable por
   WhatsApp** para entregar al cliente.
7. **Acceso remoto y multiusuario**: los socios comparten un mismo local pero
   atienden en turnos distintos. Se necesita que cualquiera de ellos, desde su
   propio teléfono, vea el MISMO estado del negocio en tiempo real (p. ej. para
   no romper el stock entre turnos).

El software resuelve los 7 puntos: registro íntegro de ventas, inventario en
tiempo real con auditoría, cálculo de costo ponderado y márgenes, trazabilidad
de ajustes, roles, recibo informal imprimible/WhatsApp y sincronización en
tiempo real para varios usuarios.

---

## 4. OBJETIVOS

### 4.1 Objetivo general

Desarrollar un sistema de punto de venta web, multiusuario y en la nube, que
permita a una bodega familiar gestionar sus ventas, inventario y compras en
tiempo real desde cualquier dispositivo con navegador, protegiendo los datos
mediante autenticación y roles.

### 4.2 Objetivos específicos

1. Registar cada venta de forma atómica (encabezado + detalle + descuento de
   stock) sin riesgo de inventario inconsistente.
2. Mantener un inventario confiable con stock actual/mínimo, costo y margen,
   y con toda modificación de stock auditada.
3. Registrar compras e ingresos de mercadería y recalcular el costo unitario
   ponderado de cada producto tras cada compra.
4. Controlar el acceso por roles (admin/cajero) mediante una lista blanca de
   correos, con una pantalla de administración de usuarios.
5. Ofrecer reporte en tiempo real (dashboard) de ventas, productos y stock.
6. Proveer una experiencia cuidada (dark premium, animación de fondo, toasts,
   recibo imprimible/WhatsApp) propia de un producto profesional.
7. Garantizar la trazabilidad (historial de ventas, compras y ajustes) y
   seguridad a nivel de base de datos (RLS + funciones SECURITY DEFINER).

---

## 5. REQUISITOS FUNCIONALES (RF)

Organizados por módulo. Cada RF es verificable.

### 5.1 Autenticación y sesión

- **RF-01** Inicio de sesión con correo y contraseña mediante Supabase Auth.
- **RF-02** La recuperación de contraseña envía un enlace por correo (Supabase),
  con **máximo 3 intentos** y **enfriamiento de 3 horas** por dispositivo
  (persistido en `localStorage` como `pwd_reset_limit`).
- **RF-03** Solicitudes de recuperación en los intentos 2 y 3 requieren
  confirmación explícita (overlay) antes de enviar el correo.
- **RF-04** La ruta `/reset-password` está forzada a través de un componente
  `RecoveryRedirect` cuando la sesión trae `isPasswordRecovery`; permite poner
  la nueva contraseña y destruye la sesión de recuperación al terminar.
- **RF-05** El enlace de recuperación expirado/usado muestra estado "Enlace no
  válido" con vínculo a `/forgot-password`.
- **RF-06** La sesión es compartida entre pestañas (almacenamiento de Supabase);
  al cargar la app se resuelve el rol del usuario y hay un watchdog que reintenta
  la carga del rol si falla.
- **RF-07** Cerrar sesión desde el menú de usuario de la barra lateral.

### 5.2 POS (Pantalla de venta — `PosPage`)

- **RF-08** Mostrar categorías como botones y los productos en cuadrícula
  filtrada por categoría.
- **RF-09** Buscar productos por palabra (nombre) y por código de barras.
- **RF-10** Agregar/quitar productos al carrito con cantidades y subtotales.
- **RF-11** Cobrar por **Efectivo, Yape o Plin** mediante un **modal de cobro**
  (`PaymentModal`): para Efectivo el cajero escribe "Pagó con" y ve el **vuelto en
  vivo** (bloquea el botón si el pago es insuficiente). Enter en el modal confirma.
- **RF-12** Al confirmar el cobro, llamar a `registrar_venta` (transaccional,
  descuenta stock) y mostrar modal de **recibo**. Si falla por stock, **el
  carrito NO se pierde**: se avisa qué producto no alcanzó (mensaje humano) y el
  cajero ajusta la cantidad.
- **RF-13** Recibo: **Imprimir** (abre ventana limpia con `window.print()`) y
  **enviar por WhatsApp** vía `https://wa.me/?text=...` con el texto del recibo.
- **RF-14** **Suspender venta**: guarda en `localStorage`
  (`pos_venta_suspendida_v2`) solo `{producto_id, cantidad, metodo_pago}` (sin
  precios). Al **retomar**, el carrito se rehidrata con el **catálogo actual**
  (precios frescos), se omite lo que ya no existe y se ajusta la cantidad al
  stock disponible. Formato anterior (carrito con precios) se **migra** solo.

### 5.3 Inventario

- **RF-15** Listar productos con stock, costo, precio, margen y estado de stock.
- **RF-16** Crear producto (cualquier miembro, incluso el cajero cuando llega el
  proveedor): nombre, categoría, precio, costo, stock, stock mínimo, código de
  barras.
- **RF-17** Editar producto (**solo admin**, eje: la BD lo refuerza con RLS):
  se hace mediante `actualizar_producto()`, **átomica**: actualiza datos Y, si
  cambió el stock, lo ajusta dejando traza en `ingresos_mercaderia` (motivo
  "Edición: …"). Es una sola llamada (antes eran dos operaciones separadas).
- **RF-18** **Ajustar stock** con una sola operación que deja traza auditada:
  `registrar_ajuste_manual(producto, nuevo_stock, es_regalo, motivo)` registra
  entradas (+), mermas (−), sobrantes y regalos en `ingresos_mercaderia` con el
  signo que codifica la dirección. Valida stock no negativo.
- **RF-19** Badge visual de "bajo stock" (stock ≤ stock mínimo) y cero/negativo.

### 5.4 Compras e ingresos de mercadería

- **RF-21** Registrar una compra completa (varios productos) de forma **atómica**
  con `registrar_compra(proveedor, nombre, comprobante, items[])`: un solo viaje
  al servidor, `compra_id` generado por la BD, y "todo o nada" (o se registran
  todos los productos o ninguno). Por cada línea: aumenta stock, recalcula el
  **costo ponderado**
  (`(costo_previo*stock_actual + costo_total) / (stock_actual + cantidad)`) e
  inserta en `ingresos_mercaderia`.
- **RF-22** Selector de proveedor con opción rápida "Proveedor Varios / Sin
  Comprobante" y creación de proveedor **al vuelo** si no existe.
- **RF-23** Gestión de proveedores: listar, crear (cualquier miembro), editar y
  eliminar (solo admin). Modal `GestionProveedoresModal`.
- **RF-24** Un producto nuevo puede crearse "al vuelo" dentro del flujo de
  compra.

### 5.5 Historial

- **RF-25** Pestaña **Ventas**: listado de ventas con total, fecha y método de
  pago; ver detalle (líneas con producto, cantidad, precio, subtotal) y
  **Ganancia neta exacta** usando `detalle_ventas.costo_unitario` (snapshot del
  costo al momento de la venta; si la venta es vieja y no tiene snapshot, se cae
  al costo vigente del producto).
- **RF-26** Pestaña **Compras**: listado de ingresos de mercadería (fecha,
  proveedor, producto, cantidad, costo total, comprobante, motivo).
- **RF-27** Pestaña **Ajustes**: listado de movimientos de stock con
  tipo (entrada/salida), cantidad, motivo y stock resultante.

### 5.6 Usuarios y roles

- **RF-28** Lectura de acceso del usuario actual: su rol se consulta en
  `usuarios_autorizados` (política `select_own`).
- **RF-29** Página **Usuarios** (solo admin visible/enrutable): lista la
  whitelist completa, permite **agregar** un correo con rol, **cambiar rol** y
  **quitar acceso** (con confirmación; el admin no puede quitarse a sí mismo y
  **no se puede degradar/quitar al último admin**). La página avisa que la cuenta
  primero debe crearse en Supabase Auth.
- **RF-30** El menú lateral muestra el enlace "Usuarios" solo si
  `rol === 'admin'`, y el `UserMenu` muestra el badge Admin/Cajero.

### 5.7 Dashboard

- **RF-31** Ventas del día: total, conteo, desglose por método (Efectivo/Yape/Plin)
  y **ganancia estimada** — todo en UNA sola llamada `dashboard_resumen()`.
- **RF-32** Gasto en compras del mes y resumen de stock (total, con stock bajo,
  agotados) en tarjetas.
- **RF-33** Lista de productos con bajo stock — `LowStockList`.

### 5.8 UX / extras

- **RF-34** Toasts globales profesionales (arriba-derecha, barra de color,
  ícono, título y mensaje; animación `toast-enter`).
- **RF-35** Mensajes de error humanos y mapeados en `src/utils/errors.ts`
  (`getFriendlyError`: stock insuficiente con la cantidad disponible, FK, clave
  duplicada, permisos, no autorizado; `getAuthErrorMessage` para auth).
- **RF-36** Pantallas de autenticación con diseño premium: fondo animado 3D
  **Beams** (React Bits), tarjeta oscura con detalles dorados.
- **RF-37** Prompt-friendly: validación de stock, cantidades > 0, prevent
  double-submit con estados `submitting/disabled`.

---

## 6. REQUISITOS NO FUNCIONALES (RNF)

| # | Categoría | Requisito |
|---|---|---|
| RNF-01 | **Seguridad** | Acceso solo con sesión válida; un usuario NO autenticado no puede leer nada (rol `anon` sin políticas y sin ejecución de RPC). |
| RNF-02 | **Seguridad** | RLS activo en las 7 tablas. Acceso a datos por membresía (whitelist en `usuarios_autorizados`). UPDATE/DELETE de productos y proveedores solo `admin`. |
| RNF-03 | **Seguridad** | Escrituras críticas (venta, ingreso, ajustes) SOLO a través de RPC `SECURITY DEFINER` (nunca INSERT/UPDATE directo del cliente). |
| RNF-04 | **Integridad / Atomicidad** | Todas las operaciones de dinero/stock son transaccionales; ante cualquier fallo se revierte todo (bloqueo de filas con `FOR UPDATE`). |
| RNF-05 | **Concurrencia** | Dos cajeros cobrando a la vez no corrompen stock: la validación y el descuento ocurren dentro de la función con bloqueo de fila. |
| RNF-06 | **Rendimiento** | Interacción tipo POS < 1 s en la red del local; índices en columnas de filtrado (nombre, código de barras, FK, fechas). |
| RNF-07 | **Disponibilidad** | SPA estática en Vercel + BD gestionada en Supabase (SLA > 99 %). La app tolera recargas sin perder el carrito suspendido ni la sesión. |
| RNF-08 | **Usabilidad** | UI íntegramente en español; pensada para pantalla táctil de gran tamaño en el POS y responsive para móvil en el resto. |
| RNF-09 | **Mantenibilidad** | TypeScript estricto, lint oxlint 0 errores, separación por capas (pages/components/hooks/services/utils), tipos de BD generados en `database.types.ts`. |
| RNF-10 | **Auditabilidad** | Todo cambio de stock queda persistido (ventas→detalle, ingresos_mercaderia, ajustes_stock) con fecha, motivo y signo que codifica la dirección. |
| RNF-11 | **Privacidad** | Ningún secreto en el repo: solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` local (la anon key es pública por diseño; la seguridad real es RLS). |
| RNF-12 | **Escalabilidad** | Modelo actual de **una sola bodega** (tenant único). Multi-tenant exigiría migración (ver sección 16). |
| RNF-13 | **Accesibilidad básica** | `label`/`htmlFor`, `aria-hidden` en decorativos, foco en inputs, mensajes de estado legibles. |

---

## 7. ROLES Y MATRIZ DE PERMISOS

Definidos en `usuarios_autorizados(rol)` con `check (rol in ('admin','cajero'))`.

| Operación | admin | cajero |
|---|---|---|
| Vender (POS) | ✅ | ✅ |
| Registrar compra/ingreso | ✅ | ✅ |
| Crear producto | ✅ | ✅ |
| Crear proveedor (al vuelo) | ✅ | ✅ |
| Ver dashboard, historial, inventario | ✅ | ✅ |
| Editar producto | ✅ | ❌ |
| Borrar producto | ✅ | ❌ |
| Editar/borrar proveedor | ✅ | ❌ |
| Ajustar stock (entrada/salida/manual) | ✅ | ✅ (vía RPC) |
| Ver lista completa de usuarios | ✅ | ❌ (solo ve su propio rol) |
| Agregar/cambiar/quitar usuarios | ✅ | ❌ |
| Enlace "Usuarios" en el menú | ✅ | ❌ (oculto) |

La **seguridad real la impone la BD**, no la UI: aunque un cajero invoque el
front correcto con `UPDATE` a `productos`, la política RLS lo rechaza.

---

## 8. ARQUITECTURA Y FLUJO DE DATOS

### 8.1 Diagrama general

```
[Navegador: React SPA (Vite)]
   │  Supabase Auth (JWT en localStorage)
   ▼
[Supabase]
   ├── Auth (correo+contraseña, recovery de contraseña)
   ├── PostgreSQL
   │    ├── Tablas (6) ── RLS ── políticas por rol
   │    └── Funciones RPC (SECURITY DEFINER):
   │          registrar_venta · registrar_compra · registrar_ingreso
   │          registrar_ajuste_manual · actualizar_producto · dashboard_resumen
   │          es_admin · es_miembro
   └── REST/PostgREST (el cliente habla por la API de Supabase)

[Vercel] sirve el bundle estático (evanlu.vercel.app)
```

> Nota: la tabla `ajustes_stock` (y su RPC) fueron **eliminadas**: era una vía de
> auditoría sin uso real. Todo movimiento de stock se audita en
> `ingresos_mercaderia`.

### 8.2 Regla de oro de escritura

| Tabla | Lectura | Escritura |
|---|---|---|
| `productos` | SELECT directo (RLS) | INSERT directo (RLS); stock NO se escribe directo por el cliente salvo en alta inicial |
| Stock (cualquier tabla) | — | **Siempre vía RPC transaccional** |
| `ventas` / `detalle_ventas` | SELECT directo (RLS) | Solo `registrar_venta()` |
| `ingresos_mercaderia` | SELECT directo (RLS) | Solo `registrar_compra()` / `registrar_ingreso()` / `registrar_ajuste_manual()` / `actualizar_producto()` |
| `proveedores` | SELECT directo (RLS) | INSERT directo (RLS) + admins |
| `usuarios_autorizados` | SELECT propio o (admin) total | Solo admin (políticas) |

### 8.3 Flujo de una venta (cobro exitoso)

1. El cajero arma el carrito y pulsa **Cobrar** → modal `PaymentModal`.
2. Elige método; en **Efectivo** escribe "Pagó con" y ve el vuelto en vivo.
3. `sales.ts` invoca `registrar_venta({ p_articulos: JSON[], p_metodo_pago })`.
4. La función (plpgsql, `SECURITY DEFINER`, exige `es_miembro()`):
   - crea la fila en `ventas` (total 0 provisional),
   - por cada artículo: bloquea el producto (`FOR UPDATE`), valida existencia y
     stock suficiente, inserta línea en `detalle_ventas` (incl. **snapshot del
     costo** `costo_unitario`), descuenta stock,
   - actualiza `total` del encabezado,
   - devuelve `{ venta_id, total }`.
5. Si cualquier paso falla → `ROLLBACK` completo; si fue por **stock**, el
   cliente conserva el carrito y avisa qué producto no alcanzó; cualquier otro
   error se traduce con `getFriendlyError`.
6. Éxito → `ReceiptModal` con botones **Imprimir** y **WhatsApp**.

### 8.4 Flujo de recuperación de contraseña

1. `/forgot-password` valida el límite local (3 intentos / 3 h).
2. Confirma en intentos 2 y 3, y llama `resetPassword(email)`.
3. El correo (Supabase) lleva a `/reset-password?token=...`.
4. `RecoveryRedirect` detecta `isPasswordRecovery` y permite el cambio.
5. Al cambiarla → `signOut()` → `/login`.

---

## 9. ESQUEMA DE LA BASE DE DATOS (TABLA POR TABLA)

Base de datos única en Supabase (PostgreSQL). Todas las tablas están en
`public`, con **Row Level Security habilitado**. Prefijo de texto: la app usa
nombres en español (snake_case).

---

### 9.1 `productos`

Catálogo de productos.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | Identificador |
| `codigo_barras` | `text` | `unique` | Código de barras (opcional) |
| `nombre` | `text` | `not null` | Nombre visible |
| `categoria` | `text` | `not null` | Categoría (agrupación de la UI) |
| `precio_venta` | `numeric(12,2)` | `not null`, `default 0`, `check >= 0` | Precio de venta |
| `costo` | `numeric(12,2)` | `not null`, `default 0`, `check >= 0` | Costo unitario (ponderado, lo recalcula `registrar_ingreso`) |
| `stock_actual` | `integer` | `not null`, `default 0` | Stock disponible |
| `stock_minimo` | `integer` | `not null`, `default 0` | Umbral de bajo stock |
| `created_at` | `timestamptz` | `not null`, `default now()` | Alta |

Índices: `productos_nombre_idx` (`nombre`), `productos_codigo_barras_idx` (`codigo_barras`).

RLS: 4 políticas → `select` (miembro), `insert` (miembro), `update` (admin), `delete` (admin).

> Nota: `stock_actual` cambia por RPC (`registrar_venta`, `registrar_compra`,
> `registrar_ingreso`, `registrar_ajuste_manual`, `actualizar_producto`), no por
> UPDATE directo.

---

### 9.2 `ventas`

Encabezado de cada venta (una fila por venta).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | Identificador |
| `fecha` | `timestamptz` | `not null`, `default now()` | Momento de la venta |
| `total` | `numeric(12,2)` | `not null`, `default 0`, `check >= 0` | Importe total |
| `metodo_pago` | `text` | `not null`, `default 'Efectivo'`, `check in ('Efectivo','Yape','Plin')` | Forma de cobro |

RLS: 1 política → `select` (miembro). Escritura solo vía `registrar_venta()`.

---

### 9.3 `detalle_ventas`

Líneas de cada venta.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | Identificador |
| `venta_id` | `uuid` | `not null`, FK → `ventas(id)` **`on delete cascade`** | Venta padre |
| `producto_id` | `uuid` | FK → `productos(id)` **`on delete set null`** | Producto vendido |
| `cantidad` | `integer` | `not null`, `check > 0` | Unidades |
| `precio_unitario` | `numeric(12,2)` | `not null`, `check >= 0` | Precio cobrado (snapshot) |
| `subtotal` | `numeric(12,2)` | `not null`, `check >= 0` | `precio_unitario * cantidad` |
| `costo_unitario` | `numeric(12,2)` | (nullable) | **Snapshot del costo** al momento de la venta (para ganancia neta exacta); `null` en ventas previas a la migración |

Índices: `detalle_ventas_venta_id_idx` (`venta_id`), `detalle_ventas_producto_id_idx` (`producto_id`).

RLS: `select` (miembro). Escritura solo vía `registrar_venta()`.

---

### 9.4 `proveedores`

Catálogo de proveedores.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | Identificador |
| `nombre` | `text` | `not null` | Nombre del proveedor |
| `empresa` | `text` | (nullable) | Empresa / razón social |
| `created_at` | `timestamptz` | `not null`, `default now()` | Alta |

RLS: 4 políticas → `select` (miembro), `insert` (miembro), `update` (admin), `delete` (admin).

> El proveedor ficticio **"Proveedor Varios / Sin Comprobante"** es una opción
> fija del selector de compras (no se guarda en la tabla).

---

### 9.5 `ingresos_mercaderia`

Historial de compras/ingresos **y** de ajustes manuales (sobrantes/mermas,
cuyas cantidades/costos pueden ser **negativos**).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | Identificador |
| `compra_id` | `uuid` | (nullable) | Identificador de compra (opcional) |
| `proveedor_id` | `uuid` | FK → `proveedores(id)` **`on delete set null`** | Proveedor |
| `nombre_proveedor` | `text` | (nullable) | Snapshot del nombre de proveedor |
| `producto_id` | `uuid` | FK → `productos(id)` **`on delete set null`** | Producto afectado |
| `cantidad_ingresada` | `integer` | `not null`, `check <> 0` | Cantidad (+ compra / − merma o salida por ajuste) |
| `costo_total` | `numeric(12,2)` | `not null`, `default 0` | Costo (negativo en mermas) |
| `comprobante` | `text` | (nullable) | Factura/boleta N° |
| `motivo` | `text` | (nullable) | Motivo del ajuste (visible en Historial) |
| `fecha` | `timestamptz` | `not null`, `default now()` | Fecha |

Índices: `ingresos_mercaderia_proveedor_id_idx`, `..._producto_id_idx`,
`..._fecha_idx`, `..._compra_id_idx`.

RLS: `select` (miembro). Escritura solo vía RPC (`registrar_ingreso`, `registrar_ajuste_manual`).

---

### 9.6 (Eliminada) `ajustes_stock`

La tabla `ajustes_stock` y su función `registrar_ajuste_stock()` fueron creadas
en una fase previa pero **nunca se usaron** en la UI (todo ajuste se audita en
`ingresos_mercaderia` con signo). `supabase/mejoras_v2.sql` las **elimina**.
El esquema queda con **6 tablas**.

### 9.7 `usuarios_autorizados`

Lista blanca de acceso (Seguridad real del sistema).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `email` | `text` | **PK** | Correo del usuario (match con `auth.jwt() ->> 'email'`) |
| `rol` | `text` | `not null`, `check in ('admin','cajero')` | Rol |
| `created_at` | `timestamptz` | `not null`, `default now()` | Alta |

RLS: 5 políticas →
- `select_own`: cada usuario ve solo su propio email (lee su rol al cargar);
- `select_admin`: el admin ve la lista completa (usa `es_admin()`);
- `insert/update/delete_admin`: solo admin (usando `es_admin()`).

Semillas (en `roles.sql`): `pedro@gmail.com` (admin), `slunal@ucvvirtual.edu.pe` (admin).

---

## 10. FUNCIONES RPC (lógica de negocio en la BD)

Todas son `SECURITY DEFINER` (corren con permisos del dueño de la tabla; no
pasan por RLS) y ejecutan **bloqueos de fila** (`FOR UPDATE`) para garantizar
concurrencia segura. El cliente nunca escribe stock/ventas directo.

### 10.1 `registrar_venta(p_articulos json, p_metodo_pago text default 'Efectivo') → json`

- **Firma SQL**: `registrar_venta(json, text)`.
- **Retorna**: `{ "venta_id": uuid, "total": numeric }`.
- **Lógica**:
  1. exige `es_miembro()` (whitelist) — es `SECURITY DEFINER` y no debe poder
     llamarla un usuario de la cuenta que no esté autorizado;
  2. INSERT en `ventas` (total 0) → captura `id`;
  3. por cada elemento de `p_articulos` (`producto_id`, `cantidad`,
     `precio_unitario`): bloquea `productos`, valida existencia y stock
     (`stock_actual >= cantidad`, si no → error con id y disponible), inserta
     línea de `detalle_ventas` con **`costo_unitario`** (costo del producto en
     ese momento), resta stock, acumula `subtotal`/`total`;
  4. `UPDATE ventas SET total`.
- **Grants**: `authenticated`.

### 10.2 `registrar_ingreso(p_compra_id uuid, p_proveedor_id uuid, p_nombre_proveedor text, p_producto_id uuid, p_cantidad integer, p_costo_total numeric, p_comprobante text) → json`

- **Retorna**: `{ "ingreso_id": uuid, "stock_actual": integer }`.
- **Lógica**: exige `es_miembro()`; si `cantidad <= 0` → error; bloquea el
  producto; suma stock y **recalcula el costo ponderado**:
  `costo = round((costo_previo * stock_actual + costo_compra) / (stock_actual + cantidad), 2)`;
  inserta en `ingresos_mercaderia` (normaliza con `nullif(trim(...), '')`).
- **Nota**: hoy la UI usa `registrar_compra()` (atómica multi-producto); esta
  función queda como primitiva de un solo ítem.
- **Grants**: `authenticated`.

### 10.3 `registrar_ajuste_manual(p_producto_id uuid, p_nuevo_stock integer, p_es_regalo boolean, p_motivo text default 'Corrección de inventario') → json`

- **Retorna**: `{ "ingreso_id": uuid|null, "stock_actual": integer, "delta": integer }`.
- **Lógica**: exige `es_miembro()`; valida `nuevo_stock >= 0`; recalcula
  `delta = nuevo − actual`; si `delta = 0` devuelve sin registrar; fija
  `stock_actual = nuevo`; inserta fila en `ingresos_mercaderia` con
  `nombre_proveedor = 'Ajuste Manual de Inventario'` y **cantidad/costo con el
  signo del delta**:
  - `delta > 0` → sobrante, `costo = costo * delta` (o `0` si `es_regalo`);
  - `delta < 0` → merma, cantidad y costo negativos.
- **Grants**: `authenticated`. Es la **única** vía de ajuste de stock en la UI.

### 10.4 `registrar_compra(p_proveedor_id uuid, p_nombre_proveedor text, p_comprobante text, p_items json) → json`

- **Retorna**: `{ "compra_id": uuid, "total": numeric, "items": int }`.
- **Lógica**: exige `es_miembro()`; genera `compra_id` con `gen_random_uuid()`;
  valida que `items` no esté vacío y que cada línea tenga cantidad > 0 y costo
  total ≥ 0; por cada ítem bloquea el producto, suma stock, recalcula costo
  ponderado e inserta en `ingresos_mercaderia` con el mismo `compra_id`.
- **Atomicidad real**: o se registran TODOS los productos o NINGUNO (ROLLBACK
  automático ante cualquier error). Sustituye al bucle cliente de N llamadas.
- **Grants**: `authenticated`.

### 10.5 `actualizar_producto(p_id uuid, p_nombre text, p_categoria text, p_codigo_barras text, p_precio_venta numeric, p_costo numeric, p_stock_minimo integer, p_nuevo_stock integer default null, p_motivo text default 'Corrección de inventario') → json`

- **Retorna**: `{ "producto_id": uuid, "stock_actual": integer|null, "delta": int }`.
- **Lógica**: exige `es_admin()` (solo admin); valida nombre/categoría no vacíos
  y valores no negativos; si `p_nuevo_stock` viene, ajusta el stock en la Misma
  transacción y deja traza en `ingresos_mercaderia`
  (`nombre_proveedor = 'Ajuste Manual de Inventario'`, motivo `'Edición: …'`).
- **Grants**: `authenticated`.

### 10.6 `dashboard_resumen() → json`

- **Retorna** `{ ventas_hoy_total, ventas_hoy_count, efectivo_hoy, yape_hoy,
  plin_hoy, gasto_compras_mes, ganancia_estimada_hoy, total_productos,
  bajos_stock, agotados }`.
- **Lógica**: exige `es_miembro()`; un solo query agregado al día local
  (Lima): ventas del día (total + conteo + por método), gasto del mes
  (`ingresos_mercaderia.costo_total` de entradas del mes), ganancia estimada del
  día (`total − costo_unitario * cantidad`, con fallback al costo vigente) y
  conteos de stock.
- **Grants**: `authenticated`.

### 10.7 Helpers `es_admin()` y `es_miembro()` → boolean

- `es_admin()`: helper `SECURITY DEFINER`, `STABLE`, usado en políticas de
  `usuarios_autorizados` para evitar recursión RLS. Exige rol admin.
- `es_miembro()`: igual patrón; `true` si el email de la sesión está en la
  whitelist. Es la **guarda de entrada** de todas las RPC `SECURITY DEFINER`
  (cierra la brecha por la que un JWT de la cuenta Supabase sin whitelist podía
  invocar son RPC).

---

## 11. POLÍTICAS RLS (resumen final por tabla)

Estado **objetivo** (aplicando todos los scripts en orden; ver §12):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `productos` | miembro | miembro | **admin** | **admin** |
| `ventas` | miembro | (solo RPC) | — | — |
| `detalle_ventas` | miembro | (solo RPC) | — | — |
| `proveedores` | miembro | miembro | **admin** | **admin** |
| `ingresos_mercaderia` | miembro | (solo RPC) | — | — |
| `usuarios_autorizados` | propio (o todo si admin) | **admin** | **admin** | **admin** |

`miembro` = `exists (select 1 from usuarios_autorizados where email = auth.jwt() ->> 'email')`.
`admin` = lo anterior **y** `rol = 'admin'` (o `es_admin()` en `usuarios_autorizados`).

> Usuario NO autenticado (`anon`): sin políticas leídas, sin ejecución de RPC.
> Es el cierre total de la fase de autenticación.

---

## 12. SCRIPTS SQL — ORDEN DE EJECUCIÓN Y ESTADO

Ejecutar en el SQL Editor de Supabase **en este orden**:

| Orden | Archivo | Contenido | Estado |
|---|---|---|---|
| 1 | `supabase/schema.sql` | Tabla `productos` + políticas abiertas fase 2 | Ejecutado |
| 2 | `supabase/ventas.sql` | `ventas`, `detalle_ventas`, `registrar_venta()` | Ejecutado |
| 3 | `supabase/compras.sql` | `proveedores`, `ingresos_mercaderia`, `registrar_ingreso()`, `registrar_ajuste_manual()` | Ejecutado |
| 4 | `supabase/auth.sql` | RLS `authenticated`, revoke `anon`, grants | Ejecutado |
| (pre-auth) | Alta de usuarios en **Supabase Auth** (por correo) | pedro, slunal + 2 familiares | Pendiente 2 correos |
| 5 | `supabase/roles.sql` | `usuarios_autorizados`, políticas whitelist + rol admin en UPDATE/DELETE | Ejecutado |
| 6 | `supabase/ajustes_stock.sql` | Tabla `ajustes_stock` + `registrar_ajuste_stock()` | Ejecutado (la tabla y función serán eliminadas en paso 9) |
| 7 | `supabase/mejoras.sql` | Proveedores INSERT miembro / UPDATE-DELETE admin | **Pendiente de ejecutar** |
| 8 | `supabase/usuarios.sql` | `es_admin()` + políticas admin de `usuarios_autorizados` | **Pendiente de ejecutar** |
| 9 | `supabase/mejoras_v2.sql` | `detalle_ventas.costo_unitario`, `registrar_venta` (snapshot + whitelist), `es_miembro`, `registrar_compra`, `actualizar_producto`, `dashboard_resumen`; **elimina** `ajustes_stock` y `registrar_ajuste_stock` | **Pendiente de ejecutar** |

> **Importante**: hasta que no se ejecuten `mejoras.sql` y `usuarios.sql`, la
> página Usuarios no funcionará bien; y hasta que se ejecute `mejoras_v2.sql`,
> las mejoras de atomicidad, ganancia neta, dashboard y protección de whitelist
> no estarán activas.

---

## 13. ALCANCE Y LIMITACIONES CONOCIDAS

1. **Sin facturación electrónica / RUC / SUNAT**: el negocio no factura; se
   entrega un recibo informal imprimible o por WhatsApp.
2. **Una sola bodega** (tenant único). No hay separación multi-negocio.
3. **Sin puntos de fidelización, créditos a clientes ni giros**.
4. **El stock se ajusta con `ejecución total` de la compra**: no hay compra en
   tránsito/parcializada (el `compra_id` existe a nivel de esquema).
5. **Recovery limitado a 3 intentos/3h por dispositivo** (localStorage);
   no es un bloqueo por servidor.
6. **Bundle grande** por incluir Three.js en el chunk principal
   (~1.4 MB raw / ~387 KB gzip); candidato a *code splitting*.

---

## 14. ESTRUCTURA DEL CÓDIGO (frontend)

```
src/
├── main.tsx                → Bootstrap de la app (ReactDOM + Router)
├── App.tsx                 → Rutas y layout (auth + POS protegido)
├── index.css               → Tailwind y keyframes (fade-up, fade-in, toast-enter)
├── context/
│   ├── AuthContext.ts      → Tipo del contexto de autenticación
│   └── AuthProvider.tsx    → Sesión Supabase + resolución de rol + watchdog
├── hooks/
│   ├── useAuth.ts          → useAuth()
│   ├── useProducts.ts
│   ├── useProveedores.ts
│   ├── useHistory.ts
│   └── useDashboardStats.ts
├── layouts/
│   ├── PosLayout.tsx       → Sidebar, menú, UserMenu (badge rol), <Outlet/>
│   └── AuthLayout.tsx      → Fondo Beams persistente + <Outlet/> (auth)
├── pages/
│   ├── LoginPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── DashboardPage.tsx
│   ├── PosPage.tsx
│   ├── InventoryPage.tsx
│   ├── PurchasesPage.tsx
│   ├── HistoryPage.tsx
│   └── UsersPage.tsx
├── components/
│   ├── Beams.tsx           → Fondo 3D (three + @react-three/fiber)
│   ├── auth/  (AuthCard, UserMenu, ProtectedRoute)
│   ├── common/ (Toast)
│   ├── pos/    (SearchBar, ProductGrid, ProductButton, CategoryGrid,
│   │           CategoryButton, Cart, CartItemRow, PaymentModal, ReceiptModal,
│   │           metodosPago)
│   ├── inventory/ (ProductTable, ProductFormModal, ConfirmDeleteModal,
│   │               StockAdjustModal, StockBadge)
│   ├── purchases/ (ProveedorSelect, GestionProveedoresModal)
│   ├── history/  (VentasTab, ComprasTab, AjustesTab, types, ingresos)
│   └── dashboard/ (SalesTodayCard, GastoMesCard, StockResumenCard, LowStockList)
├── services/   (supabase.ts [cliente], products, sales, purchases, history,
│               dashboard, roles, users)
├── utils/      (errors.ts [mensajes humanos], categories.ts, format.ts)
├── types/      (index.ts, database.types.ts → tipos generados de la BD)
```

### Convenciones de código

- TypeScript estricto; sin `any` evitable.
- Sin comentarios salvo en SQL donde explican decisiones.
- Estilos con Tailwind (clases utilitarias); animaciones globales en `index.css`.
- Componentes por carpeta de dominio (`pos/`, `inventory/`, ...).
- Regla de **Fast Refresh** de oxlint: no mezclar _export_ de componentes y
  constantes en el mismo archivo (las constantes de tema viven en archivos
  separados, p. ej. `components/auth/AuthCard.tsx` exporta clases).
- Estados async: nunca `setState` sin `await` de la promesa previa.

---

## 15. CONFIGURACIÓN Y DESPLIEGUE

### Variables de entorno (cliente)

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon Key (pública; la seguridad la da RLS) |
| `VITE_APP_URL` | URL pública (en Vercel: `https://evanlu.vercel.app`) — usada por mensajes/links de recuperación |

- Local: `.env` (URL + anon key). **No se sube al repo.**
- Vercel: configurarlas en Settings → Environment Variables.

### Despliegue

- Push a `main` → Vercel build automático (`npm run build`).
- Postgres/Supabase gestionado aparte (dashboard de Supabase).

---

## 16. DECISIONES DE DISEÑO CLAVE (para IA que reciba contexto)

1. **La lógica de dinero/stock vive en PostgreSQL**, no en el cliente:
   garantiza atomicidad y que "stock nunca quede inconsistente" aunque dos
   cajeros cobren a la vez.
2. **Whitelist como muro real**: RLS comprueba que el email esté en
   `usuarios_autorizados`. Creamos los usuarios en Supabase Auth **y luego** los
   agregamos a la whitelist.
3. **Snapshots en ventas**: `detalle_ventas.precio_unitario` guarda el precio
   cobrado y `detalle_ventas.costo_unitario` el costo al momento de la venta,
   para que el historial (y la **ganancia neta**) no mientan si luego cambian
   precios o costos.
4. **Costo ponderado en la compra**: recalculado en las RPC de compra, lo que
   convierte el "costo" en costo real de la mercadería en stock.
5. **Vía única de auditoría de stock**: `ingresos_mercaderia` es el único
   registro de trazabilidad (entradas con `+`, mermas/sobrantes con signo,
   ajustes de edición como "Edición: …"). La tabla duplicada `ajustes_stock` se
   eliminó por no usarse.
6. **Diseño premium** elegido por el propietario: dark + dorado + fondo 3D
   Beams; tarjetas amplias (`max-w-lg`), botón dorado degradado, toasts con
   barra de color.
7. **Atomicidad end-to-end**: compra completa (varios productos) y edición de
   producto con cambio de stock son **una sola transacción** en el servidor;
   la UI nunca hace "dos operaciones que podrían quedar a medias".
8. **Single-tenant consciente**: si en el futuro se alojaran varias bodegas en
   la misma BD habría que migrar a tenant (`bodega_id` + `auth.uid()`), según el
   propio análisis documentado en `auth.sql`.

---

## 17. PENDIENTES / SIGUIENTES PASOS RECOMENDADOS

1. Ejecutar en Supabase, en orden: `supabase/mejoras.sql`, luego
   `supabase/usuarios.sql` y finalmente `supabase/mejoras_v2.sql`.
2. Crear los 2 usuarios familiares en Supabase Auth y agregarlos (rol `cajero`)
   en `usuarios_autorizados` (activar los INSERT comentados de `roles.sql`).
3. (Opcional) Code-splitting de `Beams`/Three.js para reducir el chunk inicial.
4. (Opcional) Reportes mensuales de ventas/márgenes por categoría (la data ya
   está completa en la BD).
5. (Futuro) Multi-bodega (tenant) si el negocio abre más locales.

---

## 18. GLOSARIO RÁPIDO

| Término | Significado |
|---|---|
| RLS | Row Level Security: políticas por fila en PostgreSQL |
| RPC | Remote Procedure Call: funciones de BD invocadas por la API |
| `SECURITY DEFINER` | Función que corre con permisos del dueño (evita RLS interno) |
| Whitelist | Lista blanca (`usuarios_autorizados`) |
| Merma | Pérdida de stock (cuenta/costo negativo en `ingresos_mercaderia`) |
| Ingreso de mercadería | Compra/entrada de producto a la bodega |
| POS | Punto de venta |