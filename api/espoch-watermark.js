const crypto = require('crypto');
const https = require('https');

module.exports = async function handler(request, response) {
  const imageUrl = 'https://aporteciudadano.espoch.edu.ec/upload/surveys/685168/images/Escudo_de_la_Escuela_Superior_Polit%C3%A9cnica_de_Chimborazo.png';

  try {
    const { buffer, contentType } = await new Promise((resolve, reject) => {
      const request = https.get(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        rejectUnauthorized: false,
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
      }, (imageResponse) => {
        if (imageResponse.statusCode < 200 || imageResponse.statusCode >= 300) {
          reject(new Error(`La imagen respondio ${imageResponse.statusCode}`));
          return;
        }

        const chunks = [];
        imageResponse.on('data', (chunk) => chunks.push(chunk));
        imageResponse.on('end', () => resolve({
          buffer: Buffer.concat(chunks),
          contentType: imageResponse.headers['content-type']
        }));
      });
      request.on('error', reject);
      request.setTimeout(15000, () => request.destroy(new Error('Tiempo agotado cargando la marca de agua.')));
    });

    response.setHeader('Content-Type', contentType || 'image/png');
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.status(200).send(buffer);
  } catch (error) {
    console.error(error);
    response.status(500).send('No se pudo cargar la marca de agua.');
  }
};
