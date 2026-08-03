'use client'

import { useMemo, useState, useTransition } from 'react'
import clsx from 'clsx'
import {
  Search, Eye, EyeOff, Star, Pencil, X, Save, Loader2, CheckCircle2, AlertCircle,
  ImageOff, Plus, Trash2, ExternalLink, Rocket,
} from 'lucide-react'
import {
  alternarDestacadoWeb, alternarVisibleWeb, guardarProductoWeb, publicarTodosLosProductos,
  type ResultadoAccion,
} from '../actions'
import SubirImagen from '../SubirImagen'
import type { ProductoAdminWeb } from '@/lib/queries/sitioAdmin'

type Filtro = 'todos' | 'publicados' | 'ocultos' | 'sin-imagen' | 'destacados'

const FILTROS: { clave: Filtro; nombre: string }[] = [
  { clave: 'todos', nombre: 'Todos' },
  { clave: 'publicados', nombre: 'Publicados' },
  { clave: 'ocultos', nombre: 'Ocultos' },
  { clave: 'sin-imagen', nombre: 'Sin foto' },
  { clave: 'destacados', nombre: 'Destacados' },
]

interface Props {
  productos: ProductoAdminWeb[]
  categorias: { id: string; nombre: string }[]
  filtroInicial?: Filtro
}

