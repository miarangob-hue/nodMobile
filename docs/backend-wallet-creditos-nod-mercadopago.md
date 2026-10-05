# Implementación backend: Créditos NOD + Mercado Pago

## 1. Objetivo

Implementar un sistema de créditos internos para clientes de NOD que permita:

- comprar paquetes de Créditos NOD mediante Mercado Pago Checkout Pro;
- pagar reservas usando Créditos NOD;
- pagar reservas directamente mediante Mercado Pago;
- consultar saldo disponible, saldo pendiente y movimientos;
- cancelar reservas y devolver el pago al medio original o a Créditos NOD;
- acreditar al proveedor únicamente después de confirmar el pago;
- soportar reintentos, webhooks duplicados, reembolsos y contracargos sin duplicar dinero.

Regla inicial de producto: **1 Crédito NOD = $1 CLP**. Los créditos no son transferibles entre clientes ni retirables. Esta definición debe validarse legal y contablemente antes de producción.

## 2. Estado actual

La aplicación móvil ya contiene los clientes y componentes para estos contratos:

- `GET /wallet`
- `POST /wallet/topups`
- `POST /wallet/payments`
- `POST /payments/checkout`
- `GET /payments/bookings/:bookingId`
- `POST /payments/webhooks/mercadopago`
- `POST /cancel-booking` con `refund_destination`

La funcionalidad está protegida por `EXPO_PUBLIC_MERCADOPAGO_ENABLED`. No debe activarse hasta completar este documento.

Problema existente: el saldo del proveedor puede aumentar al completar reservas sin pago real confirmado. Actualmente se observó un saldo pendiente de `$27.000 CLP`. Debe auditarse y corregirse antes de habilitar retiros.

## 3. Principios obligatorios

1. La app móvil nunca recibe `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` ni una service-role key.
2. El backend obtiene precios, moneda, cliente y proveedor desde la base de datos; nunca confía en montos enviados por el teléfono.
3. Un deep link de éxito no confirma un pago. Solo lo confirma el backend consultando Mercado Pago después de validar el webhook.
4. Todos los movimientos financieros usan montos enteros en CLP.
5. El ledger es inmutable: no se editan ni eliminan movimientos; las correcciones generan movimientos compensatorios.
6. Toda operación monetaria es idempotente y transaccional.
7. Ninguna operación puede producir saldo negativo.
8. Un pago o una reserva no puede ser reembolsado simultáneamente a Mercado Pago y a Créditos NOD.

## 4. Secretos y configuración

Configurar únicamente en el backend:

```text
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_WEBHOOK_SECRET
MERCADOPAGO_ENVIRONMENT=sandbox|production
APP_DEEP_LINK_SCHEME=nod
PAYMENTS_ENABLED=false|true
```

Configurar en Mercado Pago una URL HTTPS pública para webhooks. No utilizar `localhost` como URL de retorno.

## 5. Modelo de datos propuesto

Los nombres pueden adaptarse al esquema existente, pero deben conservarse las restricciones e invariantes.

### `customer_wallets`

```text
id uuid primary key
customer_id uuid unique not null
currency text not null default 'CLP'
created_at timestamptz not null
updated_at timestamptz not null
```

El saldo no debe mantenerse como un número editable salvo que exista una estrategia transaccional comprobable. La fuente de verdad es el ledger.

### `wallet_transactions`

```text
id uuid primary key
wallet_id uuid not null
customer_id uuid not null
booking_id uuid null
topup_id uuid null
refund_id uuid null
type text not null
status text not null
amount integer not null
currency text not null default 'CLP'
idempotency_key text unique not null
description text null
metadata jsonb not null default '{}'
created_at timestamptz not null
available_at timestamptz null
```

Tipos mínimos:

- `topup_pending`
- `topup_credit`
- `booking_debit`
- `booking_credit_reversal`
- `refund_credit`
- `chargeback_debit`
- `admin_adjustment`
- `expiration_debit`, solo si se define expiración

Convención recomendada: créditos positivos y débitos negativos.

### `credit_packages`

```text
id uuid primary key
code text unique not null
label text not null
credits integer not null check (credits > 0)
price integer not null check (price > 0)
currency text not null default 'CLP'
active boolean not null default true
sort_order integer not null default 0
created_at timestamptz not null
updated_at timestamptz not null
```

