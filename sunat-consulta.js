export async function consultarSunat(ruc, tipo, serie, numero, fecha, total) {
    console.log('✅ Prueba sin Puppeteer');

    return {
        mensaje: "API funcionando correctamente",
        datos: { ruc, tipo, serie, numero, fecha, total }
    };
}
