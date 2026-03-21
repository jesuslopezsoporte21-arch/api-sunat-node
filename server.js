import express from 'express';

const app = express();
app.use(express.json());

// 🔥 RUTA DE PRUEBA (IMPORTANTE)
app.get('/', (req, res) => {
    res.send('API funcionando 🚀');
});

app.post('/verificar', async (req, res) => {
    console.log('📩 Petición recibida');

    return res.json({
        success: true,
        mensaje: "API funcionando correctamente",
        data: req.body
    });
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
