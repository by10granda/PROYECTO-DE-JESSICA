module.exports = async function handler(request, response) {
  const imageUrl = 'https://aporteciudadano.espoch.edu.ec/upload/surveys/685168/images/Escudo_de_la_Escuela_Superior_Polit%C3%A9cnica_de_Chimborazo.png';

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      response.status(imageResponse.status).send('No se pudo cargar la marca de agua.');
      return;
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    response.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/png');
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.status(200).send(buffer);
  } catch (error) {
    console.error(error);
    response.status(500).send('No se pudo cargar la marca de agua.');
  }
};
