/**
 * Convierte un valor de FormData a string en MAYUSCULAS.
 * Retorna null si está vacío.
 */
export function upper(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? '').trim()
  return str ? str.toUpperCase() : null
}

/**
 * Convierte un valor de FormData a string en MAYUSCULAS.
 * Retorna string vacío si no hay valor (para campos requeridos).
 */
export function upperReq(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim().toUpperCase()
}

/**
 * Valores que NO son texto para mostrar, sino banderas de si/no.
 * Pasarlos a mayusculas los rompe: 'true' se convierte en 'TRUE' y
 * cualquier comparacion contra 'true' falla en silencio.
 *
 * BUG REAL QUE ESTO EVITA: el campo es_costo_venta de un gasto llegaba
 * como 'TRUE', la comparacion `=== 'true'` daba false, y el gasto se
 * guardaba como operativo. El reparto hacia la venta NUNCA se creaba y
 * el gasto no aparecia en el informe de la cotizacion, aunque la
 * pantalla dijera "guardado" en verde. La utilidad de la venta quedaba
 * inflada porque ese costo no entraba.
 */
const VALORES_BOOLEANOS = new Set(['true', 'false', 'on', 'off', 'si', 'no', '1', '0'])

/**
 * Transforma todos los campos de texto de un FormData a MAYUSCULAS.
 *
 * NO toca: archivos, JSON, URLs, ids, fechas, numeros y banderas de si/no.
 * La deteccion es por FORMA del valor, no por una lista de nombres: una
 * lista se queda corta cada vez que se agrega un campo nuevo, y el error
 * no se nota hasta que alguien revisa un informe y le falta plata.
 */
export function uppercaseFormData(formData: FormData): void {
  const ignorar = ['id', 'cotizacion_id', 'producto_id', 'proveedor_id', 'cliente_id', 'categoria_id',
    'orden_compra_id', 'items', 'categorias', 'fecha', 'fecha_pago', 'fecha_factura',
    'fecha_validez', 'fecha_cotizacion', 'soporte_url', 'factura_pdf_url', 'factura_pdf_nombre',
    'oc_url', 'oc_nombre', 'oc_pdf_url', 'oc_pdf_nombre', 'monto', 'monto_recibido', 'precio',
    'precio_lista', 'retefuente', 'rete_iva', 'rete_ica', 'iva_porcentaje', 'margen_minimo_pct',
    'cantidad', 'stock_minimo', 'dias_credito', 'estado', 'forma_pago', 'condiciones_pago',
    'tipo_cuenta', 'unidad_medida', 'tipo_documento', 'contacto_email']

  const keys: string[] = []
  formData.forEach((_, key) => { keys.push(key) })

  for (const key of keys) {
    if (ignorar.includes(key)) continue
    // Cualquier id, fecha o bandera "es_/tiene_/con_", venga de donde venga
    if (key.endsWith('_id') || key.endsWith('_url') || key.startsWith('fecha')) continue
    if (key.startsWith('es_') || key.startsWith('tiene_') || key.startsWith('con_')) continue

    const value = formData.get(key)
    if (typeof value !== 'string') continue
    if (value.startsWith('{') || value.startsWith('[') || value.startsWith('http')) continue
    // Banderas de si/no: 'true' no se puede volver 'TRUE'
    if (VALORES_BOOLEANOS.has(value.trim().toLowerCase())) continue

    formData.set(key, value.toUpperCase())
  }
}

/**
 * Lee una bandera de si/no de un FormData sin importar mayusculas.
 * Acepta lo que manda un checkbox ('on') y lo que manda un input oculto
 * ('true'/'1'). Usar SIEMPRE esto en vez de comparar contra 'true'.
 */
export function leerBandera(value: FormDataEntryValue | null): boolean {
  const v = String(value ?? '').trim().toLowerCase()
  return v === 'on' || v === 'true' || v === '1' || v === 'si'
}
