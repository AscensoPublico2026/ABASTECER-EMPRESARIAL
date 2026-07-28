# Abastecer Empresarial SAS

> Centro de conocimiento y repositorio de desarrollo para **Abastecer Empresarial SAS**, una empresa de abastecimiento empresarial integral B2B.

---

## ¿Qué es este repositorio?

Este repositorio es la **única fuente de verdad** del proyecto Abastecer Empresarial. Aquí vive toda la documentación estratégica, las decisiones tomadas, las políticas financieras, y el código del ERP que operará la empresa.

Todo lo que se decide, se documenta. Todo lo que se construye, se versiona.

---

## Estructura de carpetas

```
ABASTECER-EMPRESARIAL/
├── docs/
│   ├── financiero/          → Políticas financieras, guías para socios, flujos de dinero
│   ├── erp/                 → Visión del ERP, módulos, flujos operativos, decisiones técnicas
│   ├── modelo-negocio/      → Modelo de negocio, propuesta de valor, estrategia comercial
│   └── decisiones/          → Decisiones puntuales con contexto y fecha
├── erp/                     → Código fuente del ERP (Next.js + Supabase)
└── README.md                → Este archivo
```

---

## Estado actual del proyecto

| Área | Estado | Detalle |
|------|--------|---------|
| Registro legal | 🟡 En proceso | Registro en Cámara de Comercio en trámite |
| Políticas financieras | ✅ Definidas | 6 políticas formales acordadas entre socios |
| ERP | 🟡 En desarrollo | Stack definido (Next.js + Supabase), estructura base creada |
| Primera venta | ⏳ Pendiente | Se busca tener ERP funcional antes de la primera operación |
| Facturación electrónica | ⏳ Pendiente | Por habilitar una vez registrada la empresa |
| Cuenta Bold | ⏳ Pendiente | Por abrir para pagos con datáfono |

---

## Principio rector

> **"Si mañana dejamos de vender durante 60 días, ¿la empresa sigue viva?"**

Esta pregunta guía TODAS las decisiones financieras y operativas. Antes de aprobar cualquier gasto fijo, contratación, o distribución de dividendos, debe pasar este filtro.

---

## Socios

| Socio | Participación | Rol |
|-------|---------------|-----|
| Julio | 50% | Co-fundador, desarrollo ERP, estrategia |
| Laura | 50% | Co-fundadora, operaciones, estrategia |

Ambos socios trabajan actualmente en Evolti (modalidad híbrida). Abastecer Empresarial se construye en paralelo hasta que sea sostenible por sí misma.

---

## Cómo usar este repositorio

### Para documentación estratégica
1. Consulta `docs/CONTINUIDAD.md` para la bitácora maestra de decisiones
2. Revisa `docs/financiero/` para entender las reglas del dinero
3. Lee `docs/erp/vision-erp.md` para la visión técnica completa

### Para el ERP
1. El código vive en `/erp`
2. Stack: Next.js 14 + Tailwind CSS + Supabase
3. Ver instrucciones de desarrollo en `erp/README.md`

### Para decisiones nuevas
- Toda decisión se registra en `docs/CONTINUIDAD.md` con número secuencial
- Si requiere documento extenso, se crea en la carpeta temática correspondiente
- Nada se decide sin documentar

---

## Filosofía

- **Primero el modelo de negocio, después el código**
- **Cada peso tiene nombre** — no hay dinero sin categoría asignada
- **Crecer solo cuando sea sostenible** — nunca por optimismo
- **Documentar todo** — para nosotros y para quien nos asesore en el futuro
- **Tecnología al servicio del negocio** — el ERP codifica las políticas, no al revés

---

*Última actualización: Julio 2026*