### `wallet_topups`

```text
id uuid primary key
customer_id uuid not null
wallet_id uuid not null
package_id uuid not null
credits integer not null
amount integer not null
currency text not null
status text not null
mercadopago_preference_id text unique null
mercadopago_payment_id text unique null
mercadopago_status text null
mercadopago_status_detail text null
idempotency_key text unique not null
created_at timestamptz not null
updated_at timestamptz not null
approved_at timestamptz null
```

Estados mínimos: `created`, `pending`, `approved`, `rejected`, `cancelled`, `refunded`, `charged_back`.

### `booking_payments`

```text
id uuid primary key
booking_id uuid unique not null
customer_id uuid not null
provider_id uuid not null
method text not null
amount integer not null
currency text not null
gross_amount integer not null
platform_fee_amount integer not null default 0
payment_processing_fee_amount integer not null default 0
provider_net_amount integer not null
tax_amount integer not null default 0
commission_rule_id uuid null
status text not null
mercadopago_preference_id text unique null
mercadopago_payment_id text unique null
idempotency_key text unique not null
created_at timestamptz not null
updated_at timestamptz not null
approved_at timestamptz null
```

Métodos: `nod_credits`, `mercadopago`. Estados: `created`, `pending`, `approved`, `rejected`, `cancelled`, `refunded`, `partially_refunded`, `charged_back`.

Invariante monetaria:

```text
gross_amount
- platform_fee_amount
- payment_processing_fee_amount (si contractualmente corresponde al proveedor)
- tax_amount (si corresponde retenerlo en este flujo)
= provider_net_amount
```

La definición tributaria y quién absorbe la comisión de Mercado Pago deben ser confirmadas por contabilidad. El cálculo se congela al crear el pago y no debe cambiar aunque posteriormente se modifique la tarifa comercial.

### `commission_rules`

```text
id uuid primary key
scope text not null
provider_id uuid null
service_id uuid null
percentage_bps integer not null default 0
fixed_amount integer not null default 0
minimum_fee integer null
maximum_fee integer null
currency text not null default 'CLP'
tax_included boolean not null default false
active boolean not null default true
valid_from timestamptz not null
valid_until timestamptz null
created_at timestamptz not null
```

`percentage_bps` usa puntos base: `1500 = 15,00 %`. El alcance puede ser `global`, `provider` o `service`. Debe existir una precedencia determinística y solo una regla aplicable por reserva.

### `provider_wallet_transactions`

```text
id uuid primary key
provider_id uuid not null
booking_id uuid null
booking_payment_id uuid null
refund_id uuid null
type text not null
status text not null
gross_amount integer not null
platform_fee_amount integer not null default 0
processing_fee_amount integer not null default 0
tax_amount integer not null default 0
net_amount integer not null
currency text not null default 'CLP'
idempotency_key text unique not null
available_at timestamptz null
metadata jsonb not null default '{}'
created_at timestamptz not null
```

Tipos mínimos: `service_earning`, `earning_release`, `earning_reversal`, `refund_reversal`, `chargeback_reversal`, `payout` y `adjustment`.

### `payment_refunds`

```text
id uuid primary key
booking_payment_id uuid not null
booking_id uuid not null
customer_id uuid not null
destination text not null
amount integer not null
currency text not null
status text not null
mercadopago_refund_id text unique null
idempotency_key text unique not null
reason text null
created_at timestamptz not null
updated_at timestamptz not null
completed_at timestamptz null
```

Destinos: `original_payment_method`, `nod_credits`. Estados: `pending`, `approved`, `rejected`, `failed`.

### `payment_webhook_events`

```text
id uuid primary key
provider text not null default 'mercadopago'
external_event_id text not null
event_type text not null
resource_id text null
signature_valid boolean not null
payload jsonb not null
processing_status text not null
attempts integer not null default 0
error text null
received_at timestamptz not null
processed_at timestamptz null
unique (provider, external_event_id)
```

No almacenar credenciales ni datos completos de tarjetas.

## 6. Cálculo de saldo

```text
available_credits = SUM(amount)
  WHERE status = 'available'

pending_credits = SUM(amount)
  WHERE status = 'pending'
```

El pago con créditos debe ejecutarse dentro de una transacción de base de datos:

