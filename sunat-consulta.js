import puppeteer from 'puppeteer';

export async function consultarSunat(ruc, tipo, serie, numero, fecha, total) {

    console.log('🚀 Iniciando Puppeteer...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 60000
    });

    try {
        const page = await browser.newPage();

        // ⏱️ TIMEOUTS GLOBALES
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);

        console.log('🌐 Navegando a SUNAT...');
        await page.goto(
            'https://e-consulta.sunat.gob.pe/ol-ti-itconsvalicpe/ConsValiCpe.htm',
            { waitUntil: 'domcontentloaded' }
        );

        console.log('📝 Esperando formulario...');
        await page.waitForSelector('input[name="num_ruc"]');

        // 🔹 DATOS
        await page.type('input[name="num_ruc"]', ruc);
        await page.select('select[name="tipocomprobante"]', tipo);
        await page.select('select[name="cod_docide"]', '-');
        await page.type('input[name="num_serie"]', serie.toUpperCase());
        await page.type('input[name="num_comprob"]', numero);

        // 📅 FECHA (TU LÓGICA MANTENIDA)
        const fechaInput = await page.$('input[name="fec_emision"]');
        await fechaInput.click({ clickCount: 3 });
        await fechaInput.press('Backspace');

        for (const char of fecha) {
            await fechaInput.type(char, { delay: 30 });
        }

        await page.evaluate((fecha) => {
            const input = document.querySelector('input[name="fec_emision"]');
            input.value = fecha;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }, fecha);

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
            const html = document.documentElement.innerHTML;

            let valido = false;
            let mensaje = '';
            let estado = '';

            // ✅ BAJA
            if (texto.includes('comunicada de BAJA')) {
                valido = true;
                estado = 'BAJA';

                const lineas = texto.split('\n');
                mensaje = lineas.find(l => l.includes('BAJA')) || 'Comprobante dado de baja';
            }

            // ✅ ACTIVO
            else if (texto.includes('ha sido informada a SUNAT') ||
                     texto.includes('COMPROBANTE VÁLIDO') ||
                     texto.includes('El comprobante es válido')) {

                valido = true;
                estado = 'ACTIVO';

                const lineas = texto.split('\n');
                mensaje = lineas.find(l => l.includes('informada')) || 'Comprobante válido';
            }

            // ❌ NO EXISTE
            else if (texto.includes('No existe') ||
                     texto.includes('no válido') ||
                     texto.includes('NO EXISTE')) {

                valido = false;
                estado = 'NO_EXISTE';
                mensaje = 'El comprobante NO existe';
            }

            // ⚠️ OTROS
            else {
                if (html.includes('BAJA')) {
                    valido = true;
                    estado = 'BAJA';
                    mensaje = 'Comprobante en BAJA';
                } else {
                    estado = 'DESCONOCIDO';
                    mensaje = 'No se pudo determinar';
                }
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
