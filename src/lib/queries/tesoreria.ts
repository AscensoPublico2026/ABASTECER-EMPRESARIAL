import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface CuentaSaldo {
  id: string
  nombre: string
  tipo: string
  banco: string | null
  numero_cuenta: string | null
  es_reserva: boolean
  saldo_inicial: number
  total_ingresos: number
  total_egresos: number
  saldo_actual: number
  num_movimientos: number
}

export async function obtenerSaldosCuentas(): Promise<CuentaSaldo[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('saldos_cuentas')
      .select('*')
      .eq('activa', true)
      .order('orden')

    return (data ?? []).map((c) => ({
      id: String(c.id),
      nombre: String(c.nombre),
      tipo: String(c.tipo),
      banco: c.banco,
      numero_cuenta: c.numero_cuenta,
      es_reserva: Boolean(c.es_reserva),
      saldo_inicial: Number(c.saldo_inicial ?? 0),
      total_ingresos: Number(c.total_ingresos ?? 0),
      total_egresos: Number(c.total_egresos ?? 0),
      saldo_actual: Number(c.saldo_actual ?? 0),
      num_movimientos: Number(c.num_movimientos ?? 0),
    }))
  } catch {
    return []
  }
}

export async function obtenerCuentasParaSelect(): Promise<{ id: string; nombre: string; es_reserva: boolean }[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('cuentas')
      .select('id, nombre, es_reserva')
      .eq('activa', true)
      .order('orden')
    return (data ?? []).map((c) => ({
      id: String(c.id),
      nombre: String(c.nombre),
      es_reserva: Boolean(c.es_reserva),
    }))
  } catch {
    return []
  }
}

export interface PosicionFinanciera {
  saldo_operativo: number
  saldo_reservas: number
  saldo_total: number
  iva_por_pagar: number
  simple_por_pagar: number
  impuestos_por_pagar: number
  cuentas_por_pagar: number
  retenciones_por_declarar: number
  total_comprometido: number
  impuestos_sin_apartar: number
  disponible_real: number
  cuentas_por_cobrar: number
  disponible_proyectado: number
  ventas_subtotal_acum: number
  costo_real_acum: number
  utilidad_bruta_acum: number
  utilidad_neta_acum: number
  margen_bruto_pct: number
  gastos_operativos: number
  gmf_pagado: number
  gastos_operativos_total: number
  resultado_operativo: number
  capital_social: number
  prestamos_socios: number
  dividendos_pagados: number
  num_ventas: number
  pipeline_total: number
  pipeline_num: number
  reserva_insuficiente: boolean
  en_riesgo: boolean
}

const POSICION_VACIA: PosicionFinanciera = {
  saldo_operativo: 0, saldo_reservas: 0, saldo_total: 0,
  iva_por_pagar: 0, simple_por_pagar: 0, impuestos_por_pagar: 0,
  cuentas_por_pagar: 0, retenciones_por_declarar: 0, total_comprometido: 0, impuestos_sin_apartar: 0, disponible_real: 0,
  cuentas_por_cobrar: 0, disponible_proyectado: 0,
  ventas_subtotal_acum: 0, costo_real_acum: 0, utilidad_bruta_acum: 0,
  utilidad_neta_acum: 0, margen_bruto_pct: 0, gastos_operativos: 0,
  gmf_pagado: 0, gastos_operativos_total: 0,
  resultado_operativo: 0, capital_social: 0, prestamos_socios: 0,
  dividendos_pagados: 0, num_ventas: 0, pipeline_total: 0, pipeline_num: 0,
  reserva_insuficiente: false, en_riesgo: false,
}

