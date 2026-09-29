# Análisis y Propuestas de Mejora — Bodega EVANLU
> Análisis técnico por arquitecto senior. Sin cambios implementados. Solo propuestas.

---

## Resumen Ejecutivo

El sistema está en un **estado sorprendentemente maduro** para una bodega familiar. Ya tiene capa de caché en memoria, manejo de errores con mensajes amigables, idempotencia en ventas y compras, y Realtime de Supabase. Las mejoras propuestas son **de preparación para el crecimiento**, no de corrección de bugs críticos.

---

## 1. Archivos Analizados

| Archivo | Tamaño | Problema Principal |
|---------|--------|--------------------|
| [`services/products.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/products.ts) | 171 líneas | `fetchProducts()` sin límite ni paginación |
| [`services/history.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/history.ts) | 101 líneas | `fetchVentasHistory()` e `fetchIngresosHistory()` sin límite — **riesgo #1** |
| [`services/dashboard.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/dashboard.ts) | 74 líneas | `fetchProductosBajoStock()` trae todos los productos para filtrar en cliente |
| [`services/kardex.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/kardex.ts) | 107 líneas | Sin límite en `detalle_ventas` ni `ingresos_mercaderia` por producto |
| [`services/reportes.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/reportes.ts) | 103 líneas | `fetchVentasMes()` sin límite — en meses con +1000 ventas, silencioso y truncado |
| [`services/purchases.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/purchases.ts) | 85 líneas | `fetchProveedores()` sin límite, errores técnicos en algunos paths |
| [`services/users.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/users.ts) | 70 líneas | `fetchUsuariosAutorizados()` sin límite (menor riesgo por volumen bajo) |
| [`services/productsCache.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/productsCache.ts) | 126 líneas | Buen patrón. Sin problemas. |
| [`services/historyCache.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/services/historyCache.ts) | 155 líneas | `notify()` duplicado (líneas 56-57 y 99-100) |
| [`hooks/useProducts.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/hooks/useProducts.ts) | 121 líneas | Bien estructurado, solo delega al caché |
| [`hooks/useHistory.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/hooks/useHistory.ts) | 107 líneas | Bien estructurado |
| [`hooks/useDashboardStats.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/hooks/useDashboardStats.ts) | 70 líneas | Bien. Sin problemas. |
| [`hooks/useReporteMensual.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/hooks/useReporteMensual.ts) | 110 líneas | Bien. Manejo de error faltante en el `catch`. |
| [`pages/PosPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/PosPage.tsx) | 640 líneas | **Más grande de pages**. Tiene lógica de localStorage, cart, pago, y render todo junto |
| [`pages/InventoryPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/InventoryPage.tsx) | 496 líneas | 5 handlers de modal en el mismo componente. Candidato a extraer hook |
| [`pages/PurchasesPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/PurchasesPage.tsx) | 536 líneas | Toda la lógica del carrito de compra en el componente |
| [`pages/UsersPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/UsersPage.tsx) | 389 líneas | Carga el caché manualmente en lugar de usar un hook |
| [`pages/HistoryPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/HistoryPage.tsx) | 312 líneas | Funciones de fecha duplicadas respecto a `ReportesPage` |
| [`pages/ReportesPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/ReportesPage.tsx) | 257 líneas | Bien. `MetricCard` podría ser un componente global |
| [`App.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/App.tsx) | 81 líneas | Rutas protegidas por `AdminRoute` pero falta ruta de Historial en su propio módulo |
| [`layouts/PosLayout.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/layouts/PosLayout.tsx) | 135 líneas | Nested ternaries para `routeClass` — difícil de mantener |
| [`utils/errors.ts`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/utils/errors.ts) | 140 líneas | Buen patrón, pero algunos servicios **no lo usan** (`products.ts` L132, `users.ts` L14) |

---

## 2. Propuestas por Área

### 🔴 ÁREA 1 — Paginación en consultas Supabase (CRÍTICO)

#### Problema

Supabase retorna **máximo 1000 filas** por defecto. Cuando el negocio crezca:

| Query sin límite | Tabla | Cuándo rompe |
|-----------------|-------|-------------|
| `fetchVentasHistory()` | `ventas` | ~5 ventas/día → **rompería en ~200 días** |
| `fetchIngresosHistory()` | `ingresos_mercaderia` | Igual, según ritmo de compras |
| `fetchVentasMes()` | `ventas` | Mes con +1000 ventas (posible en temporadas altas) |
| `fetchProducts()` | `productos` | Con +1000 productos distintos |
| `fetchProductosBajoStock()` | `productos` | Trae todo y filtra en cliente |
| `fetchKardex()` en `kardex.ts` | `detalle_ventas` | Producto con +1000 líneas de venta históricas |

#### Propuesta A — Paginación por cursor en historial (más elegante)

Para `fetchVentasHistory()` e `fetchIngresosHistory()`, dado que ya están ordenadas por `fecha DESC`, implementar **cursor pagination**:

```
// Idea: aceptar un cursor (fecha del último elemento visto)
fetchVentasHistory(cursor?: string, limit = 100)
// Supabase: .lt('fecha', cursor).limit(limit)
```

El `historyCache` guardaría las páginas y la `HistoryPage` cargaría más al hacer scroll (infinite scroll) o al pulsar "Ver más".

#### Propuesta B — Paginación por rango de fechas (más simple para el contexto)

Como `HistoryPage` ya tiene filtros por rango (Hoy, Esta semana, Este mes, Todo), el problema se puede resolver **no cargando "Todo" de golpe**. La propuesta es que el rango "Todo" cargue solo los últimos 90 días por defecto, con un botón "Cargar más":

```
// En fetchVentasHistory, añadir parámetros opcionales:
fetchVentasHistory(desde?: string, hasta?: string)
// El historyCache ya no carga "todo" en la primera carga
```

#### Propuesta C — `fetchProductosBajoStock` → mover filtro al servidor

La función actualmente trae TODOS los productos y filtra `stock_actual <= stock_minimo` en el cliente. Proponer un RPC `productos_bajo_stock` o agregar `.lte('stock_actual', supabase.ref('stock_minimo'))` directamente en la query (Supabase lo soporta con `filter`).

#### Propuesta D — Límite preventivo inmediato

Como medida de bajo esfuerzo, **agregar `.limit(1000)` explícito** a todas las queries sin límite. Esto hace explícito el tope y evita sorpresas cuando Supabase cambie su default. Luego, cuando el negocio crezca, se reemplaza por paginación real.

---

### 🟠 ÁREA 2 — Manejo de errores robusto

#### Problemas encontrados

**Inconsistencia en el uso de `getFriendlyError`:**

| Archivo | Función | Error expuesto |
|---------|---------|----------------|
| `products.ts` L132 | `actualizarProducto()` | `throw new Error(error.message)` — crudo de Postgres |
| `products.ts` L146 | `deleteProduct()` | `throw new Error(error.message)` — crudo de Postgres |
| `purchases.ts` L17 | `fetchProveedores()` | `throw new Error(error.message)` — crudo de Postgres |
| `users.ts` L14 | `fetchUsuariosAutorizados()` | `throw new Error(error.message)` — crudo de Postgres |
| `dashboard.ts` L39 | `fetchProductosBajoStock()` | `throw new Error(error.message)` — sin mensaje amigable |

**Error silencioso en `useReporteMensual.ts`:**
El bloque `catch` (después de la línea 80) probablemente solo guarda el error en estado, pero si el error viene de Supabase sin pasar por `getFriendlyError`, la usuaria ve un mensaje técnico.

**`confirmDelete` en `InventoryPage` re-lanza el error:**
```typescript
// InventoryPage.tsx L307:
throw new Error(getFriendlyError(cause, ...))
// Problema: el error lanzado no se atrapa en ningún toast — se pierde silenciosamente
```

#### Propuesta — Patrón consistente de manejo de errores

1. **Todos los `throw new Error(error.message)` sin pasar por `getFriendlyError` deben corregirse.** La regla: si viene de Supabase/DB, siempre pasa por `getFriendlyError`.

2. **Crear un wrapper `serviceCall` para reducir el boilerplate:**
```
// Idea de función auxiliar (sin implementar):
async function serviceCall<T>(fn: () => Promise<T>, fallback: string): Promise<T>
// Internamente hace el try/catch + getFriendlyError + re-throw limpio
```

3. **`confirmDelete` en `InventoryPage`:** el `throw cause` final nunca se maneja. Debe capturarse y llamar a `showNotice('error', ...)` en lugar de relanzar.

4. **Errores de red vs errores de lógica:** Distinguir entre "sin internet" y "error de negocio". Cuando `navigator.onLine === false`, mostrar un mensaje específico: *"Sin conexión. Revisa tu internet e inténtalo de nuevo."*

---

### 🟠 ÁREA 3 — Clean Architecture en componentes

#### Componentes grandes (>200 líneas en JSX+lógica)

| Componente | Líneas | Responsabilidades mezcladas |
|-----------|--------|-----------------------------|
| [`PosPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/PosPage.tsx) | 640 | LocalStorage, cart state, filtrado de productos, render completo |
| [`PurchasesPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/PurchasesPage.tsx) | 536 | Lista de ítems de compra, búsqueda, formulario, guardar — todo junto |
| [`InventoryPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/InventoryPage.tsx) | 496 | 6 modales distintos con sus handlers |
| [`UsersPage.tsx`](file:///C:/Users/Master%20Games/Documents/App/bodega/src/pages/UsersPage.tsx) | 389 | Carga manual del caché + formulario + tabla |

#### Propuesta — Carpetas de feature con subcomponentes

```
src/pages/
  PosPage.tsx          ← solo orquesta, ~100 líneas
  pos/
    usePosCart.ts      ← toda la lógica del carrito
    useSuspendedSale.ts ← lógica de venta suspendida en localStorage
    PosProductArea.tsx  ← search + categorías + productos
    PosSidebar.tsx      ← el carrito lateral

  PurchasesPage.tsx    ← solo orquesta
  purchases/
    usePurchaseForm.ts  ← items, totales, validación, guardar
    PurchaseItemsTable.tsx ← la tabla de productos

  InventoryPage.tsx    ← solo orquesta
  inventory/
    useInventoryModals.ts ← estado de todos los modales (editando, comprando, etc.)
```

**Regla propuesta:** Si un `useState` no afecta el JSX directamente sino que alimenta otro estado o una llamada async, extraerlo a un hook.

---

### 🟡 ÁREA 4 — Separación de lógica y diseño

#### `PosPage.tsx` — Extraer `usePosCart`

`PosPage` tiene ~10 `useState` + `useRef` + `useEffect` que forman un carrito completo. Todo esto debería estar en `src/hooks/usePosCart.ts`. El componente solo haría:

```
// PosPage simplificado (idea):
const { cart, addProduct, confirmPayment, ... } = usePosCart()
return <PosLayout cart={cart} ... />
```

**Beneficio directo:** el carrito se puede testear aislado, sin montar JSX.

#### `UsersPage.tsx` — El caché se carga manualmente

La página sincroniza manualmente con `subscribeToUsers` / `ensureUsersLoaded`. Hay un patrón idéntico en otras páginas (`InventoryPage`, etc.). Proponer un hook `useUsers()` simétrico a `useProducts()`:

```
// hooks/useUsers.ts (solo idea)
export function useUsers() {
  // mismo patrón que useProducts.ts pero para la tabla usuarios_autorizados
}
```

Esto elimina ~30 líneas repetidas de `UsersPage`.

#### `PurchasesPage.tsx` — Extraer `usePurchaseForm`

La lógica de `items`, `addItem`, `removeItem`, `updateItem`, `totalCompra`, `isValid`, `handleSave` es autocontenida. Extraerla a `src/hooks/usePurchaseForm.ts` reduce la página a ~150 líneas de puro JSX.

---

### 🟡 ÁREA 5 — Rutas validadas y seguras

#### Estado actual (bien)

```
App.tsx:
  ProtectedRoute → todas las rutas internas
    AdminRoute → /compras y /usuarios
```

La estructura de rutas es correcta y segura. `AdminRoute` verifica `rol === 'admin'` antes de renderizar.

#### Problemas menores

**1. Ruta wildcard `path="*"` redirige a `/login`:**

Si un usuario autenticado escribe `/ruta-inexistente`, lo manda a `/login` en vez de a `/` (dashboard). Debería redirigir a `/` si está autenticado, o a `/login` si no.

```
// Propuesta (idea):
<Route path="*" element={<NotFoundRedirect />} />
// NotFoundRedirect lee isAuthenticated y redirige según corresponda
```

**2. `/movimientos` sin `ReportesPage`:**

La ruta `/movimientos` apunta a `MovimientosPage`, pero `ReportesPage` es accesible desde el nav — verificar que no esté huérfana (no se ve en `App.tsx`). Si los Reportes se acceden desde un tab dentro de `/movimientos`, está bien.

**3. `PosLayout.tsx` — nested ternaries para `routeClass`:**

Las líneas 53-65 tienen 6 niveles de ternario anidado para asignar la clase CSS por ruta. Esto es un bug en espera: agregar una ruta nueva sin actualizar esa cadena da una clase vacía. Propuesta:

```
// Propuesta (idea):
const ROUTE_CLASSES: Record<string, string> = {
  '/': 'dashboard-route',
  '/caja': 'caja-route',
  // ...
}
const routeClass = ROUTE_CLASSES[location.pathname] ?? ''
```

---

### 🟡 ÁREA 6 — Componentes globales reutilizables

#### Patrones repetidos identificados

**1. `ErrorCard` — bloque de error con botón Reintentar:**

Aparece casi idéntico en `PosPage`, `InventoryPage`, `PurchasesPage` y `DashboardPage`:

```tsx
// Repetido ~4 veces con ligeras variaciones de color:
<div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-...">
  <AlertTriangle ... />
  <p>No se pudieron cargar...</p>
  <button onClick={retry}>Reintentar</button>
</div>
```

**Propuesta:** `<ErrorCard message={error} onRetry={refresh} />` en `src/components/common/`.

**2. `PageHeader` — encabezado con badge de sección:**

El bloque de título de página (`text-[11px] uppercase tracking-[0.22em]` + `text-3xl font-black`) se repite en todas las páginas con el mismo patrón visual.

**Propuesta:** `<PageHeader eyebrow="Catálogo" title="Inventario" />` en `src/components/common/`.

**3. `MetricCard` — tarjeta de métrica:**

Ya existe como función local en `ReportesPage.tsx` (línea 48). Debería moverse a `src/components/common/MetricCard.tsx` para poder reutilizarse en el Dashboard y en otros reportes futuros.

**4. `showNotice` / `noticeTimer` — patrón toast:**

El siguiente bloque se repite en **todas** las páginas (`PosPage`, `InventoryPage`, `PurchasesPage`, `UsersPage`):

```typescript
const [notice, setNotice] = useState<Notice | null>(null)
const noticeTimer = useRef<number | undefined>(undefined)
const showNotice = useCallback((type, message) => {
  window.clearTimeout(noticeTimer.current)
  setNotice({ type, message })
  noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
}, [])
useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
```

**Propuesta:** `useToast()` hook en `src/hooks/useToast.ts` que encapsula este patrón. Cada página lo importa con una línea:

```typescript
const { notice, showNotice } = useToast()
```

**5. `SectionCard` — contenedores de sección:**

Las tarjetas con `rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl` se repiten en múltiples páginas. Un `<SectionCard>` como wrapper de layout reduciría la superficie de tokens hardcodeados.

---

### 🟢 ÁREA 7 — Código limpio

#### `normalizeText` definida dos veces

```typescript
// PosPage.tsx L102-107: define normalizeText()
// PurchasesPage.tsx L72: hace el mismo normalize inline con .toLowerCase()...
// utils/format.ts: también existe normalizeText exportada
```

`PosPage` debería importar `normalizeText` de `utils/format` en lugar de redefinirla.

#### `inputClass` / `labelClass` copiadas

En `UsersPage.tsx` (líneas 28-31) se definen `inputClass` y `labelClass` como constantes locales. El mismo patrón visual aparece en `PurchasesPage.tsx`. Propuesta: mover a un archivo `src/styles/formClasses.ts` o a un componente `<FormInput>` / `<FormLabel>`.

#### `historyCache.ts` — doble `notify()` al final de cada `load`

En `loadVentas()` y `loadIngresos()`, hay dos llamadas a `notify()`: una dentro del `finally` (línea 51) y otra después del `await` (línea 57). El segundo es redundante porque el primero ya lo notificó y el `await` ya resolvió. Puede causar renders dobles.

#### Fechas duplicadas entre `HistoryPage` y `ReportesPage`

Las funciones `startOfDay()`, `startOfWeek()`, `startOfMonth()`, `toInputDate()` están definidas en `HistoryPage.tsx` y casi idénticas en `ReportesPage.tsx` (bajo el nombre `rango()`). Propuesta: moverlas a `src/utils/dateRanges.ts`.

#### `dashboard.ts` — `fetchVentasUltimos7Dias` tiene una condición incorrecta

```typescript
// dashboard.ts L62:
.lt('fecha', new Date().toISOString())
// Esto excluye las ventas de hoy que aún están en progreso (o del momento actual)
// No es un bug crítico pero sí impreciso: debería ser el fin del día de hoy
```

---

## 3. Priorización por Impacto vs Esfuerzo

```
IMPACTO
  ^
  │                         [Límites Supabase]
  │                    [fetchVentasHistory sin límite]
  │
  │         [useToast hook]     [ErrorCard global]
  │   [usePosCart hook]    [usePurchaseForm hook]
  │
  │      [normalizeText duplicada]  [doble notify()]
  │  [routeClass en PosLayout]   [startOfDay duplicada]
  │
  └────────────────────────────────────────► ESFUERZO
       Bajo            Medio            Alto
```

| Prioridad | Mejora | Impacto | Esfuerzo | Riesgo si no se hace |
|-----------|--------|---------|----------|----------------------|
| 🔴 P1 | Agregar `.limit(1000)` explícito a todas las queries | Alto | **Muy bajo** (15 min) | App silenciosamente trunca datos en ~200 días |
| 🔴 P2 | `fetchVentasHistory` → paginación por rango de fechas | Alto | Medio | Historial incompleto sin avisar |
| 🟠 P3 | `getFriendlyError` en todos los `throw Error(error.message)` crudos | Alto | Bajo | La usuaria ve mensajes técnicos de Postgres |
| 🟠 P4 | `useToast()` hook compartido | Medio | Bajo | Código duplicado en 4 páginas |
| 🟠 P5 | `ErrorCard` componente global | Medio | Bajo | Inconsistencia visual en errores |
| 🟡 P6 | `usePosCart` hook extraído de `PosPage` | Medio | Medio | `PosPage` difícil de testear y mantener |
| 🟡 P7 | `usePurchaseForm` hook extraído de `PurchasesPage` | Medio | Medio | Idem |
| 🟡 P8 | `routeClass` → objeto de mapa en `PosLayout` | Bajo | Muy bajo | Bug silencioso al agregar nuevas rutas |
| 🟡 P9 | `normalizeText` centralizada | Bajo | Muy bajo | Comportamientos distintos si se divergen |
| 🟢 P10 | `dateRanges.ts` — funciones de fecha centralizadas | Bajo | Bajo | Duplicación tolerable pero molesta |
| 🟢 P11 | `doble notify()` en historyCache | Bajo | Muy bajo | Renders dobles innecesarios |
| 🟢 P12 | `PageHeader`, `SectionCard` componentes globales | Bajo | Bajo | Solo consistencia visual |

---

## 4. Riesgos y Consideraciones Futuras

### ⚠️ Riesgo Inminente — Límite de 1000 filas (P1)

> [!CAUTION]
> Si la bodega hace ~5 ventas/día, en **200 días** (6-7 meses) `fetchVentasHistory` alcanzará las 1000 filas y Supabase **silenciosamente devolverá solo las primeras 1000** sin error. La app mostrará datos incompletos sin advertir. Este es el riesgo más crítico del sistema actual.

**Mitigación mínima inmediata (sin romper nada):** agregar `.limit(1000)` a todas las queries actuales + agregar log de advertencia cuando `data.length === 1000`.

### ⚠️ Riesgo Arquitectura — Caché en módulo JS global

Los caches (`productsCache`, `historyCache`, `dashboardCache`) viven como **variables de módulo globales** en memoria. Esto es correcto y eficiente, pero tiene implicaciones:

- Si el usuario abre la app en **2 pestañas**, cada una tiene su propia instancia del caché → posible desincronización. El Realtime channel mitiga esto, pero si una pestaña no tiene el canal activo, puede quedar desactualizada.
- Propuesta futura: evaluar si `localStorage` con TTL corto (1 minuto) podría servir como caché compartido entre pestañas, o usar `BroadcastChannel` para notificar a pestañas hermanas cuando hay cambios.

### ⚠️ Riesgo UX — Filtro de categorías en `/caja` no persiste

Cuando la usuaria selecciona una categoría en la Caja y luego va a Inventario, al volver el estado de `selectedCategory` se pierde (es `useState` local). Para una usuaria que cobra rápido cambiando entre vistas, esto puede ser molesto. Propuesta: considerar guardar la última categoría en `sessionStorage`.

### 💡 Oportunidad — `ReportesPage` sin ruta en `App.tsx`

Revisando `App.tsx`, no hay ruta `/reportes`. La página de Reportes se renderiza dentro de otra página o accedida por tab. Si crece, debería tener su propia ruta y su propio `title` para el tab del navegador (importante para accesibilidad y bookmarking).

### 💡 Oportunidad — `kardex.ts` sin paginación por producto popular

`fetchKardex(productoId)` trae **todo el historial de movimientos de un producto** de una vez. Un producto de alta rotación (ej. agua, gaseosa) puede tener miles de entradas en `detalle_ventas` a fin de año. Propuesta futura: paginación del kardex con botón "Ver más movimientos antiguos".

### 💡 Oportunidad — Modo offline básico

`PosPage` ya usa `localStorage` para venta suspendida. El siguiente paso natural para la usuaria sería poder **registrar ventas offline** y sincronizar al recuperar internet. El sistema ya tiene `registrarVentaBackfill` (RPC) e `idempotencyKey` en todas las ventas — la infraestructura está casi lista. Solo faltaría:
1. Queue de ventas pendientes en `localStorage`
2. Listener en `window.ononline` para flush automático

---

## 5. Lo que el sistema hace bien (para preservar)

> [!NOTE]
> Estas son fortalezas del diseño actual que deben mantenerse en cualquier refactor.

- ✅ **Idempotencia**: ventas y compras usan `idempotencyKey` → no hay doble cobro si la usuaria presiona dos veces
- ✅ **Caché con generación**: los caches usan `cacheGeneration` para evitar race conditions al hacer logout/login
- ✅ **Realtime de Supabase**: `productsCache` tiene canal Realtime → stock siempre actualizado sin polling
- ✅ **Errores amigables**: `getFriendlyError` traduce errores de Postgres a español comprensible (aunque no se usa en todos lados)
- ✅ **VentaError con `stockShortIds`**: el carrito no se pierde cuando hay stock insuficiente — excelente UX
- ✅ **Venta suspendida**: la usuaria puede atender otra cosa y retomar, ideal para bodega real
- ✅ **Skeletons en toda la UI**: la app nunca queda en blanco durante la carga
- ✅ **Separación servicio/caché/hook**: el patrón `service.ts → cache.ts → hook.ts` está bien establecido en productos y dashboard
- ✅ **AuthProvider robusto**: detecta expiración de sesión y muestra modal en lugar de crashear
