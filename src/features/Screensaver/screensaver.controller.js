const screensaverService = require('./screensaver.service');
const { ClientAd, RestaurantConfig } = require('../../models');

// GET /api/screensaver/:restaurantId
exports.getPlaylist = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const playlist = await screensaverService.getScreensaverPlaylist(restaurantId);

        // Também retorna o tempo de idle para o frontend configurar o timer
        const config = await RestaurantConfig.findOne({ where: { restaurantId }, attributes: ['screensaverIdleTime'] });

        res.json({
            playlist,
            config: {
                idleTime: config ? config.screensaverIdleTime : 120
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/screensaver/client (Manager Upload)
exports.createClientAd = async (req, res) => {
    try {
        const { restaurantId, imageUrl, order } = req.body;

        // Verifica limite? Por enquanto livre.
        const ad = await ClientAd.create({
            restaurantId,
            imageUrl,
            isActive: true,
            order: order || 0
        });

        res.status(201).json(ad);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/screensaver/client/:id
exports.deleteClientAd = async (req, res) => {
    try {
        const { id } = req.params;
        await ClientAd.destroy({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/screensaver/client/:restaurantId (List for Manager)
exports.getClientAds = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const ads = await ClientAd.findAll({ where: { restaurantId }, order: [['createdAt', 'DESC']] });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