export async function obtenerPosicionFinanciera(): Promise<{
  datos: PosicionFinanciera
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('posicion_financiera').select('*').maybeSingle()

    if (error) return { datos: POSICION_VACIA, error: error.message }
    if (!data) return { datos: POSICION_VACIA, error: null }

    const num = (v: unknown) => Number(v ?? 0)
    return {
      datos: {
        saldo_operativo: num(data.saldo_operativo),
        saldo_reservas: num(data.saldo_reservas),
        saldo_total: num(data.saldo_total),
        iva_por_pagar: num(data.iva_por_pagar),
        simple_por_pagar: num(data.simple_por_pagar),
        impuestos_por_pagar: num(data.impuestos_por_pagar),
        cuentas_por_pagar: num(data.cuentas_por_pagar),
        retenciones_por_declarar: num(data.retenciones_por_declarar),
        total_comprometido: num(data.total_comprometido),
        impuestos_sin_apartar: num(data.impuestos_sin_apartar),
        disponible_real: num(data.disponible_real),
        cuentas_por_cobrar: num(data.cuentas_por_cobrar),
        disponible_proyectado: num(data.disponible_proyectado),
        ventas_subtotal_acum: num(data.ventas_subtotal_acum),
        costo_real_acum: num(data.costo_real_acum),
        utilidad_bruta_acum: num(data.utilidad_bruta_acum),
        utilidad_neta_acum: num(data.utilidad_neta_acum),
        margen_bruto_pct: num(data.margen_bruto_pct),
        gastos_operativos: num(data.gastos_operativos),
        gmf_pagado: num(data.gmf_pagado),
        gastos_operativos_total: num(data.gastos_operativos_total),
        resultado_operativo: num(data.resultado_operativo),
        capital_social: num(data.capital_social),
        prestamos_socios: num(data.prestamos_socios),
        dividendos_pagados: num(data.dividendos_pagados),
        num_ventas: num(data.num_ventas),
        pipeline_total: num(data.pipeline_total),
        pipeline_num: num(data.pipeline_num),
        reserva_insuficiente: Boolean(data.reserva_insuficiente),
        en_riesgo: Boolean(data.en_riesgo),
      },
      error: null,
    }
  } catch (e) {
    return { datos: POSICION_VACIA, error: e instanceof Error ? e.message : 'Error' }
  }
}

export interface ObligacionPeriodo {
  anio: string
  bimestre: number
  mes: string
  num_ventas: number
  base_gravable: number
  // ---- Bolsillo IVA ----
  iva_cobrado: number
  iva_descontable: number
  /** ReteIVA: es anticipo del IVA, descuenta ESTE bolsillo */
  reteiva: number
  iva_a_pagar: number
  iva_saldo_favor: number
  // ---- Bolsillo Simple ----
  simple_causado: number
  retefuente: number
  reteica: number
  /** Solo retefuente + reteICA. La reteIVA NO entra aqui. */
  retenciones_del_simple: number
  simple_a_pagar: number
  simple_saldo_favor: number
  /**
   * Suma de las TRES retenciones. Solo informativo.
   * No restarlo de un solo impuesto: seria contarlo dos veces.
   */
  retenciones_a_favor: number
  // ---- Resultado ----
  utilidad_bruta: number
  utilidad_neta: number
}

export async function obtenerObligacionesPorPeriodo(): Promise<ObligacionPeriodo[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.from('obligaciones_por_periodo').select('*').limit(24)
    return (data ?? []).map((r) => ({
      anio: String(r.anio),
      bimestre: Number(r.bimestre ?? 0),
      mes: String(r.mes),
      num_ventas: Number(r.num_ventas ?? 0),
      base_gravable: Number(r.base_gravable ?? 0),
      iva_cobrado: Number(r.iva_cobrado ?? 0),
      iva_descontable: Number(r.iva_descontable ?? 0),
      reteiva: Number(r.reteiva ?? 0),
      iva_a_pagar: Number(r.iva_a_pagar ?? 0),
      iva_saldo_favor: Number(r.iva_saldo_favor ?? 0),
      simple_causado: Number(r.simple_causado ?? 0),
      retefuente: Number(r.retefuente ?? 0),
      reteica: Number(r.reteica ?? 0),
      retenciones_del_simple: Number(r.retenciones_del_simple ?? 0),
      retenciones_a_favor: Number(r.retenciones_a_favor ?? 0),
      simple_a_pagar: Number(r.simple_a_pagar ?? 0),
      simple_saldo_favor: Number(r.simple_saldo_favor ?? 0),
      utilidad_bruta: Number(r.utilidad_bruta ?? 0),
      utilidad_neta: Number(r.utilidad_neta ?? 0),
    }))
  } catch {
    return []
  }
}


