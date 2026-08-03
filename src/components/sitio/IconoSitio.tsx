import {
  HardHat, Glasses, Footprints, Shirt, Brush, Coffee, FileStack, IdCard,
  Flame, TriangleAlert, Wrench, Laptop, Zap, Package, ShieldCheck, Medal,
  Handshake, Truck, Clock4, ReceiptText, Star, Users, Eye, MapPin, Factory,
  Hospital, Store, Building2, Tractor, Phone, Mail, Check, Sparkles,
  type LucideIcon,
} from 'lucide-react'

/**
 * Traduce el nombre de icono que se escribe en el ERP (en español, simple)
 * al icono real que se dibuja en la web. Si el nombre no existe, cae en "caja".
 */
const MAPA_ICONOS: Record<string, LucideIcon> = {
  casco: HardHat,
  gafas: Glasses,
  guantes: Handshake,
  botas: Footprints,
  camiseta: Shirt,
  escoba: Brush,
  cafe: Coffee,
  papel: FileStack,
  tarjeta: IdCard,
  extintor: Flame,
  senal: TriangleAlert,
  llave: Wrench,
  portatil: Laptop,
  rayo: Zap,
  caja: Package,
  escudo: ShieldCheck,
  medalla: Medal,
  manos: Handshake,
  camion: Truck,
  reloj: Clock4,
  factura: ReceiptText,
  estrella: Star,
  usuarios: Users,
  ojo: Eye,
  mapa: MapPin,
  fabrica: Factory,
  hospital: Hospital,
  tienda: Store,
  edificio: Building2,
  tractor: Tractor,
  telefono: Phone,
  correo: Mail,
  check: Check,
  brillo: Sparkles,
}

export function iconoDe(nombre: string | null | undefined): LucideIcon {
  if (!nombre) return Package
  return MAPA_ICONOS[nombre.trim().toLowerCase()] ?? Package
}

export default function IconoSitio({
  nombre,
  className = 'w-6 h-6',
}: {
  nombre: string | null | undefined
  className?: string
}) {
  const Icono = iconoDe(nombre)
  return <Icono className={className} strokeWidth={1.75} aria-hidden="true" />
}
