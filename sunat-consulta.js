import puppeteer from 'puppeteer';

export async function consultarSunat(ruc, tipo, serie, numero, fecha, total) {
    const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
     });
    
    try {
        const page = await browser.newPage();
        
        console.log('🌐 Navegando a SUNAT...');
        await page.goto('https://e-consulta.sunat.gob.pe/ol-ti-itconsvalicpe/ConsValiCpe.htm', {
            waitUntil: 'networkidle2',
            timeout: 120000
        });
        
        console.log('📝 Esperando que cargue el formulario...');
        await page.waitForSelector('input[name="num_ruc"]', { timeout: 30000 });
        
        await page.type('input[name="num_ruc"]', ruc);
        
        console.log(`🔧 Seleccionando tipo: ${tipo}`);
        await page.select('select[name="tipocomprobante"]', tipo);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.select('select[name="cod_docide"]', '-');
        
        await page.type('input[name="num_serie"]', serie.toUpperCase());
        await page.type('input[name="num_comprob"]', numero);
        
        console.log(`📅 Forzando fecha: ${fecha}`);
        
        await page.click('input[name="fec_emision"]');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.click('body', { offset: { x: 10, y: 10 } });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const fechaInput = await page.$('input[name="fec_emision"]');
        await fechaInput.click({ clickCount: 3 });
        await fechaInput.press('Backspace');
        
        for (const char of fecha) {
            await fechaInput.type(char, { delay: 50 });
        }
        
        await page.evaluate((fecha) => {
            const input = document.querySelector('input[name="fec_emision"]');
            input.value = fecha;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const calendars = document.querySelectorAll('.datepicker, .datetimepicker, .bootstrap-datetimepicker-widget');
            calendars.forEach(cal => {
                if (cal.style && cal.style.display !== 'none') {
                    cal.style.display = 'none';
                }
            });
        }, fecha);
        
        await page.click('.panel-heading h4');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const fechaFinal = await page.$eval('input[name="fec_emision"]', el => el.value);
        console.log(`📅 Fecha final en el campo: ${fechaFinal}`);
        
        if (fechaFinal !== fecha) {
            console.log('⚠️ La fecha no se guardó, reintentando...');
            await page.evaluate((fecha) => {
                const input = document.querySelector('input[name="fec_emision"]');
                input.value = fecha;
                input.readOnly = false;
                input.disabled = false;
            }, fecha);
        }
        
        await page.type('input[name="cantidad"]', total);
        
        console.log('🔍 Haciendo clic en Buscar...');
        await page.click('input[value="Buscar"]');
        
        console.log('⏳ Esperando respuesta de SUNAT...');
        await page.waitForNavigation({ 
            waitUntil: 'networkidle2', 
            timeout: 120000 
        });
        
        console.log('✅ Página cargada, analizando...');
        
        // 🔥 AQUÍ ESTÁ LA MEJORA (BAJA INCLUIDA)
        const resultado = await page.evaluate(() => {
            const texto = document.body.innerText;
            const html = document.documentElement.innerHTML;
            
            let valido = false;
            let mensaje = '';
            let estado = '';
            
            // ✅ NUEVO: BAJA
            if (texto.includes('comunicada de BAJA')) {
                valido = true;
                estado = 'BAJA';
                
                const lineas = texto.split('\n');
                mensaje = lineas.find(l => l.includes('BAJA')) || 'Comprobante dado de baja';
            }

            // ✅ VÁLIDO
            else if (texto.includes('ha sido informada a SUNAT')) {
                valido = true;
                estado = 'ACTIVO';
                const lineas = texto.split('\n');
                mensaje = lineas.find(l => l.includes('informada')) || 'Boleta válida';
            }
            else if (texto.includes('El comprobante es válido') || 
                     texto.includes('COMPROBANTE VÁLIDO')) {
                valido = true;
                estado = 'ACTIVO';
                mensaje = 'El comprobante es válido';
            }

            // ❌ NO EXISTE
            else if (texto.includes('No existe') || 
                     texto.includes('no válido') ||
                     texto.includes('NO EXISTE')) {
                valido = false;
                estado = 'NO_EXISTE';
                mensaje = '❌ El comprobante NO existe';
            }

            // ⚠️ OTROS
            else {
                if (html.includes('BAJA')) {
                    valido = true;
                    estado = 'BAJA';
                    mensaje = 'Comprobante en BAJA';
                } else {
                    estado = 'DESCONOCIDO';
                    mensaje = '⚠️ No se pudo determinar';
                }
            }
            
            return { valido, mensaje, estado };
        });
        
        console.log('📊 RESULTADO:', resultado);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error:', error);
        return { 
            valido: false, 
            mensaje: 'Error: ' + error.message
        };
    } finally {
        await browser.close();
    }
}

const args = process.argv.slice(2);
const [ruc, tipo, serie, numero, fecha, total] = args;

console.log(JSON.stringify({ ruc, tipo, serie, numero, fecha, total }));

consultarSunat(ruc, tipo, serie, numero, fecha, total).then(resultado => {
    console.log(JSON.stringify(resultado));
    process.exit(0);
});
