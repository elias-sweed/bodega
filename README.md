# Bodega POS

Sistema web para una bodega pequeña: ventas, inventario, compras, historial, reportes y usuarios.

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0`
- npm
- Un proyecto Supabase configurado

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea `.env` a partir de `.env.example` y completa:

   ```env
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON
   VITE_APP_URL=http://localhost:5173
   ```

3. Aplica los SQL de `supabase/` en orden y, al final, obligatoriamente:

   ```text
   schema.sql
   ventas.sql
   compras.sql
   auth.sql
   roles.sql
   mejoras.sql
   usuarios.sql
   mejoras_v2.sql
   autoria_movimientos.sql
   importar_ventas_offline.sql
   corregimientos_finales.sql
   ```

   `corregimientos_finales.sql` es la versión final obligatoria: unifica stock, idempotencia, precios, permisos y RLS. Después ejecuta `supabase/verificacion.sql`; todas las filas deben mostrar `OK` y los permisos de `anon` deben ser `false`.

   Si la venta devuelve `null value in column "total" of relation "ventas"`, ejecuta únicamente la reparación directa `supabase/fix_venta_caja_directa.sql`. Esta crea una RPC nueva para Caja y no requiere ejecutar de nuevo toda la migración final.

4. Despliega la Edge Function de usuarios desde Supabase:

   ```bash
   supabase functions deploy crear-usuario
   ```

5. Inicia el frontend:

   ```bash
   npm run dev
   ```

6. Abre:

   ```text
   http://localhost:5173
   ```

La prueba manual completa está en [`CHECKLIST_PRUEBAS.md`](./CHECKLIST_PRUEBAS.md).

## Validaciones locales

```bash
npm run lint
npm run test
npm run build
```

## Roles

- **ADMIN:** ventas, inventario, compras, ajustes, reportes, historial y usuarios.
- **CAJERO:** ventas y consulta de resumen, inventario, historial y reportes.

Las restricciones administrativas se aplican también en PostgreSQL/RLS, no solo en la interfaz.

## Estructura de stock

- Las ventas descuentan stock mediante `registrar_venta_caja`.
- Las compras aumentan stock mediante `registrar_compra`.
- Los ajustes manuales usan `registrar_ajuste_manual`.
- Todos estos movimientos quedan en `detalle_ventas` o `ingresos_mercaderia`.
- No existe un segundo ajuste directo desde el navegador.

## Importación de ventas

Disponible solo para ADMIN en `Historial`. Un ticket con alguna línea inválida se rechaza completo para evitar importar una venta parcial.
