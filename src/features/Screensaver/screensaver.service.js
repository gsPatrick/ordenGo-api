const { SystemAd, ClientAd, RestaurantConfig, Region } = require('../../models');
const { Op } = require('sequelize');

exports.getScreensaverPlaylist = async (restaurantId, userRegionId) => {
    try {
        // 1. Obter Configurações e Região do Restaurante
        const config = await RestaurantConfig.findOne({ where: { restaurantId } });
        if (!config || !config.screensaverEnabled) return [];

        const { screensaverAdminBatchSize, screensaverClientBatchSize, screensaverIdleTime } = config;

        // 2. Buscar Ads Globais/Regionais (SystemAds)
        // Filtra por: Ativo E (Estado Global OU Estado do Restaurante)
        // TODO: Usar Region corretamente se implementado. Por enquanto assume null = global.
        const systemAds = await SystemAd.findAll({
            where: {
                isActive: true,
                // targetState: [null, userRegionId] // Lógica futura se usar regions
            },
            order: [['viewsCount', 'ASC']] // Mostra os menos vistos primeiro? Ou random?
        });

        // 3. Buscar Ads do Cliente (ClientAds)
        const clientAds = await ClientAd.findAll({
            where: { restaurantId, isActive: true },
            order: [['order', 'ASC']]
        });

        // 4. Se não houver nenhum, retorna vazio
        if (systemAds.length === 0 && clientAds.length === 0) return [];

        // 5. Intercalar (Mixing Logic)
        let playlist = [];
        let sysIndex = 0;
        let cliIndex = 0;

        // Safety break para loops infinitos (máximo 50 itens na playlist inicial)
        const MAX_ITEMS = 50;
        let safetyCounter = 0;

        // Continua enquanto houver itens não adicionados ou até atingir um tamanho razoável
        // A ideia é gerar uma playlist "loopável".
        // Se um acabar, repetimos? Ou paramos?
        // Abordagem simples: Gera uma sequência "Padrão" que o frontend pode fazer loop.

        // Se tiver os dois tipos:
        if (systemAds.length > 0 && clientAds.length > 0) {
            // Tenta criar pelo menos alguns ciclos
            while (safetyCounter < MAX_ITEMS) {
                // Adiciona Lote de Admin
                for (let i = 0; i < screensaverAdminBatchSize; i++) {
                    if (systemAds.length > 0) {
                        playlist.push({ ...systemAds[sysIndex % systemAds.length].toJSON(), type: 'admin' });
                        sysIndex++;
                        safetyCounter++;
                    }
                }

                // Adiciona Lote de Cliente
                for (let i = 0; i < screensaverClientBatchSize; i++) {
                    if (clientAds.length > 0) {
                        playlist.push({ ...clientAds[cliIndex % clientAds.length].toJSON(), type: 'client' });
                        cliIndex++;
                        safetyCounter++;
                    }
                }

                // Critério de parada: Já rodamos pelo menos uma vez todos os itens de ambas as listas?
                // Simplificação: Gera uma lista fixa de tamanho ~20 e deixa o frontend fazer loop circular.
                if (playlist.length >= 20) break;
            }
        } else if (systemAds.length > 0) {
            // Só SystemAds
            return systemAds.map(ad => ({ ...ad.toJSON(), type: 'admin' }));
        } else {
            // Só ClientAds
            return clientAds.map(ad => ({ ...ad.toJSON(), type: 'client' }));
        }

        return playlist;

    } catch (error) {
        console.error('Erro ao gerar playlist screensaver:', error);
        throw error;
    }
};
