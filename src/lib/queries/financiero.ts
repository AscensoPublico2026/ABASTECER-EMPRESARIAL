import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DatosFinancieros {
  // IVA
  ivaCobrado: number
  ivaPagado: number
  ivaPorPagar: number
  // Operacion
  ventasTotales: number
  comprasTotales: number
  utilidadBruta: number
  margenPromedio: number
  // Cartera
  cuentasPorCobrar: number
  cuentasPorPagar: number
  // Capital
  capitalSocial: number
  prestamosSocios: number
  dividendosPagados: number
  // Indicadores
  numeroCotizaciones: number
  numeroVentasFacturadas: number
  numeroCompras: number
  // Semaforo (simplificado)
  semaforoDividendos: 'VERDE' | 'AMARILLO' | 'ROJO'
  motivoSemaforo: string[]
  // Regla dia siguiente (60 dias)
  sobrevive60Dias: boolean
  diasEstimados: number
}

const DATOS_VACIOS: DatosFinancieros = {
  ivaCobrado: 0, ivaPagado: 0, ivaPorPagar: 0,
  ventasTotales: 0, comprasTotales: 0, utilidadBruta: 0, margenPromedio: 0,
  cuentasPorCobrar: 0, cuentasPorPagar: 0,
  capitalSocial: 0, prestamosSocios: 0, dividendosPagados: 0,
  numeroCotizaciones: 0, numeroVentasFacturadas: 0, numeroCompras: 0,
  semaforoDividendos: 'ROJO', motivoSemaforo: ['Sin datos suficientes'],
  sobrevive60Dias: false, diasEstimados: 0,
}