1. bloquear la wallet o fila de saldo con `SELECT ... FOR UPDATE`;
2. recalcular el saldo disponible;
3. rechazar si es insuficiente;
4. insertar el débito con una `idempotency_key` única;
5. actualizar la reserva y `booking_payments`;
6. confirmar la transacción.

## 7. Contratos HTTP

Todas las rutas, salvo el webhook, requieren autenticación. El backend debe derivar `customer_id` desde la sesión, no desde el body.

### `GET /wallet`

Respuesta:

```json
{
  "wallet": {
    "available_credits": 15000,
    "pending_credits": 5000,
    "currency": "CLP"
  },
  "packages": [
    {
      "id": "uuid",
      "label": "5.000 créditos",
      "credits": 5000,
      "price": 5000,
      "currency": "CLP"
    }
  ],
  "transactions": [],
  "next_cursor": null
}
```

### `POST /wallet/topups`

Body:

```json
{ "package_id": "uuid" }
```

Proceso:

1. validar paquete activo;
2. crear `wallet_topups` e idempotency key;
3. crear preferencia Mercado Pago;
4. usar `external_reference = wallet_topup.id`;
5. configurar `notification_url`;
6. configurar `back_urls`:
   - `nod://payments/success`
   - `nod://payments/pending`
   - `nod://payments/failure`
7. configurar `auto_return = approved`;
8. persistir `preference_id`;
9. no acreditar créditos todavía.

Respuesta:

```json
{
  "preference_id": "string",
  "checkout_url": "https://www.mercadopago.cl/checkout/...",
  "sandbox_url": "https://sandbox.mercadopago.cl/checkout/...",
  "payment_status": "pending"
}
```

### `POST /wallet/payments`

Body:

```json
{ "booking_id": "uuid" }
```

Debe verificar propiedad, estado pagable, precio definitivo, moneda, pago previo y saldo. El débito y el cambio de estado deben ser atómicos.

Respuesta:

```json
{
  "booking_id": "uuid",
  "payment_status": "paid",
  "wallet": {
    "available_credits": 3000,
    "pending_credits": 0,
    "currency": "CLP"
  }
}
```

### `POST /payments/checkout`

Body:

```json
{ "booking_id": "uuid" }
```

Debe leer el monto desde la reserva, crear `booking_payments` y una preferencia con `external_reference = booking_payment.id`. No permitir un segundo pago aprobado para la reserva.

Al crear `booking_payments`, el backend debe resolver y congelar el desglose comercial:

```json
{
  "gross_amount": 12000,
  "platform_fee_amount": 1800,
  "payment_processing_fee_amount": 0,
  "tax_amount": 0,
  "provider_net_amount": 10200,
  "currency": "CLP"
}
```

El ejemplo usa una comisión ilustrativa de 15 %. No constituye la tarifa definitiva.

La respuesta usa el mismo formato que `POST /wallet/topups`.

### `GET /payments/bookings/:bookingId`

```json
{
  "booking_id": "uuid",
  "payment_id": "mercadopago-id",
  "preference_id": "string",
  "status": "approved",
  "status_detail": "accredited",
  "amount": 12000,
  "currency": "CLP",
  "updated_at": "2026-10-01T12:00:00Z"
}
```

### `POST /payments/webhooks/mercadopago`

Flujo obligatorio:

1. capturar body, query params, `x-signature` y `x-request-id`;
2. validar firma HMAC con `MERCADOPAGO_WEBHOOK_SECRET`;
3. persistir el evento antes de procesarlo;
4. responder rápidamente con `2xx` y procesar de forma segura;
5. consultar el recurso directamente en Mercado Pago usando el Access Token;
6. verificar `external_reference`, monto, moneda, cuenta receptora y modo sandbox/productivo;
7. usar una transacción y bloqueo para aplicar el resultado una sola vez;
8. si es una recarga aprobada, insertar `topup_credit`;
9. si es pago de reserva aprobado, marcar `payment_status = paid`;
10. nunca acreditar al proveedor por estados `pending`, `in_process` o `rejected`.

### `POST /cancel-booking`

Body ampliado:

```json
{
  "booking_id": "uuid",
  "reason": "string",
  "refund_destination": "original_payment_method"
}
```

`refund_destination` puede ser:

- `original_payment_method`: crear reembolso Mercado Pago; mantener `refund_status = pending` hasta confirmación;
- `nod_credits`: acreditar el monto efectivamente pagado como créditos, solo con consentimiento expreso;
- omitido: reserva impaga, sin devolución.

