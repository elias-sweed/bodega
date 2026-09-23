# Checklist de pruebas manuales

> Aplica primero `supabase/corregimientos_finales.sql`. No pruebes ventas ni compras contra una base que todavía use las RPC antiguas. Si aparece `null value in column "total" of relation "ventas"`, ejecuta únicamente `supabase/fix_venta_caja_directa.sql`.

## Preparación

1. Inicia el servidor:
   ```bash
   npm run dev
   ```
2. Abre `http://localhost:5173`.
3. Inicia sesión como ADMIN.
4. Usa un catálogo de prueba o una base Supabase de pruebas, no producción.

## 1. Crear producto y stock inicial

En Inventario → Nuevo producto:

- Nombre: `Gaseosa Inca Kola`
- Categoría: `Bebidas`
- Precio de venta: `S/ 4.00`
- Costo: `S/ 2.50`
- Stock inicial: `10`
- Stock mínimo: `3`
- Código: `TEST-001`

Resultado esperado:

- El producto aparece con stock `10`.
- En Movimientos aparece una entrada de stock inicial por `+10`.
- En Resumen todavía no debe aparecer como bajo/agotado.

## 2. Venta de 2 unidades

1. Ve a Caja.
2. Busca `Gaseosa Inca Kola` o `TEST-001`.
3. Agrega 2 unidades.
4. Cobra con `Efectivo`, recibe exactamente `S/ 8.00`.
5. Confirma.

Resultado esperado:

- Venta: `1`.
- Total: `S/ 8.00`.
- Método: `Efectivo`.
- Stock: `8`.
- Resumen: ventas `S/ 8.00`, ganancia estimada `S/ 3.00`.
- Historial: una venta con 2 unidades a `S/ 4.00`.
- Kardex: salida de 2 unidades.

## 3. Compra de 20 unidades

1. Abre Compras.
2. Registra un proveedor de prueba.
3. Agrega `Gaseosa Inca Kola`.
4. Cantidad: `20`.
5. Costo total: `S/ 60.00`.
6. Guarda.

Resultado esperado:

- Stock: `28`.
- Costo ponderado aproximado: `S/ 2.86`.
- Historial → Compras: una compra de 20 unidades por `S/ 60.00`, asociada al proveedor.
- Resumen → Compras del mes: aumenta en `S/ 60.00`.
- Kardex: entrada de 20 unidades.

## 4. Venta Yape

1. Vende 1 unidad de Gaseosa.
2. Método: `Yape`.
3. Confirma.

Resultado esperado:

- Stock: `27`.
- Total: `S/ 4.00`.
- Resumen/Reportes: Yape aumenta en `S/ 4.00`.

## 5. Venta Plin

1. Vende 1 unidad.
2. Método: `Plin`.
3. Confirma.

Resultado esperado:

- Stock: `26`.
- Total: `S/ 4.00`.
- Resumen/Reportes: Plin aumenta en `S/ 4.00`.

## 6. Venta Efectivo

1. Vende 1 unidad.
2. Método: `Efectivo`.
3. Confirma.

Resultado esperado:

- Stock: `25`.
- Total: `S/ 4.00`.
- Resumen/Reportes: Efectivo aumenta en `S/ 4.00`.

## 7. Doble clic en Cobrar

1. Agrega 1 unidad de Gaseosa.
2. En el modal, pulsa rápidamente dos veces `CONFIRMAR COBRO`.
3. Cierra el recibo.

Resultado esperado:

- Historial muestra una sola venta nueva.
- El stock disminuye una sola vez: de `25` a `24`.
- No hay dos líneas con el mismo identificador de venta.

## 8. Producto agotado

Crea `Galleta de prueba`:

- Precio: `S/ 1.00`
- Costo: `S/ 0.50`
- Stock: `1`
- Stock mínimo: `0`

Véndela una vez.

Resultado esperado:

- Stock: `0`.
- Ya no se puede agregar en Caja.
- Resumen muestra 1 producto agotado.
- Historial y Kardex muestran la salida.

## 9. Producto con stock bajo

Crea `Leche de prueba`:

- Precio: `S/ 3.00`
- Costo: `S/ 2.00`
- Stock: `2`
- Stock mínimo: `3`

Resultado esperado:

- Aparece en productos con stock bajo.
- No aparece como agotado.
- Caja permite venderlo porque todavía tiene stock.

## 10. Ajuste manual ADMIN

1. Como ADMIN, abre Inventario.
2. Ajusta `Leche de prueba` de 2 a 5 unidades.
3. Motivo: `Corrección de inventario`.

Resultado esperado:

- Stock: `5`.
- Historial → Correcciones muestra `+3`.
- Kardex muestra la entrada.
- No desaparece el movimiento si se recarga la página.

## 11. Permisos CAJERO

1. Como ADMIN, crea un usuario con rol `Cajero` desde Usuarios.
2. Cierra sesión e inicia sesión con ese usuario.

Resultado esperado:

- Puede ver Resumen, Caja, Inventario, Historial y Reportes.
- No ve Compras, Usuarios ni botones de crear/editar/eliminar/ajustar stock.
- Si abre directamente `/compras` o `/usuarios`, vuelve al Resumen.
- Puede cobrar, pero no modificar catálogo ni usuarios.

## 12. Permisos ADMIN

1. Inicia sesión como ADMIN.

Resultado esperado:

- Ve Compras y Usuarios.
- Puede crear y editar productos.
- Puede registrar compras, ajustes y usuarios.
- El sistema no permite quitar o degradar al último administrador.

## 13. Historial y Reportes

1. En Reportes selecciona Día, Semana y Mes.
2. Exporta el reporte.
3. Revisa los mismos datos en Resumen, Historial y Reportes.

Resultado esperado:

- Ventas, stock y métodos coinciden.
- La ganancia estimada de ventas usa el costo histórico de los productos vendidos.
- Las compras aparecen como gasto/entradas, pero no se restan dos veces de la ganancia de ventas.
- El archivo CSV se abre correctamente en Excel.

## 14. Cachés y recarga

1. Registra una venta.
2. Espera la actualización visible.
3. Recarga el navegador con F5.
4. Revisa Resumen, Inventario e Historial.

Resultado esperado:

- No reaparece el stock anterior.
- No se muestran compras o ventas antiguas desde localStorage.
