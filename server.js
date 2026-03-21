import express from 'express';
import { consultarSunat } from './sunat-consulta.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API funcionando 🚀');
});

app.post('/verificar', async (req, res) => {
    const { ruc, tipo, serie, numero, fecha, total } = req.body;

    console.log('📩 Petición recibida');

    try {
        const resultado = await Promise.race([
            consultarSunat(ruc, tipo, serie, numero, fecha, total),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout 25s')), 25000)
            )
        ]);

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('❌ Error:', error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
