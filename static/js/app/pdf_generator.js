function generarPDFcontrato(contrato) {
  const hoy = new Date().toLocaleDateString("es-CL");
  const html = `
    <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px;">
        <h1 style="font-size: 18px; margin: 0; text-transform: uppercase;">Contrato de Trabajo</h1>
        <p style="font-size: 11px; margin: 5px 0 0; color: #555;">Art. 10 C\u00f3digo del Trabajo</p>
      </div>
      <p style="text-align: right; font-size: 11px; color: #666;">${hoy}</p>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">I. Datos del Empleador</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 5px; width: 140px; font-weight: bold;">Empresa:</td><td style="padding: 3px 5px;">${contrato.empresa || ''}</td></tr>
          ${contrato.mandante ? `<tr><td style="padding: 3px 5px; font-weight: bold;">Mandante:</td><td style="padding: 3px 5px;">${contrato.mandante}</td></tr>` : ''}
        </table>
      </div>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">II. Identificaci\u00f3n del Trabajador</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 5px; width: 140px; font-weight: bold;">Nombres:</td><td style="padding: 3px 5px;">${contrato.nombres || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Apellidos:</td><td style="padding: 3px 5px;">${contrato.apellidos || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">RUT:</td><td style="padding: 3px 5px;">${contrato.rut_trabajador || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Fecha Nac.:</td><td style="padding: 3px 5px;">${contrato.fecha_nacimiento || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Direcci\u00f3n:</td><td style="padding: 3px 5px;">${contrato.direccion || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Tel\u00e9fono:</td><td style="padding: 3px 5px;">${contrato.telefono || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Email:</td><td style="padding: 3px 5px;">${contrato.email || ''}</td></tr>
        </table>
      </div>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">III. Detalles del Contrato</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 5px; width: 140px; font-weight: bold;">Tipo Contrato:</td><td style="padding: 3px 5px;">${contrato.tipo || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Fecha Inicio:</td><td style="padding: 3px 5px;">${contrato.fecha_inicio || ''}</td></tr>
          ${contrato.fecha_termino ? `<tr><td style="padding: 3px 5px; font-weight: bold;">Fecha T\u00e9rmino:</td><td style="padding: 3px 5px;">${contrato.fecha_termino}</td></tr>` : ''}
          ${contrato.nombre_faena ? `<tr><td style="padding: 3px 5px; font-weight: bold;">Faena:</td><td style="padding: 3px 5px;">${contrato.nombre_faena}</td></tr>` : ''}
          <tr><td style="padding: 3px 5px; font-weight: bold;">Lugar Trabajo:</td><td style="padding: 3px 5px;">${contrato.lugar_trabajo || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Horas Semanales:</td><td style="padding: 3px 5px;">${contrato.horas_semanales || '45'}</td></tr>
        </table>
      </div>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">IV. Naturaleza de Servicios</h2>
        <p style="font-size: 12px; margin: 5px 0; line-height: 1.5;">${contrato.funciones || ''}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">V. Remuneraci\u00f3n</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 5px; width: 140px; font-weight: bold;">Sueldo Base:</td><td style="padding: 3px 5px;">$${Number(contrato.sueldo_base || 0).toLocaleString('es-CL')}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Colaci\u00f3n:</td><td style="padding: 3px 5px;">$${Number(contrato.colacion || 0).toLocaleString('es-CL')}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Movilizaci\u00f3n:</td><td style="padding: 3px 5px;">$${Number(contrato.movilizacion || 0).toLocaleString('es-CL')}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Periodicidad:</td><td style="padding: 3px 5px;">${contrato.periodicidad_pago || 'Mensual'}</td></tr>
        </table>
      </div>
      ${contrato.clausulas_adicionales ? `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">VI. Cl\u00e1usulas Adicionales</h2>
        <p style="font-size: 12px; margin: 5px 0; line-height: 1.5; white-space: pre-wrap;">${contrato.clausulas_adicionales}</p>
      </div>` : ''}
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Empleador</p>
            </td>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Trabajador</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
  _renderPDF(html, `contrato_${contrato.rut_trabajador || 'trabajador'}.pdf`);
}

function generarPDFanexo(anexo, contrato) {
  const hoy = new Date().toLocaleDateString("es-CL");
  const html = `
    <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px;">
        <h1 style="font-size: 18px; margin: 0; text-transform: uppercase;">Anexo de Contrato</h1>
        <p style="font-size: 11px; margin: 5px 0 0; color: #555;">Art. 11 C\u00f3digo del Trabajo</p>
      </div>
      <p style="text-align: right; font-size: 11px; color: #666;">${hoy}</p>
      <p style="font-size: 12px; line-height: 1.6;">Entre las partes se acuerda modificar el contrato de trabajo suscrito con fecha <strong>${contrato.fecha_inicio || ''}</strong> entre el empleador <strong>${contrato.empresa || ''}</strong> y el trabajador <strong>${contrato.nombres || ''} ${contrato.apellidos || ''}</strong> (RUT ${contrato.rut_trabajador || ''}), en los siguientes t\u00e9rminos:</p>
      <div style="margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
        <h3 style="font-size: 13px; margin: 0 0 10px;">Cl\u00e1usula Modificada: ${anexo.clausula || ''}</h3>
        <p style="font-size: 12px; line-height: 1.5; margin: 0;">${anexo.nuevo_texto || ''}</p>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Empleador</p>
            </td>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Trabajador</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
  _renderPDF(html, `anexo_${contrato.rut_trabajador || 'trabajador'}.pdf`);
}