export default function PanelProductosWeb({ productos, categorias, filtroInicial = 'todos' }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial)
  const [editando, setEditando] = useState<ProductoAdminWeb | null>(null)
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null)
  const [ocupado, iniciar] = useTransition()

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => p.activo)
      .filter((p) => {
        if (filtro === 'publicados') return p.visible_web
        if (filtro === 'ocultos') return !p.visible_web
        if (filtro === 'sin-imagen') return p.visible_web && !p.imagen_url
        if (filtro === 'destacados') return p.destacado_web
        return true
      })
      .filter((p) => {
        if (!termino) return true
        return (
          p.nombre.toLowerCase().includes(termino) ||
          p.nombre_web.toLowerCase().includes(termino) ||
          p.codigo.toLowerCase().includes(termino) ||
          p.marca.toLowerCase().includes(termino) ||
          (p.categoria_nombre ?? '').toLowerCase().includes(termino)
        )
      })
  }, [productos, busqueda, filtro])

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    iniciar(async () => {
      const r = await accion()
      setResultado(r)
      window.setTimeout(() => setResultado(null), 4000)
    })
  }

  function publicar(producto: ProductoAdminWeb, publicar: boolean) {
    const fd = new FormData()
    fd.set('id', producto.id)
    fd.set('publicar', String(publicar))
    ejecutar(() => alternarVisibleWeb(fd))
  }

  function destacar(producto: ProductoAdminWeb, destacar: boolean) {
    const fd = new FormData()
    fd.set('id', producto.id)
    fd.set('destacar', String(destacar))
    ejecutar(() => alternarDestacadoWeb(fd))
  }

  const ocultos = productos.filter((p) => p.activo && !p.visible_web).length

  return (
    <div className="space-y-4">
      {resultado ? (
        <div
          className={clsx(
            'flex items-center gap-2.5 rounded-2xl border p-4 text-sm',
            resultado.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          {resultado.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {resultado.mensaje}
        </div>
      ) : null}

      {/* Buscador y filtros */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código, marca o línea..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {ocultos > 0 ? (
            <button
              type="button"
              onClick={() => ejecutar(() => publicarTodosLosProductos())}
              disabled={ocupado}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Publicar los {ocultos} ocultos
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setFiltro(f.clave)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                filtro === f.clave
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              )}
            >
              {f.nombre}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-400">
            {visibles.length} producto(s)
          </span>
        </div>
      </div>

      {/* Lista */}
      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No hay productos que coincidan. Los productos se crean en{' '}
          <span className="font-semibold text-gray-700">Catálogo</span> y aparecen aquí
          automáticamente.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <ul className="divide-y divide-gray-50">
            {visibles.map((producto) => (
              <li key={producto.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {producto.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={producto.imagen_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                <div className="min-w-[200px] flex-1">
                  <p className="text-sm font-semibold leading-snug text-gray-800">
                    {producto.nombre_web || producto.nombre}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono">{producto.codigo}</span>
                    {producto.categoria_nombre ? <span>· {producto.categoria_nombre}</span> : null}
                    {producto.marca ? <span>· {producto.marca}</span> : null}
                    {!producto.descripcion_web && !producto.descripcion ? (
                      <span className="text-amber-500">· sin descripción</span>
                    ) : null}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => publicar(producto, !producto.visible_web)}
                    disabled={ocupado}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50',
                      producto.visible_web
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                    title={producto.visible_web ? 'Ocultar de la web' : 'Publicar en la web'}
                  >
                    {producto.visible_web ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    {producto.visible_web ? 'En la web' : 'Oculto'}
                  </button>

                  <button
                    type="button"
                    onClick={() => destacar(producto, !producto.destacado_web)}
                    disabled={ocupado}
                    className={clsx(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition disabled:opacity-50',
                      producto.destacado_web
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-gray-50 text-gray-300 hover:bg-amber-50 hover:text-amber-500'
                    )}
                    title={producto.destacado_web ? 'Quitar de destacados' : 'Destacar en la portada'}
                  >
                    <Star className={clsx('h-4 w-4', producto.destacado_web && 'fill-current')} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditando(producto)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar web
                  </button>

                  {producto.visible_web && producto.slug ? (
                    <a
                      href={`/catalogo/${producto.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-300 transition hover:bg-gray-50 hover:text-gray-600"
                      title="Ver en la web"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editando ? (
        <ModalProductoWeb
          producto={editando}
          categorias={categorias}
          onCerrar={() => setEditando(null)}
          onGuardado={(r) => {
            setResultado(r)
            if (r.ok) setEditando(null)
            window.setTimeout(() => setResultado(null), 4000)
          }}
        />
      ) : null}
    </div>
  )
}

// ============================================================
// Modal de edicion web del producto
// ============================================================
function ModalProductoWeb({
  producto,
  categorias,
  onCerrar,
  onGuardado,
}: {
  producto: ProductoAdminWeb
  categorias: { id: string; nombre: string }[]
  onCerrar: () => void
  onGuardado: (r: ResultadoAccion) => void
}) {
  const [imagenPrincipal, setImagenPrincipal] = useState(producto.imagen_url)
  const [galeria, setGaleria] = useState<string[]>(producto.imagenes)
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState('')

  const claseCampo =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

  function manejarEnvio(formData: FormData) {
    formData.set('imagen_url', imagenPrincipal)
    formData.set('imagenes', JSON.stringify(galeria.filter(Boolean)))

    iniciar(async () => {
      const r = await guardarProductoWeb(formData)
      if (!r.ok) setError(r.mensaje)
      onGuardado(r)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div className="texto-normal w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-800">Cómo se ve en la web</h3>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              <span className="font-mono text-xs">{producto.codigo}</span> · {producto.nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={manejarEnvio} className="space-y-5 px-6 py-6">
          <input type="hidden" name="id" value={producto.id} />

          <SubirImagen
            carpeta={`productos/${producto.id}`}
            valor={imagenPrincipal}
            onCambio={setImagenPrincipal}
            etiqueta="Foto principal"
          />

          {/* Galeria */}
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">
              Más fotos <span className="font-normal text-gray-400">(opcional)</span>
            </p>
            <div className="space-y-2.5">
              {galeria.map((url, i) => (
                <div key={`${url}-${i}`} className="flex items-start gap-2">
                  <div className="flex-1">
                    <SubirImagen
                      carpeta={`productos/${producto.id}`}
                      valor={url}
                      compacto
                      onCambio={(nueva) =>
                        setGaleria((actuales) =>
                          actuales.map((u, indice) => (indice === i ? nueva : u))
                        )
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setGaleria((actuales) => actuales.filter((_, indice) => indice !== i))}
                    className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Quitar foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {galeria.length < 6 ? (
                <button
                  type="button"
                  onClick={() => setGaleria((actuales) => [...actuales, ''])}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar otra foto
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Nombre para la web
              </label>
              <input
                name="nombre_web"
                type="text"
                defaultValue={producto.nombre_web}
                placeholder={producto.nombre}
                maxLength={200}
                className={claseCampo}
              />
              <p className="mt-1 text-xs text-gray-400">
                Si lo dejas vacío se usa el nombre del catálogo interno. Aquí puedes escribirlo con
                tildes y mayúsculas normales.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Marca</label>
              <input
                name="marca"
                type="text"
                defaultValue={producto.marca}
                maxLength={120}
                placeholder="Ej: 3M, Steelpro..."
                className={claseCampo}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Línea</label>
              <select name="categoria_id" defaultValue={producto.categoria_id ?? ''} className={claseCampo}>
                <option value="">Sin línea</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Descripción comercial
              </label>
              <textarea
                name="descripcion_web"
                rows={4}
                defaultValue={producto.descripcion_web}
                placeholder={
                  producto.descripcion ||
                  'Explícale al cliente para qué sirve, de qué material es y en qué casos se usa.'
                }
                maxLength={4000}
                className={clsx(claseCampo, 'leading-relaxed')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Especificaciones técnicas
              </label>
              <textarea
                name="ficha"
                rows={5}
                defaultValue={producto.ficha}
                placeholder={'Material|Polietileno de alta densidad\nNorma|ANSI Z89.1\nTallas|Única ajustable'}
                maxLength={4000}
                className={clsx(claseCampo, 'font-mono text-[13px] leading-relaxed')}
              />
              <p className="mt-1 text-xs text-gray-400">
                Una por línea, con el formato <span className="font-mono">Atributo|Valor</span>. Se
                muestran como tabla en la ficha del producto.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Orden en el catálogo
              </label>
              <input
                name="orden_web"
                type="number"
                defaultValue={producto.orden_web}
                className={claseCampo}
              />
              <p className="mt-1 text-xs text-gray-400">Menor número = aparece primero.</p>
            </div>

            <div className="space-y-2.5 sm:pt-7">
              <label className="flex items-center gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="visible_web"
                  defaultChecked={producto.visible_web}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Mostrar en la página web
              </label>
              <label className="flex items-center gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="destacado_web"
                  defaultChecked={producto.destacado_web}
                  className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                />
                Destacar en la portada
              </label>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {guardando ? 'Guardando...' : 'Guardar y publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
