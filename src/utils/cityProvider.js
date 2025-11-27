const axios = require('axios');
const AppError = require('./AppError');

/**
 * Utilitário para buscar cidades via API externa (countriesnow.space)
 * Adaptado para CommonJS conforme padrão do projeto.
 */
exports.fetchCitiesByCountry = async (countryName) => {
  try {
    // Mapeamento de códigos ISO (armazenados no DB) para nomes em Inglês (exigido pela API externa)
    const countryMap = {
      'ES': 'Spain',
      'DE': 'Germany',
      'IT': 'Italy',
      'FR': 'France',
      'PT': 'Portugal',
      'BR': 'Brazil',
      'UK': 'United Kingdom'
    };

    const apiCountryName = countryMap[countryName] || countryName;

    const response = await axios.post('https://countriesnow.space/api/v0.1/countries/cities', {
      country: apiCountryName
    }, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data && !response.data.error) {
      return response.data.data; // Retorna array de strings: ["Madrid", "Barcelona", ...]
    }
    
    return [];
  } catch (error) {
    console.error(`Erro ao buscar cidades para ${countryName}:`, error.message);
    // Não quebramos a aplicação se a API externa falhar, retornamos array vazio mas logamos o erro.
    return []; 
  }
};

