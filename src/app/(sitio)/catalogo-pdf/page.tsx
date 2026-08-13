'use client'



/**
 * CATALOGO COMERCIAL - 10 PAGINAS
 *
 * Para generar el PDF: abre esta pagina en el navegador y dale
 * Ctrl+P (o Cmd+P en Mac) → Destino: Guardar como PDF
 * → Margenes: Ninguno → Graficos de fondo: SI
 *
 * IMPORTANTE: Activa "Graficos de fondo" en las opciones de impresion,
 * si no los fondos azules no salen.
 */
export default function CatalogoPDF() {
  return (
    <div className="catalogo-comercial">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

        .catalogo-comercial {
          font-family: 'Montserrat', sans-serif;
          color: #0D1B2A;
          background: white;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .pagina {
          width: 297mm;
          height: 210mm;
          position: relative;
          overflow: hidden;
          page-break-after: always;
          margin: 0 auto 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .pagina:last-child {
          page-break-after: avoid;
        }

        @media print {
          .catalogo-comercial { background: white; }
          .pagina {
            box-shadow: none;
            margin: 0;
            width: 100%;
            height: 100vh;
          }
          .no-print { display: none !important; }
        }

        .bg-azul { background-color: #0D1B2A; }
        .bg-verde { background-color: #16B23C; }
        .bg-oro { background-color: #F2B705; }
        .bg-gris { background-color: #F5F5F5; }
        .text-verde { color: #16B23C; }
        .text-azul { color: #0D1B2A; }
        .text-oro { color: #F2B705; }

        .num-pagina {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: #16B23C;
          color: white;
          font-size: 11px;
          font-weight: 800;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          z-index: 10;
        }

        .check-verde {
          color: #16B23C;
          font-weight: 700;
          margin-right: 6px;
        }

        .linea-oro {
          width: 50px;
          height: 4px;
          background: #F2B705;
          border-radius: 2px;
          margin: 12px 0;
        }

        .diagonal-clip {
          clip-path: polygon(0 0, 55% 0, 45% 100%, 0 100%);
        }

        .diagonal-clip-inv {
          clip-path: polygon(45% 0, 100% 0, 100% 100%, 55% 100%);
        }

        .whatsapp-box {
          background: #16B23C;
          color: white;
          border-radius: 12px;
          padding: 16px 24px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 800;
        }

        .whatsapp-sm {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #0D1B2A;
        }

        .whatsapp-sm svg {
          width: 28px;
          height: 28px;
          color: #25D366;
        }

        .cat-num {
          font-size: 48px;
          font-weight: 900;
          color: #16B23C;
          line-height: 1;
        }

        .cat-titulo {
          font-size: 32px;
          font-weight: 900;
          color: #0D1B2A;
          line-height: 1.1;
          text-transform: uppercase;
        }

        .cat-frase {
          font-size: 15px;
          color: #444;
          margin-top: 8px;
          line-height: 1.5;
        }

        .cat-lista {
          list-style: none;
          padding: 0;
          margin: 16px 0 0;
          font-size: 14px;
          font-weight: 600;
        }

        .cat-lista li {
          margin-bottom: 6px;
          display: flex;
          align-items: center;
        }

        .foto-placeholder {
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          padding: 8px;
        }

        .tarjeta-portafolio {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e8e8e8;
        }

        .franja-verde {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 60px;
          background: linear-gradient(180deg, #16B23C 0%, #0e8a2d 100%);
          clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%);
        }

        .iconos-lineas {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 16px 40px;
          gap: 12px;
        }

        .icono-linea {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: white;
          letter-spacing: 0.5px;
        }

        .icono-linea svg {
          width: 32px;
          height: 32px;
          opacity: 0.9;
        }
      `}</style>

      {/* Boton imprimir (no sale en el PDF) */}
      <div className="no-print" style={{ textAlign: 'center', padding: '20px', background: '#f0f0f0' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          Para generar el PDF: <b>Ctrl+P</b> → Destino: Guardar como PDF → Márgenes: Ninguno → <b>Gráficos de fondo: SÍ</b>
        </p>
        <button
          onClick={() => { if (typeof window !== 'undefined') window.print() }}
          style={{ background: '#16B23C', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
        >
          Imprimir / Generar PDF
        </button>
      </div>

      {/* ============ PAGINA 1 — PORTADA ============ */}
      <div className="pagina" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          {/* Fondo azul con diagonal */}
          <div className="bg-azul" style={{ width: '50%', padding: '40px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center', clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)' }}>
            {/* Logo */}
            <div style={{ marginBottom: '30px' }}>
              <img src="/logo.png" alt="Abastecer Empresarial S.A.S." style={{ height: '60px', objectFit: 'contain' }} />
            </div>
            {/* Slogan */}
            <h1 style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.05, color: 'white', margin: 0 }}>
              TODO LO QUE<br />
              <span className="text-verde">TU EMPRESA</span><br />
              NECESITA.
            </h1>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#F2B705', marginTop: '8px' }}>
              UN SOLO ALIADO.
            </p>
          </div>

          {/* Foto oficina */}
          <div className="foto-placeholder" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%', clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 5% 100%)' }}>
            Foto: Oficina moderna con escritorios, computadores y sillas ejecutivas (la misma del PDF original)
          </div>

          {/* Franja verde decorativa */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '80px', height: '100%', background: 'linear-gradient(180deg, rgba(22,178,60,0.8) 0%, rgba(22,178,60,0.4) 100%)', clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0 100%)' }} />
        </div>

        {/* Barra inferior con iconos de lineas */}
        <div style={{ background: 'linear-gradient(90deg, #0D1B2A 0%, #162d45 100%)', padding: '16px 0' }}>
          <div style={{ borderTop: '3px solid #F2B705', margin: '0 40px 12px', opacity: 0.6 }} />
          <div className="iconos-lineas">
            {['DOTACIÓN', 'EPP', 'TECNOLOGÍA', 'PAPELERÍA', 'ASEO', 'CAFETERÍA', 'MOBILIARIO', 'SUMINISTROS'].map((linea) => (
              <div key={linea} className="icono-linea">
                <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.5)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  ⬡
                </div>
                <span>{linea}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ PAGINA 2 — QUIENES SOMOS ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">1</div>
        {/* Texto */}
        <div style={{ width: '45%', padding: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1.05, margin: 0 }}>
            ¿QUIÉNES<br />
            <span className="text-verde">SOMOS?</span>
          </h2>
          <div className="linea-oro" />
          <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '16px', color: '#333' }}>
            En <b>Abastecer Empresarial</b> ayudamos a empresas de todos los sectores a encontrar y adquirir los productos que necesitan para su operación, seguridad y bienestar.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '12px', color: '#555' }}>
            Trabajamos con diferentes proveedores y referencias para ofrecer soluciones de abastecimiento eficientes, confiables y a la medida.
          </p>
          <div style={{ marginTop: '24px', background: '#0D1B2A', borderRadius: '12px', padding: '16px 20px', color: 'white' }}>
            <p style={{ fontSize: '12px', color: '#16B23C', fontWeight: 700, marginBottom: '4px' }}>
              Nuestro compromiso es ser
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>
              tu aliado estratégico para que te enfoques en lo más importante: <b style={{ color: '#F2B705' }}>HACER CRECER TU EMPRESA.</b>
            </p>
          </div>
        </div>

        {/* Foto apretón de manos */}
        <div className="foto-placeholder" style={{ width: '55%', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
          Foto: Apretón de manos empresarial en oficina moderna (igual al PDF)
        </div>

        {/* Decoracion verde esquina */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '20px', height: '100%', background: '#16B23C', clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 50%)' }} />
      </div>

      {/* ============ PAGINA 3 — PORTAFOLIO ============ */}
      <div className="pagina" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="num-pagina">2</div>

        {/* Header azul */}
        <div className="bg-azul" style={{ padding: '20px 50px', position: 'relative' }}>
          <p style={{ color: 'white', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#F2B705' }}>📍</span> CALI, VALLE DEL CAUCA
          </p>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', background: '#16B23C', clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 5% 100%)' }}>
            <div className="foto-placeholder" style={{ width: '100%', height: '100%', fontSize: '9px' }}>Foto productos variados</div>
          </div>
          <div style={{ borderBottom: '3px solid #F2B705', marginTop: '12px', width: '60%' }} />
        </div>

        {/* Titulo */}
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 900, margin: 0 }}>
            NUESTRO <span className="text-verde">PORTAFOLIO</span>
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            Soluciones integrales para las diferentes necesidades de tu empresa.
          </p>
          <div className="linea-oro" style={{ margin: '8px auto' }} />
        </div>

        {/* Grid de 8 tarjetas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '0 40px 30px', flex: 1, alignContent: 'start' }}>
          {[
            { num: '01', nombre: 'SEGURIDAD\nY SST' },
            { num: '02', nombre: 'DOTACIÓN\nEMPRESARIAL' },
            { num: '03', nombre: 'TECNOLOGÍA' },
            { num: '04', nombre: 'PAPELERÍA\nY OFICINA' },
            { num: '05', nombre: 'ASEO E\nHIGIENE' },
            { num: '06', nombre: 'CAFETERÍA' },
            { num: '07', nombre: 'MOBILIARIO\nEMPRESARIAL' },
            { num: '08', nombre: 'FERRETERÍA\nY SUMINISTROS\nGENERALES' },
          ].map((cat) => (
            <div key={cat.num} className="tarjeta-portafolio">
              <div className="foto-placeholder" style={{ height: '80px', fontSize: '9px' }}>
                Foto: {cat.nombre.replace('\n', ' ')}
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#16B23C', color: 'white', fontWeight: 800, fontSize: '11px', padding: '3px 7px', borderRadius: '4px' }}>{cat.num}</span>
                <span style={{ fontSize: '10px', fontWeight: 800, lineHeight: 1.2, whiteSpace: 'pre-line' }}>{cat.nombre}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ PAGINA 4 — SEGURIDAD Y SST ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">3</div>
        {/* Lado izquierdo azul */}
        <div className="bg-azul" style={{ width: '40%', padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)' }}>
          <div className="cat-num" style={{ color: '#16B23C' }}>01</div>
          <div className="cat-titulo" style={{ color: 'white', marginTop: '8px' }}>SEGURIDAD<br />Y SST</div>
          <div className="linea-oro" />
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>Protegemos a tu equipo y a tu empresa.</p>
          <ul className="cat-lista" style={{ color: 'white' }}>
            <li><span className="check-verde">✓</span> Protección personal (EPP)</li>
            <li><span className="check-verde">✓</span> Emergencias y primeros auxilios</li>
            <li><span className="check-verde">✓</span> Señalización y demarcación</li>
            <li><span className="check-verde">✓</span> Protección contra incendios</li>
            <li><span className="check-verde">✓</span> Elementos para brigadas</li>
          </ul>
          <div style={{ marginTop: '20px' }} className="whatsapp-sm">
            <span style={{ color: '#25D366', fontSize: '24px' }}>📱</span>
            <span style={{ color: 'white' }}>Cotiza por WhatsApp<br /><b>350 862 4021</b></span>
          </div>
        </div>
        {/* Foto EPP */}
        <div className="foto-placeholder" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '65%', clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0 100%)' }}>
          Foto: Casco blanco, gafas, protectores auditivos amarillos, guantes negros, extintor, señalización de evacuación (igual al PDF)
        </div>
        <div className="franja-verde" />
      </div>

      {/* ============ PAGINA 5 — DOTACION EMPRESARIAL ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">4</div>
        <div style={{ width: '40%', padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="cat-num">02</div>
          <div className="cat-titulo">DOTACIÓN<br />EMPRESARIAL</div>
          <div className="linea-oro" />
          <p className="cat-frase">Vestimos a tu equipo con calidad, comodidad y seguridad.</p>
          <ul className="cat-lista">
            <li><span className="check-verde">✓</span> Ropa de trabajo</li>
            <li><span className="check-verde">✓</span> Uniformes empresariales</li>
            <li><span className="check-verde">✓</span> Calzado de seguridad</li>
            <li><span className="check-verde">✓</span> Bordado y estampado</li>
            <li><span className="check-verde">✓</span> Personalización</li>
          </ul>
          <div style={{ marginTop: '20px' }} className="whatsapp-sm">
            <span style={{ color: '#25D366', fontSize: '24px' }}>📱</span>
            <span>Cotiza por WhatsApp<br /><b>350 862 4021</b></span>
          </div>
        </div>
        <div className="foto-placeholder" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
          Foto: Hombre con casco y camisa azul industrial + Mujer con camisa gris corporativa, ambos con brazos cruzados, fondo de bodega (igual al PDF)
        </div>
        <div className="franja-verde" />
      </div>

      {/* ============ PAGINA 6 — TECNOLOGIA ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">5</div>
        <div style={{ width: '40%', padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="cat-num">03</div>
          <div className="cat-titulo">TECNOLOGÍA</div>
          <div className="linea-oro" />
          <p className="cat-frase">Equipos y accesorios que impulsan la productividad de tu empresa.</p>
          <ul className="cat-lista">
            <li><span className="check-verde">✓</span> Computadores y portátiles</li>
            <li><span className="check-verde">✓</span> Periféricos</li>
            <li><span className="check-verde">✓</span> Impresión</li>
            <li><span className="check-verde">✓</span> Accesorios y conectividad</li>
            <li><span className="check-verde">✓</span> Consumibles de impresión</li>
          </ul>
          <div style={{ marginTop: '20px' }} className="whatsapp-sm">
            <span style={{ color: '#25D366', fontSize: '24px' }}>📱</span>
            <span>Cotiza por WhatsApp<br /><b>350 862 4021</b></span>
          </div>
        </div>
        <div className="foto-placeholder" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
          Foto: Monitores, portátil, teclado, mouse, audífonos, impresora — setup de oficina tecnológica (igual al PDF con pantalla Windows 11)
        </div>
        <div className="franja-verde" />
      </div>

      {/* ============ PAGINA 7 — PAPELERIA Y OFICINA ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">6</div>
        <div style={{ width: '40%', padding: '50px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="cat-num">04</div>
          <div className="cat-titulo">PAPELERÍA<br />Y OFICINA</div>
          <div className="linea-oro" />
          <p className="cat-frase">Todo lo necesario para mantener tu operación administrativa organizada y eficiente.</p>
          <ul className="cat-lista">
            <li><span className="check-verde">✓</span> Papelería en general</li>
            <li><span className="check-verde">✓</span> Archivo y organización</li>
            <li><span className="check-verde">✓</span> Escritura y corrección</li>
            <li><span className="check-verde">✓</span> Suministros administrativos</li>
            <li><span className="check-verde">✓</span> Elementos de oficina</li>
          </ul>
          <div style={{ marginTop: '20px' }} className="whatsapp-sm">
            <span style={{ color: '#25D366', fontSize: '24px' }}>📱</span>
            <span>Cotiza por WhatsApp<br /><b>350 862 4021</b></span>
          </div>
        </div>
        <div className="foto-placeholder" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
          Foto: Archivadores azules, cuadernos, notas adhesivas, grapadora, lapiceros, organizador — escritorio de oficina (igual al PDF)
        </div>
        <div className="franja-verde" />
      </div>

      {/* ============ PAGINA 8 — ASEO + CAFETERIA ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">7</div>
        {/* Mitad izquierda: Aseo */}
        <div style={{ width: '50%', padding: '40px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div className="cat-num" style={{ fontSize: '36px' }}>05</div>
              <div className="cat-titulo" style={{ fontSize: '24px' }}>ASEO E<br />HIGIENE</div>
              <div className="linea-oro" />
              <p style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>Productos y soluciones para espacios limpios, seguros y saludables.</p>
              <ul className="cat-lista" style={{ fontSize: '12px' }}>
                <li><span className="check-verde">✓</span> Limpieza institucional</li>
                <li><span className="check-verde">✓</span> Desinfección</li>
                <li><span className="check-verde">✓</span> Higiene personal</li>
                <li><span className="check-verde">✓</span> Consumibles</li>
              </ul>
            </div>
            <div className="foto-placeholder" style={{ width: '45%', borderRadius: '8px' }}>
              Foto: Productos de limpieza, atomizadores, detergentes, papel higiénico
            </div>
          </div>
        </div>

        {/* Mitad derecha: Cafetería */}
        <div style={{ width: '50%', padding: '40px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee' }}>
          <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div className="cat-num" style={{ fontSize: '36px' }}>06</div>
              <div className="cat-titulo" style={{ fontSize: '24px' }}>CAFETERÍA</div>
              <div className="linea-oro" />
              <p style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>Insumos para disfrutar cada momento.</p>
              <ul className="cat-lista" style={{ fontSize: '12px' }}>
                <li><span className="check-verde">✓</span> Café y bebidas</li>
                <li><span className="check-verde">✓</span> Azúcar y endulzantes</li>
                <li><span className="check-verde">✓</span> Desechables</li>
                <li><span className="check-verde">✓</span> Servilletas y complementos</li>
                <li><span className="check-verde">✓</span> Suministros</li>
              </ul>
            </div>
            <div className="foto-placeholder" style={{ width: '45%', borderRadius: '8px' }}>
              Foto: Taza de café, granos de café, vasos desechables
            </div>
          </div>
        </div>
      </div>

      {/* ============ PAGINA 9 — MOBILIARIO + FERRETERIA ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">8</div>
        {/* Mobiliario */}
        <div style={{ width: '50%', padding: '40px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div className="cat-num" style={{ fontSize: '36px' }}>07</div>
              <div className="cat-titulo" style={{ fontSize: '22px' }}>MOBILIARIO<br />EMPRESARIAL</div>
              <div className="linea-oro" />
              <p style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>Espacios de trabajo funcionales, cómodos y modernos.</p>
              <ul className="cat-lista" style={{ fontSize: '12px' }}>
                <li><span className="check-verde">✓</span> Sillas operativas y gerenciales</li>
                <li><span className="check-verde">✓</span> Escritorios y mesas</li>
                <li><span className="check-verde">✓</span> Archivadores y almacenamiento</li>
                <li><span className="check-verde">✓</span> Mobiliario para oficina</li>
                <li><span className="check-verde">✓</span> Mobiliario escolar</li>
              </ul>
            </div>
            <div className="foto-placeholder" style={{ width: '45%', borderRadius: '8px' }}>
              Foto: Silla ejecutiva negra + escritorio moderno con monitor
            </div>
          </div>
        </div>

        {/* Ferretería */}
        <div style={{ width: '50%', padding: '40px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee' }}>
          <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div className="cat-num" style={{ fontSize: '36px' }}>08</div>
              <div className="cat-titulo" style={{ fontSize: '20px' }}>FERRETERÍA Y<br />SUMINISTROS<br />GENERALES</div>
              <div className="linea-oro" />
              <p style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>Soluciones para mantenimiento, operación y proyectos.</p>
              <ul className="cat-lista" style={{ fontSize: '12px' }}>
                <li><span className="check-verde">✓</span> Herramientas</li>
                <li><span className="check-verde">✓</span> Ferretería</li>
                <li><span className="check-verde">✓</span> Eléctricos e iluminación</li>
                <li><span className="check-verde">✓</span> Mantenimiento</li>
                <li><span className="check-verde">✓</span> Y mucho más</li>
              </ul>
            </div>
            <div className="foto-placeholder" style={{ width: '45%', borderRadius: '8px' }}>
              Foto: Taladro amarillo DeWalt, herramientas, caja de herramientas
            </div>
          </div>
        </div>
      </div>

      {/* ============ PAGINA 10 — CIERRE / CONTACTO ============ */}
      <div className="pagina" style={{ display: 'flex', position: 'relative' }}>
        <div className="num-pagina">9</div>
        {/* Fondo azul principal */}
        <div className="bg-azul" style={{ width: '55%', padding: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 900, color: 'white', lineHeight: 1.05, margin: 0 }}>
            ¿NECESITAS<br />
            <span className="text-verde">ALGO MÁS?</span>
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginTop: '16px', lineHeight: 1.6 }}>
            Este catálogo presenta nuestras principales líneas de abastecimiento.
          </p>
          <p style={{ fontSize: '15px', color: '#16B23C', marginTop: '8px', lineHeight: 1.6, fontStyle: 'italic' }}>
            Si necesitas un producto que no aparece aquí, escríbenos. Lo conseguimos por ti.
          </p>

          <div style={{ borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: '24px', paddingTop: '20px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { titulo: 'ASESORÍA PERSONALIZADA', desc: 'Te ayudamos a encontrar lo que necesitas.' },
                { titulo: 'AMPLIO PORTAFOLIO', desc: 'Trabajamos con múltiples proveedores y referencias.' },
                { titulo: 'ENTREGAS CONFIABLES', desc: 'Cumplimos tiempos y condiciones acordadas.' },
              ].map((b) => (
                <div key={b.titulo} style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>{b.titulo}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contacto */}
          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>✉ abastecerempresarial@gmail.com</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>📍 Cali, Valle del Cauca</span>
          </div>
        </div>

        {/* Lado derecho: foto + whatsapp */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <div className="foto-placeholder" style={{ width: '100%', height: '55%', borderRadius: '16px' }}>
            Foto: Hombre joven con polo azul oscuro y logo de Abastecer, usando celular, sonriendo (igual al PDF)
          </div>
          <div className="whatsapp-box" style={{ marginTop: '24px' }}>
            <span style={{ fontSize: '28px' }}>📱</span>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>COTIZA POR WHATSAPP</span>
              <span style={{ fontSize: '22px' }}>350 862 4021</span>
            </div>
          </div>
        </div>

        <div className="num-pagina" style={{ left: 'auto', right: 16 }}>10</div>
      </div>
    </div>
  )
}
