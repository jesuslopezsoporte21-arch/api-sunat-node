import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function consultarSunat(ruc, tipo, serie, numero, fecha, total) {

    if (!ruc || !tipo || !serie || !numero || !fecha || !total) {
        return {
            valido: false,
            estado: 'ERROR',
            mensaje: 'Faltan datos obligatorios'
        };
    }

    const fechaStr = String(fecha);
    const totalStr = String(total);

    console.log('🚀 SUNAT FAST MODE');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--no-first-run',
            '--disable-extensions'
        ]
    });

    try {
        const page = await browser.newPage();

        // ⚡ BLOQUEAR RECURSOS PESADOS (CLAVE)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const tipo = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(tipo)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-PE,es;q=0.9'
        });

        await page.setDefaultNavigationTimeout(30000);
        await page.setDefaultTimeout(30000);

        console.log('🌐 SUNAT...');
        await page.goto(
            'https://e-consulta.sunat.gob.pe/ol-ti-itconsvalicpe/ConsValiCpe.htm',
            { waitUntil: 'domcontentloaded' }
        );

        await page.waitForSelector('input[name="num_ruc"]');

        // ⚡ SIN DELAYS (MUY IMPORTANTE)
        await page.type('input[name="num_ruc"]', ruc);
        await page.select('select[name="tipocomprobante"]', tipo);
        await page.select('select[name="cod_docide"]', '-');
        await page.type('input[name="num_serie"]', serie.toUpperCase());
        await page.type('input[name="num_comprob"]', numero);

        // 📅 FECHA RÁPIDA
        await page.evaluate((fecha) => {
            const input = document.querySelector('input[name="fec_emision"]');
            input.value = fecha;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }, fechaStr);

        // 💰 TOTAL
        await page.type('input[name="cantidad"]', totalStr);

        console.log('🔍 Consultando...');

        await Promise.all([
            page.click('input[value="Buscar"]'),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);

        console.log('📊 Analizando...');

        const resultado = await page.evaluate(() => {
            const texto = document.body.innerText;
            const html = document.documentElement.innerHTML;

            let valido = false;
            let mensaje = '';
            let estado = '';

            if (texto.includes('BAJA')) {
                valido = true;
                estado = 'BAJA';
                mensaje = 'Comprobante en BAJA';
            }
            else if (
                texto.includes('informada a SUNAT') ||
                texto.includes('COMPROBANTE VÁLIDO') ||
                texto.includes('VÁLIDO')
            ) {
                valido = true;
                estado = 'ACTIVO';
                mensaje = 'Comprobante válido';
            }
            else if (
                texto.includes('No existe') ||
                texto.includes('NO EXISTE') ||
                texto.includes('no válido')
            ) {
                valido = false;
                estado = 'NO_EXISTE';
                mensaje = 'Comprobante no existe';
            }
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

            return { valido, estado, mensaje };
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
    }
}