function generarPDFpacto(pacto, contrato) {
  const hoy = new Date().toLocaleDateString("es-CL");
  const html = `
    <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px;">
        <h1 style="font-size: 16px; margin: 0; text-transform: uppercase;">Pacto de Horas Extraordinarias</h1>
        <p style="font-size: 11px; margin: 5px 0 0; color: #555;">Art. 32 C\u00f3digo del Trabajo</p>
      </div>
      <p style="text-align: right; font-size: 11px; color: #666;">${hoy}</p>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Datos</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 5px; width: 140px; font-weight: bold;">Trabajador:</td><td style="padding: 3px 5px;">${contrato.nombres || ''} ${contrato.apellidos || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">RUT:</td><td style="padding: 3px 5px;">${contrato.rut_trabajador || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Empresa:</td><td style="padding: 3px 5px;">${contrato.empresa || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Vigencia:</td><td style="padding: 3px 5px;">${pacto.fecha_inicio || ''} \u2192 ${pacto.fecha_fin || ''}</td></tr>
          ${pacto.numero_renovacion ? `<tr><td style="padding: 3px 5px; font-weight: bold;">Renovaci\u00f3n N\u00b0:</td><td style="padding: 3px 5px;">${pacto.numero_renovacion}</td></tr>` : ''}
        </table>
      </div>
      <p style="font-size: 12px; line-height: 1.6; margin-top: 20px;">Las partes acuerdan que el trabajador podr\u00e1 prestar servicios en jornada extraordinaria durante el per\u00edodo indicado, de conformidad con lo dispuesto en el art\u00edculo 32 del C\u00f3digo del Trabajo. El empleador se obliga a pagar las horas extraordinarias con los recargos legales correspondientes.</p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Empleador</p>
            </td>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Trabajador</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
  _renderPDF(html, `pacto_he_${contrato.rut_trabajador || 'trabajador'}.pdf`);
}

function generarPDFliquidacion(liq) {
  const hoy = new Date().toLocaleDateString("es-CL");
  const html = `
    <div style="font-family: 'Courier New', monospace; max-width: 800px; margin: 0 auto; padding: 30px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h1 style="font-size: 16px; margin: 0; text-transform: uppercase;">Liquidaci\u00f3n de Remuneraciones</h1>
        <p style="font-size: 11px; margin: 3px 0; color: #555;">Per\u00edodo: ${liq.periodo}</p>
      </div>
      <p style="text-align: right; font-size: 10px; color: #666;">Emitido: ${hoy}</p>
      <div style="margin-bottom: 15px;">
        <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
          <tr><td style="padding: 2px 4px; width: 130px; font-weight: bold;">Trabajador:</td><td style="padding: 2px 4px;">${liq.trabajador || ''}</td></tr>
          <tr><td style="padding: 2px 4px; font-weight: bold;">Empresa:</td><td style="padding: 2px 4px;">${liq.empresa || ''}</td></tr>
        </table>
      </div>
      <table style="width: 100%; font-size: 11px; border-collapse: collapse; border: 1px solid #333;">
        <tr style="background: #e0e0e0;"><th style="padding: 5px 8px; text-align: left; border-bottom: 1px solid #333;">Concepto</th><th style="padding: 5px 8px; text-align: right; border-bottom: 1px solid #333;">Monto</th></tr>
        <tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Sueldo Base</td><td style="padding: 4px 8px; text-align: right;">$${Number(liq.sueldo_base).toLocaleString('es-CL')}</td></tr>
        <tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Horas Extra (${liq.horas_extra_cantidad}h)</td><td style="padding: 4px 8px; text-align: right;">$${Number(liq.horas_extra_valor).toLocaleString('es-CL')}</td></tr>
        <tr style="font-weight: bold;"><td style="padding: 4px 8px; border-bottom: 1px solid #333;">Total Imponible</td><td style="padding: 4px 8px; text-align: right; border-bottom: 1px solid #333;">$${Number(liq.total_imponible).toLocaleString('es-CL')}</td></tr>
        <tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Desc. AFP (10%)</td><td style="padding: 4px 8px; text-align: right; color: #c00;">-$${Number(liq.descuento_afp).toLocaleString('es-CL')}</td></tr>
        <tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Desc. Salud (7%)</td><td style="padding: 4px 8px; text-align: right; color: #c00;">-$${Number(liq.descuento_salud).toLocaleString('es-CL')}</td></tr>
        ${liq.descuento_seg_ces > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Desc. Seg. Cesant\u00eda</td><td style="padding: 4px 8px; text-align: right; color: #c00;">-$${Number(liq.descuento_seg_ces).toLocaleString('es-CL')}</td></tr>` : ''}
        ${liq.descuento_iu > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Impuesto \u00danico</td><td style="padding: 4px 8px; text-align: right; color: #c00;">-$${Number(liq.descuento_iu).toLocaleString('es-CL')}</td></tr>` : ''}
        <tr style="font-weight: bold;"><td style="padding: 4px 8px; border-bottom: 1px solid #333;">Total Descuentos</td><td style="padding: 4px 8px; text-align: right; border-bottom: 1px solid #333; color: #c00;">-$${Number(liq.total_descuentos).toLocaleString('es-CL')}</td></tr>
        <tr style="font-weight: bold; background: #e8f5e9;"><td style="padding: 6px 8px; font-size: 13px;">L\u00edquido a Pagar</td><td style="padding: 6px 8px; text-align: right; font-size: 13px;">$${Number(liq.liquido).toLocaleString('es-CL')}</td></tr>
        <tr style="color: #555;"><td style="padding: 4px 8px; border-top: 1px solid #ccc;">Costo Empleador</td><td style="padding: 4px 8px; text-align: right; border-top: 1px solid #ccc;">$${Number(liq.costo_empleador).toLocaleString('es-CL')}</td></tr>
      </table>
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc;">
        <table style="width: 100%; font-size: 11px;">
          <tr>
            <td style="text-align: center; padding-top: 35px;">
              <div style="border-top: 1px solid #333; width: 180px; margin: 0 auto;"></div>
              <p style="margin: 3px 0 0; font-size: 10px;">Firma Empleador</p>
            </td>
            <td style="text-align: center; padding-top: 35px;">
              <div style="border-top: 1px solid #333; width: 180px; margin: 0 auto;"></div>
              <p style="margin: 3px 0 0; font-size: 10px;">Firma Trabajador</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
  _renderPDF(html, `liquidacion_${(liq.trabajador || 'trabajador').replace(/\s+/g, '_')}_${liq.periodo}.pdf`);
}

