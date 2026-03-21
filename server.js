import express from 'express';
import bodyParser from 'body-parser';
import { consultarSunat } from './sunat-consulta.js';

const app = express();
app.use(bodyParser.json());

app.post('/verificar', async (req, res) => {
    const { ruc, tipo, serie, numero, fecha, total } = req.body;

    try {
        const resultado = await consultarSunat(
            ruc, tipo, serie, numero, fecha, total
        );

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`API SUNAT corriendo en puerto ${port}`);
});