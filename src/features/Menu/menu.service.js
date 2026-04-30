const {
  Category, Product, ProductVariant, ModifierGroup, Modifier, sequelize
} = require('../../models');
const AppError = require('../../utils/AppError');



exports.getProducts = async (restaurantId, filters = {}) => {
  const where = { restaurantId, isAvailable: true };

  if (filters.isOffer) where.isOffer = true;
  if (filters.isHighlight) where.isHighlight = true;

  return await Product.findAll({
    where,
    include: [{ model: Category, attributes: ['name'] }]
  });
};


// ==============================================================================
// 1. LEITURA (PUBLIC & ADMIN)
// ==============================================================================

/**
 * Retorna a Árvore Completa do Menu para o Tablet/Frontend.
 * Estrutura: Categorias Principais -> Subcategorias -> Produtos (com Variantes e Modificadores)
 */
exports.getFullMenu = async (restaurantId, includeUnavailable = false) => {
  const productWhere = includeUnavailable ? {} : { isAvailable: true };

  const menu = await Category.findAll({
    where: {
      restaurantId,
      parentId: null, // Apenas categorias raiz
      isActive: true
    },
    order: [['order', 'ASC']],
    include: [
      {
        model: Category,
        as: 'subcategories',
        where: { isActive: true },
        required: false,
        order: [['order', 'ASC']],
        include: [
          {
            model: Product,
            where: productWhere,
            required: false,
            order: [['order', 'ASC']],
            include: [
              { model: ProductVariant, as: 'variants' },
              {
                model: ModifierGroup,
                as: 'modifierGroups',
                include: [{ model: Modifier, as: 'options' }]
              }
            ]
          }
        ]
      },
      {
        // Produtos que estão direto na categoria raiz (sem subcategoria)
        model: Product,
        where: productWhere,
        required: false,
        order: [['order', 'ASC']],
        include: [
          { model: ProductVariant, as: 'variants' },
          {
            model: ModifierGroup,
            as: 'modifierGroups',
            include: [{ model: Modifier, as: 'options' }]
          }
        ]
      }
    ]
  });

  return menu;
};

// ==============================================================================
// 2. GESTÃO DE CATEGORIAS
// ==============================================================================

exports.createCategory = async (restaurantId, data) => {
  // data.name deve ser { pt: "Bebidas", en: "Drinks" }
  return await Category.create({ ...data, restaurantId });
};

exports.updateCategory = async (restaurantId, id, data) => {
  const category = await Category.findOne({ where: { id, restaurantId } });
  if (!category) throw new AppError('Categoria não encontrada', 404);

  // Se vier imagem nova (filename), atualizamos o path
  if (data.filename) {
    data.image = `/uploads/${data.filename}`;
  }

  return await category.update(data);
};

// ==============================================================================
// 3. GESTÃO DE PRODUTOS
// ==============================================================================

exports.createProduct = async (restaurantId, data) => {
  const { variants, modifierGroupIds, ...productData } = data;

  // Transação pois podemos criar variantes junto
  const transaction = await sequelize.transaction();

  try {
    if (data.filename) {
      productData.imageUrl = `/uploads/${data.filename}`;
    }

    const product = await Product.create({ ...productData, restaurantId }, { transaction });

    // Se tiver variantes (P, M, G)
    if (variants && variants.length > 0) {
      const variantsData = variants.map(v => ({ ...v, productId: product.id }));
      await ProductVariant.bulkCreate(variantsData, { transaction });
      await product.update({ hasVariants: true }, { transaction });
    }

    // Se já quiser vincular grupos de modificadores
    if (modifierGroupIds && modifierGroupIds.length > 0) {
      await product.setModifierGroups(modifierGroupIds, { transaction });
    }

    await transaction.commit();
    return product;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.updateProduct = async (restaurantId, id, data) => {
  const product = await Product.findOne({ where: { id, restaurantId } });
  if (!product) throw new AppError('Produto não encontrado', 404);

  if (data.filename) {
    data.imageUrl = `/uploads/${data.filename}`;
  }

  await product.update(data);

  // Atualizar vínculos de modificadores se enviado
  if (data.modifierGroupIds) {
    await product.setModifierGroups(data.modifierGroupIds);
  }

  return product;
};

/**
 * "86 it" - Pausa rápida de disponibilidade
 */
exports.toggleProductAvailability = async (restaurantId, id) => {
  const product = await Product.findOne({ where: { id, restaurantId } });
  if (!product) throw new AppError('Produto não encontrado', 404);

  product.isAvailable = !product.isAvailable;
  await product.save();
  return product;
};

// ==============================================================================
// 4. GESTÃO DE MODIFICADORES (Adicionais)
// ==============================================================================

exports.createModifierGroup = async (restaurantId, data) => {
  // data: { name: {...}, minSelection: 0, maxSelection: 1, options: [{name, price}] }
  const { options, ...groupData } = data;

  const transaction = await sequelize.transaction();
  try {
    const group = await ModifierGroup.create({ ...groupData, restaurantId }, { transaction });

    if (options && options.length > 0) {
      const optionsData = options.map(o => ({ ...o, modifierGroupId: group.id }));
      await Modifier.bulkCreate(optionsData, { transaction });
    }

    await transaction.commit();
    return group;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.getAllModifierGroups = async (restaurantId) => {
  return await ModifierGroup.findAll({
    where: { restaurantId },
    include: [{ model: Modifier, as: 'options' }]
  });
};

exports.updateModifierGroup = async (restaurantId, id, data) => {
  const group = await ModifierGroup.findOne({ where: { id, restaurantId } });
  if (!group) throw new AppError('Grupo de modificadores não encontrado', 404);

  const { options, ...groupData } = data;

  const transaction = await sequelize.transaction();
  try {
    await group.update(groupData, { transaction });

    if (options) {
      // Substituição completa das opções (simples)
      // Primeiro remove as antigas
      await Modifier.destroy({ where: { modifierGroupId: id }, transaction });

      // Cria as novas
      if (options.length > 0) {
        const optionsData = options.map(o => ({ ...o, modifierGroupId: id }));
        await Modifier.bulkCreate(optionsData, { transaction });
      }
    }

    await transaction.commit();
    return group;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.deleteModifierGroup = async (restaurantId, id) => {
  const group = await ModifierGroup.findOne({ where: { id, restaurantId } });
  if (!group) throw new AppError('Grupo de modificadores não encontrado', 404);

  await group.destroy();
  return true;
};

exports.deleteCategory = async (restaurantId, id) => {
  const category = await Category.findOne({ where: { id, restaurantId } });
  if (!category) throw new AppError('Categoria não encontrada', 404);

  await category.destroy();
  return true;
};

exports.deleteProduct = async (restaurantId, id) => {
  const product = await Product.findOne({ where: { id, restaurantId } });
  if (!product) throw new AppError('Produto não encontrado', 404);

  await product.destroy();
  return true;
};

exports.reorderCategories = async (restaurantId, orderedIds) => {
  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await Category.update(
        { order: i },
        { where: { id: orderedIds[i], restaurantId }, transaction }
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.reorderProducts = async (restaurantId, orderedIds) => {
  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await Product.update(
        { order: i },
        { where: { id: orderedIds[i], restaurantId }, transaction }
      );
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};