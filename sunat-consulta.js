import puppeteer from 'puppeteer';

export async function consultarSunat(ruc, tipo, serie, numero, fecha, total) {
    console.log('✅ Prueba sin Puppeteer');

    return {
        mensaje: "API funcionando correctamente",
        datos: { ruc, tipo, serie, numero, fecha, total }
    };
}

    try {
        const page = await browser.newPage();

        // ⏱️ TIMEOUT GLOBAL
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);

        console.log('🌐 Navegando a SUNAT...');
        await page.goto(
            'https://e-consulta.sunat.gob.pe/ol-ti-itconsvalicpe/ConsValiCpe.htm',
            { waitUntil: 'domcontentloaded' }
        );

        console.log('📝 Esperando formulario...');
        await page.waitForSelector('input[name="num_ruc"]');

        // 🔹 LLENAR DATOS
        await page.type('input[name="num_ruc"]', ruc);
        await page.select('select[name="tipocomprobante"]', tipo);
        await page.select('select[name="cod_docide"]', '-');
        await page.type('input[name="num_serie"]', serie.toUpperCase());
        await page.type('input[name="num_comprob"]', numero);

        // 📅 FECHA
        const fechaInput = await page.$('input[name="fec_emision"]');
        await fechaInput.click({ clickCount: 3 });
        await fechaInput.press('Backspace');
        await fechaInput.type(fecha);

        // 💰 TOTAL
        await page.type('input[name="cantidad"]', total);

        console.log('🔍 Buscando...');
        await Promise.all([
            page.click('input[value="Buscar"]'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);

        console.log('📊 Analizando resultado...');

        const resultado = await page.evaluate(() => {
            const texto = document.body.innerText;

            let valido = false;
            let mensaje = '';
            let estado = '';

            if (texto.includes('BAJA')) {
                valido = true;
                estado = 'BAJA';
                mensaje = 'Comprobante dado de baja';
            } 
            else if (texto.includes('informada a SUNAT') || texto.includes('VÁLIDO')) {
                valido = true;
                estado = 'ACTIVO';
                mensaje = 'Comprobante válido';
            } 
            else if (texto.includes('No existe') || texto.includes('NO EXISTE')) {
                valido = false;
                estado = 'NO_EXISTE';
                mensaje = 'Comprobante no existe';
            } 
            else {
                estado = 'DESCONOCIDO';
                mensaje = 'No se pudo determinar';
            }

            return { valido, mensaje, estado };
        });

        console.log('✅ RESULTADO:', resultado);

        return resultado;

    } catch (error) {
        console.error('❌ Error:', error.message);

        return {
            valido: false,
            estado: 'ERROR',
            mensaje: error.message
        };

    } finally {
        await browser.close();
        console.log('🧹 Navegador cerrado');
    }
}