export async function obtenerDatosFinancieros(): Promise<{
  datos: DatosFinancieros
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()

    // Consultar las tablas correctas: cotizaciones, facturas_venta, facturas_compra
    const [cotizacionesRes, facturasVentaRes, comprasRes, sociosRes] = await Promise.all([
      supabase.from('cotizaciones').select('subtotal, iva_total, total, costo_total, utilidad_estimada, margen_pct, estado, dias_credito'),
      supabase.from('facturas_venta').select('subtotal, iva_total, total, costo_total, utilidad, margen_pct, estado, dias_credito'),
      supabase.from('facturas_compra').select('subtotal, iva_total, total, estado, dias_credito'),
      supabase.from('resumen_socios').select('capital_aportado, prestamo_pendiente, dividendos_recibidos'),
    ])

    if (cotizacionesRes.error) return { datos: DATOS_VACIOS, error: cotizacionesRes.error.message }
    if (facturasVentaRes.error) return { datos: DATOS_VACIOS, error: facturasVentaRes.error.message }
    if (comprasRes.error) return { datos: DATOS_VACIOS, error: comprasRes.error.message }

    const cotizaciones = cotizacionesRes.data ?? []
    const facturasVenta = facturasVentaRes.data ?? []
    const compras = comprasRes.data ?? []
    const socios = sociosRes.data ?? []

    // --- VENTAS (facturas_venta) ---
    // Las facturas de venta representan ventas reales (ya facturadas con DIAN)
    const ventasTotales = facturasVenta.reduce((s, fv) => s + Number(fv.total ?? 0), 0)
    const ivaCobrado = facturasVenta.reduce((s, fv) => s + Number(fv.iva_total ?? 0), 0)
    const utilidadBruta = facturasVenta.reduce((s, fv) => s + Number(fv.utilidad ?? 0), 0)
    const costoTotalVentas = facturasVenta.reduce((s, fv) => s + Number(fv.costo_total ?? 0), 0)
    const subtotalVentas = facturasVenta.reduce((s, fv) => s + Number(fv.subtotal ?? 0), 0)
    const margenPromedio = subtotalVentas > 0 ? (utilidadBruta / subtotalVentas) * 100 : 0

    // Cuentas por cobrar = facturas emitidas (a credito, pendientes de pago)
    const cuentasPorCobrar = facturasVenta
      .filter((fv) => fv.estado === 'EMITIDA')
      .reduce((s, fv) => s + Number(fv.total ?? 0), 0)

    // Conteo de cotizaciones (todas las activas, no rechazadas)
    const numeroCotizaciones = cotizaciones.filter((c) => c.estado !== 'RECHAZADA').length
    const numeroVentasFacturadas = facturasVenta.length

    // --- COMPRAS (facturas_compra) ---
    const comprasActivas = compras.filter((c) => c.estado !== 'ANULADA')
    const comprasTotales = comprasActivas.reduce((s, c) => s + Number(c.total ?? 0), 0)
    const ivaPagado = comprasActivas.reduce((s, c) => s + Number(c.iva_total ?? 0), 0)
    const cuentasPorPagar = compras
      .filter((c) => c.estado === 'REGISTRADA' || c.estado === 'POR_PAGAR' || c.estado === 'VENCIDA')
      .reduce((s, c) => s + Number(c.total ?? 0), 0)
    const numeroCompras = comprasActivas.length

    // --- IVA ---
    const ivaPorPagar = ivaCobrado - ivaPagado

    // --- SOCIOS ---
    const capitalSocial = socios.reduce((s, r) => s + Number(r.capital_aportado ?? 0), 0)
    const prestamosSocios = socios.reduce((s, r) => s + Number(r.prestamo_pendiente ?? 0), 0)
    const dividendosPagados = socios.reduce((s, r) => s + Number(r.dividendos_recibidos ?? 0), 0)

    // --- SEMAFORO DE DIVIDENDOS (Politica #007 - 7 condiciones) ---
    const motivoSemaforo: string[] = []
    if (capitalSocial <= 0) motivoSemaforo.push('No hay capital aportado')
    if (utilidadBruta <= 0) motivoSemaforo.push('No hay utilidad positiva')
    if (cuentasPorPagar > 0) motivoSemaforo.push('Cuentas por pagar: hay proveedores pendientes')
    if (ivaPorPagar > 0 && ivaPorPagar > capitalSocial * 0.3) motivoSemaforo.push('IVA por pagar es significativo')
    if (facturasVenta.length < 3) motivoSemaforo.push('Menos de 3 ventas facturadas — sin datos suficientes')

    let semaforoDividendos: 'VERDE' | 'AMARILLO' | 'ROJO' = 'ROJO'
    if (motivoSemaforo.length === 0) semaforoDividendos = 'VERDE'
    else if (motivoSemaforo.length <= 2 && utilidadBruta > 0) semaforoDividendos = 'AMARILLO'

    // --- REGLA DEL DIA SIGUIENTE (Decision #010) ---
    // Gastos fijos mensuales estimados = costo promedio mensual
    const mesesOperando = facturasVenta.length > 0 ? Math.max(1, facturasVenta.length / 4) : 1
    const gastoMensualEstimado = costoTotalVentas > 0 ? costoTotalVentas / mesesOperando : capitalSocial * 0.3 || 500000
    const cajaDisponible = capitalSocial + utilidadBruta - dividendosPagados - cuentasPorPagar
    const diasEstimados = gastoMensualEstimado > 0 ? Math.round((cajaDisponible / gastoMensualEstimado) * 30) : 0
    const sobrevive60Dias = diasEstimados >= 60

    return {
      datos: {
        ivaCobrado, ivaPagado, ivaPorPagar,
        ventasTotales, comprasTotales, utilidadBruta, margenPromedio,
        cuentasPorCobrar, cuentasPorPagar,
        capitalSocial, prestamosSocios, dividendosPagados,
        numeroCotizaciones, numeroVentasFacturadas, numeroCompras,
        semaforoDividendos, motivoSemaforo,
        sobrevive60Dias, diasEstimados,
      },
      error: null,
    }
  } catch (e) {
    return { datos: DATOS_VACIOS, error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