function generarPDFfiniquito(fin) {
  const hoy = new Date().toLocaleDateString("es-CL");
  const html = `
    <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a1a; padding-bottom: 15px;">
        <h1 style="font-size: 18px; margin: 0; text-transform: uppercase;">Finiquito</h1>
        <p style="font-size: 11px; margin: 5px 0 0; color: #555;">${fin.causal_display || ''}</p>
      </div>
      <p style="text-align: right; font-size: 11px; color: #666;">Emitido: ${hoy}</p>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Datos del Trabajador</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="padding: 3px 5px; width: 140px; font-weight: bold;">Trabajador:</td><td style="padding: 3px 5px;">${fin.trabajador || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Empresa:</td><td style="padding: 3px 5px;">${fin.empresa || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Fecha T\u00e9rmino:</td><td style="padding: 3px 5px;">${fin.fecha_termino || ''}</td></tr>
          <tr><td style="padding: 3px 5px; font-weight: bold;">Causal:</td><td style="padding: 3px 5px;">${fin.causal_display || ''}</td></tr>
        </table>
      </div>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse; border: 1px solid #333;">
        <tr style="background: #e0e0e0;"><th style="padding: 5px 8px; text-align: left; border-bottom: 1px solid #333;">Concepto</th><th style="padding: 5px 8px; text-align: right; border-bottom: 1px solid #333;">Monto</th></tr>
        <tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Sueldo Base</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.sueldo_base).toLocaleString('es-CL')}</td></tr>
        ${fin.sueldos_pendientes > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Sueldos Pendientes (${fin.dias_trabajados || 0} d\u00edas)</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.sueldos_pendientes).toLocaleString('es-CL')}</td></tr>` : ''}
        ${fin.indemn_aviso_previo > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Indemn. Aviso Previo</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.indemn_aviso_previo).toLocaleString('es-CL')}</td></tr>` : ''}
        ${fin.indemn_anios_servicio > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Indemn. A\u00f1os Servicio (${fin.anios_servicio} a\u00f1os)</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.indemn_anios_servicio).toLocaleString('es-CL')}</td></tr>` : ''}
        ${fin.feriado_proporcional > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Feriado Proporcional</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.feriado_proporcional).toLocaleString('es-CL')}</td></tr>` : ''}
        ${fin.horas_extra_pendientes > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Horas Extra Pendientes</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.horas_extra_pendientes).toLocaleString('es-CL')}</td></tr>` : ''}
        ${fin.otros_bonos > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Otros Bonos/Pagos</td><td style="padding: 4px 8px; text-align: right;">$${Number(fin.otros_bonos).toLocaleString('es-CL')}</td></tr>` : ''}
        <tr style="font-weight: bold;"><td style="padding: 4px 8px; border-bottom: 1px solid #333;">Total Haberes</td><td style="padding: 4px 8px; text-align: right; border-bottom: 1px solid #333;">$${Number(fin.total_haberes).toLocaleString('es-CL')}</td></tr>
        ${fin.descuentos > 0 ? `<tr><td style="padding: 4px 8px; border-bottom: 1px solid #ccc;">Descuentos</td><td style="padding: 4px 8px; text-align: right; color: #c00;">-$${Number(fin.descuentos).toLocaleString('es-CL')}</td></tr>` : ''}
        <tr style="font-weight: bold; background: #fff3cd;"><td style="padding: 6px 8px; font-size: 13px;">L\u00edquido a Pagar</td><td style="padding: 6px 8px; text-align: right; font-size: 13px;">$${Number(fin.liquido).toLocaleString('es-CL')}</td></tr>
      </table>
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc;">
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Empleador</p>
            </td>
            <td style="text-align: center; padding-top: 40px;">
              <div style="border-top: 1px solid #333; width: 200px; margin: 0 auto;"></div>
              <p style="margin: 5px 0 0; font-size: 11px;">Firma Trabajador</p>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
  _renderPDF(html, `finiquito_${(fin.trabajador || 'trabajador').replace(/\s+/g, '_')}.pdf`);
}

function _renderPDF(html, filename) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(wrapper).save().then(() => {
    document.body.removeChild(wrapper);
  }).catch(() => {
    document.body.removeChild(wrapper);
  });
}
