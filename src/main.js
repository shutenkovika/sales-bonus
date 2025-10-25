/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;
  const fullAmount = sale_price * quantity;
  const discountRate = discount / 100;
  const revenueFactor = 1 - discountRate;
  const revenue = fullAmount * revenueFactor;
  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;

  if (typeof profit != "number" || profit <= 0) {
    return 0;
  }

  let bonusPercentage = 0;

  if (index === total - 1) {
    bonusPercentage = 0;
  } else if (index === 0) {
    bonusPercentage = 0.15;
  } else if (index === 1 || index === 2) {
    bonusPercentage = 0.1;
  } else {
    bonusPercentage = 0.05;
  }

  const bonusAmount = profit * bonusPercentage;

  return bonusAmount;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error(
      "Ошибка: Некорректные или пустые входные данные (sellers, products, purchase_records)."
    );
  }
  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options || {};
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error(
      "Ошибка: Не переданы необходимые функции расчёта в options (calculateRevenue, calculateBonus)."
    );
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const salesStats = data.sellers.reduce((acc, seller) => {
    acc[seller.id] = {
      seller_id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    };

    return acc;
  }, {});

  // @TODO: Индексация продавцов и товаров для быстрого доступа

  const producMap = data.products.reduce((acc, product) => {
    acc[product.sku] = product;
    return acc;
  }, {});

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const sellerStatsRecord = salesStats[record.seller_id];

    if (!sellerStatsRecord) {
      console.warn(
        `Продавец с ID ${record.seller_id} не найден. Чек пропущен.`
      );
      return;
    }

    sellerStatsRecord.sales_count += 1;

    let totalRevenueFromItems = 0;
    let totalProfitFromItems = 0;

    record.items.forEach((item) => {
      const product = producMap[item.sku];

      if (!product) {
        console.warn(
          `Товар с SKU ${item.sku} не найден в каталоге. Покупка пропущена.`
        );
        return;
      }

      const cost = product.purchase_price * item.quantity;

      const revenue = calculateRevenue(item, product);

      const rawProfit = revenue - cost;

      const profit = +rawProfit.toFixed(2);

      totalRevenueFromItems += revenue;
      totalProfitFromItems += profit;

      if (!sellerStatsRecord.products_sold[item.sku]) {
        sellerStatsRecord.products_sold[item.sku] = 0;
      }

      sellerStatsRecord.products_sold[item.sku] += item.quantity;
    });

    sellerStatsRecord.revenue += totalRevenueFromItems;

    sellerStatsRecord.profit += totalProfitFromItems;
  });

  // @TODO: Сортировка продавцов по прибыли
  const sortedSellers = Object.values(salesStats);
  sortedSellers.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  const totalSellers = sortedSellers.length;

  sortedSellers.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    delete seller.products_sold;
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sortedSellers.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
