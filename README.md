# Lashby Gestión

Sistema web responsive de gestión comercial para Lashby Academia. Esta primera versión incluye autenticación, productos, variantes y kits en el modelo de datos, entradas por lote, FIFO, ventas con pagos combinados, caja, gastos, agenda, clientas, cursos, alumnas, auditoría y reportes preparados para datos reales.

## Principios contables implementados

- Las ventas guardan el precio histórico utilizado.
- Las entradas de stock no generan pagos ni salidas de caja.
- Cada lote conserva su costo y se consume por FIFO.
- Una venta sin stock crea una asignación de costo pendiente.
- Una entrada posterior completa primero esas ventas negativas y recalcula su COGS.
- Los registros importantes se anulan; no se eliminan físicamente.
- Rentabilidad y flujo de caja se almacenan y calculan desde movimientos distintos.
- Los costos desconocidos permanecen pendientes: el sistema no los estima.

## Puesta en marcha

1. Crear un proyecto en Supabase.
2. Abrir **SQL Editor** y ejecutar, en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - crear el primer usuario desde Authentication
   - adaptar y ejecutar `supabase/migrations/002_admin_bootstrap.sql`
   - `supabase/migrations/003_operations.sql`
3. Copiar `.env.example` como `.env.local` y completar la URL y la clave pública `anon`.
4. Ejecutar `npm install` y `npm run dev`.
5. En Vercel, importar el proyecto y crear las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

La clave `service_role` no debe colocarse en el navegador ni en variables `VITE_*`.

## Verificación

```bash
npm test
npm run build
```

## Estado de esta versión

El núcleo está conectado a Supabase y ya dispone de operaciones transaccionales para apertura y cierre de caja, ventas, pagos combinados, comisiones, entradas de stock, FIFO, costo pendiente por stock negativo y anulación de ventas. En el proyecto Supabase de Lashby se verificó la existencia de las cinco funciones RPC correspondientes.

Esta entrega es una base funcional para iniciar la carga real. Antes de considerarla lista para producción todavía corresponde completar y probar con datos reales: expansión automática de kits por componentes, devoluciones/cambios desde la interfaz, recordatorios externos por WhatsApp y correo, reportes mensuales/anuales completos y la auditoría integral final. Esas funciones no se presentan como terminadas en esta versión.
