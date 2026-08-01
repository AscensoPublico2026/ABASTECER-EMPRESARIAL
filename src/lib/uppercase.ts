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
 * Transforma todos los campos de texto de un FormData a MAYUSCULAS.
 * Ignora campos que son archivos, JSON, o campos especiales (ids, fechas, numeros).
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
    const value = formData.get(key)
    if (typeof value !== 'string') continue
    if (value.startsWith('{') || value.startsWith('[') || value.startsWith('http')) continue
    formData.set(key, value.toUpperCase())
  }
}