// ============================================================
// LIBRO DE TESORERIA (movimientos con su origen)
// ============================================================
export interface MovimientoLibro {
  id: string
  fecha: string
  tipo: 'INGRESO' | 'EGRESO'
  categoria: string
  monto: number
  concepto: string
  medio_pago: string | null
  referencia: string | null
  soporte_url: string | null
  notas: string | null
  creado_por_nombre: string | null
  cuenta_id: string
  cuenta_nombre: string
  cuenta_es_reserva: boolean
  origen: string
  es_manual: boolean
  movimiento_relacionado_id: string | null
}

export async function obtenerLibroTesoreria(): Promise<{
  movimientos: MovimientoLibro[]
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('libro_tesoreria')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) return { movimientos: [], error: error.message }

    const movimientos = (data ?? []).map((m) => ({
      id: String(m.id),
      fecha: String(m.fecha),
      tipo: (m.tipo === 'INGRESO' ? 'INGRESO' : 'EGRESO') as 'INGRESO' | 'EGRESO',
      categoria: String(m.categoria ?? 'OTRO'),
      monto: Number(m.monto ?? 0),
      concepto: String(m.concepto ?? ''),
      medio_pago: m.medio_pago ?? null,
      referencia: m.referencia ?? null,
      soporte_url: m.soporte_url ?? null,
      notas: m.notas ?? null,
      creado_por_nombre: m.creado_por_nombre ?? null,
      cuenta_id: String(m.cuenta_id),
      cuenta_nombre: String(m.cuenta_nombre ?? ''),
      cuenta_es_reserva: Boolean(m.cuenta_es_reserva),
      origen: String(m.origen ?? 'Manual'),
      // Solo los movimientos que no vienen de otro modulo se pueden borrar aqui
      // Los manuales y los GMF se pueden borrar desde el libro.
      // El GMF porque a veces el banco no lo cobra (entidades exentas).
      es_manual: m.origen === 'Manual' || m.categoria === 'GMF',
      movimiento_relacionado_id: m.movimiento_relacionado_id ?? null,
    }))

    return { movimientos, error: null }
  } catch (e) {
    return { movimientos: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

// ============================================================
// ESTADO DE LA RESERVA DE IMPUESTOS
// ============================================================
export interface EstadoReserva {
  iva_por_pagar: number
  simple_por_pagar: number
  debe_estar_reservado: number
  esta_reservado: number
  falta_trasladar: number
  sobra_en_reserva: number
  saldo_operativo: number
  alcanza_para_trasladar: boolean
  cuenta_reserva_id: string | null
}

const RESERVA_VACIA: EstadoReserva = {
  iva_por_pagar: 0,
  simple_por_pagar: 0,
  debe_estar_reservado: 0,
  esta_reservado: 0,
  falta_trasladar: 0,
  sobra_en_reserva: 0,
  saldo_operativo: 0,
  alcanza_para_trasladar: false,
  cuenta_reserva_id: null,
}

export async function obtenerEstadoReserva(): Promise<{
  datos: EstadoReserva
  error: string | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('estado_reserva_impuestos').select('*').maybeSingle()

    if (error) return { datos: RESERVA_VACIA, error: error.message }
    if (!data) return { datos: RESERVA_VACIA, error: null }

    const num = (v: unknown) => Number(v ?? 0)
    return {
      datos: {
        iva_por_pagar: num(data.iva_por_pagar),
        simple_por_pagar: num(data.simple_por_pagar),
        debe_estar_reservado: num(data.debe_estar_reservado),
        esta_reservado: num(data.esta_reservado),
        falta_trasladar: num(data.falta_trasladar),
        sobra_en_reserva: num(data.sobra_en_reserva),
        saldo_operativo: num(data.saldo_operativo),
        alcanza_para_trasladar: Boolean(data.alcanza_para_trasladar),
        cuenta_reserva_id: data.cuenta_reserva_id ? String(data.cuenta_reserva_id) : null,
      },
      error: null,
    }
  } catch (e) {
    return { datos: RESERVA_VACIA, error: e instanceof Error ? e.message : 'Error' }
  }
}


// ============================================================
// GMF (4x1000) POR PERIODO
// ============================================================
export interface GmfPeriodo {
  anio: string
  mes: string
  num_transacciones: number
  gmf_pagado: number
  base_aproximada: number
}

export async function obtenerGmfPorPeriodo(): Promise<GmfPeriodo[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase.from('gmf_por_periodo').select('*').limit(24)
    return (data ?? []).map((r) => ({
      anio: String(r.anio),
      mes: String(r.mes),
      num_transacciones: Number(r.num_transacciones ?? 0),
      gmf_pagado: Number(r.gmf_pagado ?? 0),
      base_aproximada: Number(r.base_aproximada ?? 0),
    }))
  } catch {
    return []
  }
}


