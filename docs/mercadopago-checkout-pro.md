# Mercado Pago Checkout Pro

La app móvil nunca debe recibir `MP_ACCESS_TOKEN` ni la clave del webhook. Ambos secretos viven únicamente en el backend.

## Contrato requerido

### `POST /payments/checkout`

Requiere sesión de cliente y `{ "booking_id": "uuid" }`. El backend debe:

1. Verificar que la reserva pertenece al cliente autenticado.
2. Leer monto y moneda desde la reserva; nunca aceptar el monto enviado por el teléfono.
3. Crear una preferencia de Mercado Pago con `external_reference = booking_id`.
4. Configurar `back_urls` con `nod://payments/success`, `nod://payments/failure` y `nod://payments/pending`.
5. Configurar `notification_url` HTTPS y `auto_return = approved`.
6. Persistir `preference_id`, monto, moneda y estado `pending`.
7. Devolver `{ preference_id, checkout_url, sandbox_url, payment_status }`.

### `GET /payments/bookings/:bookingId`

Devuelve el estado persistido. El cliente no considera aprobado un pago basándose en el deep link.

### `POST /payments/webhooks/mercadopago`

Debe validar `x-signature` y `x-request-id`, consultar el pago u orden a Mercado Pago y procesarlo de forma idempotente. Solo un estado confirmado por la API de Mercado Pago puede:

- marcar la reserva como `paid`;
- crear el movimiento de wallet;
- liberar saldo al proveedor según la política definida.

Cancelaciones, reembolsos y contracargos deben revertir los movimientos contables de forma idempotente. Una reserva impaga no puede incrementar saldo retirable.

## Secretos del backend

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_PUBLIC_KEY` (solo si una integración futura la necesita)

Usar credenciales de prueba hasta completar pruebas de aprobación, rechazo, pago pendiente, webhook duplicado, devolución y contracargo.

## Créditos NOD

Los créditos son de uso exclusivo dentro de NOD, no retirables y no transferibles. El backend debe mantener un ledger inmutable; el saldo es la suma de movimientos confirmados y nunca un número editable directamente.

- `GET /wallet`: saldo disponible/pendiente y paquetes de recarga vigentes.
- `POST /wallet/topups`: recibe únicamente `package_id`, crea una preferencia Mercado Pago y deja la recarga pendiente.
- `POST /wallet/payments`: debita créditos y paga una reserva en una única transacción de base de datos con bloqueo e idempotencia.
- El webhook acreditará una recarga una sola vez después de verificar el pago con Mercado Pago.
- Una reversa o contracargo genera un movimiento compensatorio; nunca se elimina el movimiento original.
- El backend debe impedir saldo negativo, doble gasto, montos enviados por el teléfono y recargas duplicadas.

## Cancelaciones y devoluciones

`POST /cancel-booking` acepta `refund_destination` solamente para reservas pagadas:

- `original_payment_method`: solicita un reembolso total a Mercado Pago y mantiene `refund_status = pending` hasta confirmarlo.
- `nod_credits`: acredita Créditos NOD por el monto efectivamente pagado, con consentimiento explícito del cliente.
- Los pagos realizados originalmente con Créditos NOD siempre se revierten a créditos.

La cancelación, el movimiento compensatorio y el cambio de estado deben ser idempotentes. Un mismo pago o reserva no puede reembolsarse por ambos destinos. El frontend nunca muestra la devolución como completada basándose solo en la respuesta de navegación de Mercado Pago.