Si el pago original fue con Créditos NOD, el único destino permitido es `nod_credits`.

## 8. Wallet del proveedor

Separar claramente saldo de cliente y saldo de proveedor.

El proveedor solo acumula saldo si:

1. existe un `booking_payment` aprobado;
2. el servicio alcanza el estado de liberación definido;
3. no existe reembolso, disputa o contracargo que bloquee fondos.

El proveedor recibe el `provider_net_amount`, no el total pagado por el cliente. Cada movimiento debe exponer al menos:

- precio bruto pagado por el cliente;
- comisión de plataforma NOD;
- costo de procesamiento descontado, si contractualmente aplica;
- impuestos o retenciones, si aplican;
- monto neto para el proveedor;
- fecha estimada de liberación;
- estado del saldo.

Ejemplo ilustrativo:

```text
Cliente paga                         $12.000
Comisión NOD 15 %                   -$1.800
Costo Mercado Pago asumido por NOD       $0 para el proveedor
Impuestos/retenciones                    $0 (por definir)
Neto wallet proveedor               $10.200
```

La comisión nunca debe calcularse en el teléfono. Debe resolverse en backend con la regla vigente y guardarse como snapshot en el pago y en el movimiento del proveedor.

Estados recomendados: `pending_service`, `pending_release`, `available`, `withdrawn`, `reversed`, `held`.

Flujo recomendado:

1. pago aprobado: crear `service_earning` por el neto con estado `pending_service`;
2. servicio completado: mover a `pending_release`;
3. terminar ventana de reclamo: crear/liberar `earning_release` como `available`;
4. cancelación, reembolso o contracargo: generar `earning_reversal` o `chargeback_reversal`;
5. retiro: permitir únicamente fondos `available`.

Definir como configuración de negocio:

- porcentaje y/o monto fijo de comisión NOD;
- si la comisión cambia por proveedor o servicio;
- quién absorbe la comisión de Mercado Pago;
- impuestos incluidos o adicionales;
- plazo de liberación después del servicio;
- reparto de pérdidas por reembolso o contracargo;
- monto mínimo de retiro.

Antes de producción:

- auditar los `$27.000 CLP` pendientes actuales;
- identificar movimientos creados por reservas de prueba o impagas;
- generar reversas auditables, no borrar registros;
- bloquear `request-provider-payout` hasta completar la conciliación.

## 9. Seguridad y autorización

- RLS o controles equivalentes por `customer_id` y `provider_id`.
- La service-role key solo puede utilizarse en funciones backend.
- Rate limit para checkout, recargas, pagos y reembolsos.
- Idempotency key obligatoria por operación.
- Validar que el monto sea entero, positivo y en CLP.
- Validar transiciones de estado mediante una máquina de estados.
- Prohibir modificar una reserva pagada sin generar ajuste financiero.
- Registrar actor, IP, user-agent, request ID y timestamps para auditoría.
- Enmascarar datos bancarios y evitar registrar secretos en logs.
- Alertar por webhooks con firma inválida, diferencias de monto y múltiples intentos.

## 10. Estados y reglas

### Recarga

```text
created -> pending -> approved
                   -> rejected
                   -> cancelled
approved -> refunded
approved -> charged_back
```

### Pago de reserva

```text
created -> pending -> approved -> refunded
                   -> rejected
                   -> cancelled
approved -> partially_refunded
approved -> charged_back
```

No permitir saltos de estado fuera de estas reglas.

## 11. Reembolsos y contracargos

- Implementar reembolso total y dejar preparado el modelo para parcial.
- Mercado Pago es la fuente de verdad para el resultado del reembolso al medio original.
- Un reembolso a créditos debe guardar consentimiento, monto y vínculo con el pago original.
- Un contracargo posterior a la conversión en créditos debe bloquear o debitar los créditos disponibles y abrir un caso si genera insuficiencia.
- No borrar compras, pagos, recargas, eventos ni movimientos.

## 12. Conciliación

Implementar un proceso diario que compare:

- pagos y reembolsos en Mercado Pago;
- `wallet_topups`;
- `booking_payments`;
- `payment_refunds`;
- movimientos del ledger;
- saldo del proveedor.