// ============================================================
// DESCUADRES CONTRA EL BANCO (el 4x1000 como testigo)
// ============================================================
/**
 * El 4x1000 es el unico dato del libro que calcula el BANCO y no nosotros.
 * Si el GMF cobrado no corresponde al monto guardado del egreso, uno de los
 * dos esta mal; y como el banco no se equivoca con su propio cobro, casi
 * siempre es el monto el que quedo incompleto.
 *
 * De aqui salio el caso de la impresora: el movimiento decia 654.881 pero un
 * GMF de 2.819 solo se explica con un egreso de ~704.750. Eran 49.869 que
 * salieron de la cuenta y no estaban registrados, y nada lo avisaba.
 *
 * Si la vista no existe todavia (migracion 038 sin correr) devuelve vacio en
 * vez de tumbar la pagina.
 */
export interface DescuadreGmf {
  movimiento_id: string
  fecha: string | null
  concepto: string
  cuenta: string | null
  monto_registrado: number
  gmf_cobrado: number
  gmf_que_corresponde: number
  monto_que_vio_el_banco: number
  plata_sin_registrar: number
}

export async function obtenerDescuadresGmf(): Promise<DescuadreGmf[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('gmf_descuadre')
      .select('movimiento_id, fecha, concepto, cuenta, monto_registrado, gmf_cobrado, gmf_que_corresponde, monto_que_vio_el_banco, plata_sin_registrar')

    if (error || !data) return []

    return data.map((d) => ({
      movimiento_id: String(d.movimiento_id),
      fecha: (d.fecha as string | null) ?? null,
      concepto: String(d.concepto ?? ''),
      cuenta: (d.cuenta as string | null) ?? null,
      monto_registrado: Number(d.monto_registrado ?? 0),
      gmf_cobrado: Number(d.gmf_cobrado ?? 0),
      gmf_que_corresponde: Number(d.gmf_que_corresponde ?? 0),
      monto_que_vio_el_banco: Number(d.monto_que_vio_el_banco ?? 0),
      plata_sin_registrar: Number(d.plata_sin_registrar ?? 0),
    }))
  } catch {
    return []
  }
}


// ============================================================
// AUDITORIA DE INTEGRIDAD DEL CIRCUITO DEL DINERO
// ============================================================
/**
 * Lee la vista auditoria_integridad (migracion 039), que junta en un solo
 * lugar todo lo que este descuadrado: el banco contra el 4x1000, costos de
 * compra que no aterrizan en ningun producto, gastos sin repartir,
 * documentos soporte que declaran una cifra distinta a la real, facturas
 * marcadas pagadas sin salida de plata, y cotizaciones cuyo total no cuadra
 * con sus items.
 *
 * POR QUE EXISTE: el dueno estaba encontrando los errores uno por uno,
 * revisando con calculadora. Eso lo tiene que hacer el sistema.
 *
 * Si la vista no existe todavia devuelve vacio en vez de tumbar la pagina.
 */
export interface HallazgoAuditoria {
  area: string
  gravedad: string
  problema: string
  detalle: string
  diferencia: number
  referencia: string
}

export async function obtenerAuditoriaIntegridad(): Promise<HallazgoAuditoria[]> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('auditoria_integridad')
      .select('area, gravedad, problema, detalle, diferencia, referencia')

    if (error || !data) return []

    return data
      .map((h) => ({
        area: String(h.area ?? ''),
        gravedad: String(h.gravedad ?? ''),
        problema: String(h.problema ?? ''),
        detalle: String(h.detalle ?? ''),
        diferencia: Number(h.diferencia ?? 0),
        referencia: String(h.referencia ?? ''),
      }))
      // Lo grave primero, y dentro de eso lo de mayor plata
      .sort((a, b) => {
        if (a.gravedad !== b.gravedad) return a.gravedad === 'GRAVE' ? -1 : 1
        return Math.abs(b.diferencia) - Math.abs(a.diferencia)
      })
  } catch {
    return []
  }
}