Generar alertas para recursos huérfanos, diferencias de monto/moneda, pagos sin webhook, webhooks sin operación local y operaciones duplicadas.

## 13. Pruebas obligatorias

### Recargas

- aprobada, pendiente, rechazada y cancelada;
- webhook duplicado o fuera de orden;
- monto adulterado desde la app;
- paquete desactivado;
- retorno por deep link sin webhook;
- contracargo posterior.

### Pago con créditos

- saldo exacto, suficiente e insuficiente;
- dos pagos simultáneos;
- reintento con la misma idempotency key;
- reserva ya pagada;
- reserva de otro cliente;
- reversa por cancelación.

### Pago directo

- aprobado, pendiente y rechazado;
- pago duplicado;
- webhook con firma inválida;
- monto/moneda diferentes;
- devolución a medio original;
- conversión voluntaria a créditos.

### Proveedor

- reserva impaga no genera saldo;
- pago aprobado genera saldo pendiente;
- servicio completado libera según política;
- reembolso o contracargo revierte/bloquea fondos;
- retiro bloqueado si existen fondos disputados.
- cálculo correcto de bruto, comisión NOD, costo de procesamiento, impuestos y neto;
- snapshot de comisión inmutable aunque cambie la regla posteriormente;
- reglas globales, por proveedor y por servicio con precedencia determinística;
- redondeo consistente a pesos enteros y conservación de la identidad `bruto = descuentos + neto`;

## 14. Observabilidad

Métricas mínimas:

- checkouts creados y abandonados;
- aprobación/rechazo por medio de pago;
- latencia y errores de webhook;
- eventos duplicados;
- recargas y débitos por día;
- diferencias de conciliación;
- reembolsos y contracargos;
- wallets con saldo negativo, que debe ser siempre cero.

Cada operación debe poder rastrearse mediante `request_id`, `external_reference`, `payment_id`, `booking_id`, `topup_id` e `idempotency_key`.

## 15. Orden de implementación

1. Congelar retiros y auditar el saldo pendiente existente.
2. Crear migraciones, restricciones y RLS.
3. Implementar ledger y funciones SQL transaccionales.
4. Implementar `GET /wallet` y paquetes.
5. Implementar recargas y creación de preferencias sandbox.
6. Implementar webhook firmado e idempotente.
7. Implementar pago de reservas con créditos.
8. Implementar pago directo con Mercado Pago.
9. Implementar cancelación y reembolsos.
10. Corregir wallet y liberación de fondos del proveedor.
11. Ejecutar pruebas de concurrencia y sandbox.
12. Desplegar en staging y probar Android/iOS.
13. Obtener aprobación legal, contable y de producto.
14. Activar `PAYMENTS_ENABLED` en backend.
15. Publicar la app con `EXPO_PUBLIC_MERCADOPAGO_ENABLED=true`.

## 16. Criterios de aceptación

La integración se considera lista cuando:

- ningún secreto está presente en la app móvil;
- una recarga aprobada se acredita exactamente una vez;
- una recarga rechazada o pendiente no incrementa saldo disponible;
- dos débitos concurrentes no pueden sobregirar una wallet;
- una reserva no puede pagarse dos veces;
- completar una reserva impaga no genera saldo de proveedor;
- el proveedor recibe exactamente el neto congelado y NOD conserva la comisión registrada;
- cada pago permite conciliar bruto, comisión, costos, impuestos y neto sin diferencias;
- cada movimiento tiene una referencia e idempotency key auditables;
- cancelaciones restituyen exactamente el monto pagado al destino elegido;
- webhooks inválidos son rechazados y auditados;
- la conciliación no presenta diferencias;
- pasan todas las pruebas sandbox en Android e iOS;
- términos, privacidad y política de créditos/reembolsos están aprobados.

## 17. Referencias oficiales

- Checkout Pro Preferences: https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro-preferences/overview
- URLs de retorno: https://www.mercadopago.cl/developers/es/docs/checkout-pro-preferences/configure-back-urls
- Webhooks: https://www.mercadopago.cl/developers/es/docs/checkout-pro-orders/notifications?scope=prod
- Reembolsos: https://www.mercadopago.cl/developers/es/docs/checkout-api-payments/payment-management/cancellations-and-refunds?scope=prod
- CMF, emisores con provisión de fondos: https://www.cmfchile.cl/portal/principal/623/w4-article-29349.html
