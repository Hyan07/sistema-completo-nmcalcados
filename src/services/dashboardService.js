'use strict';

const dashboardRepository = require('../repositories/dashboardRepository');
const { normalizeDashboardPeriod, percentageChange } = require('../utils/dashboardValidation');
const { centsToMoney, moneyToCents } = require('../utils/cashPaymentValidation');

function moneyNet(receipts, disbursements) {
  return centsToMoney(moneyToCents(receipts || '0.00') - moneyToCents(disbursements || '0.00'));
}

function buildAlerts({ stock, finance, purchases, cashDifferences }) {
  const alerts = [];
  if (Number(stock.out_of_stock_skus) > 0) alerts.push({ code: 'OUT_OF_STOCK', severity: 'HIGH', count: Number(stock.out_of_stock_skus), message: `${stock.out_of_stock_skus} SKU(s) sem estoque.` });
  if (Number(stock.low_stock_skus) > 0) alerts.push({ code: 'LOW_STOCK', severity: 'MEDIUM', count: Number(stock.low_stock_skus), message: `${stock.low_stock_skus} SKU(s) abaixo ou no estoque mínimo.` });
  if (Number(finance.receivable_overdue) > 0) alerts.push({ code: 'OVERDUE_RECEIVABLES', severity: 'HIGH', amount: String(finance.receivable_overdue), message: 'Existem contas a receber vencidas.' });
  if (Number(finance.payable_overdue) > 0) alerts.push({ code: 'OVERDUE_PAYABLES', severity: 'HIGH', amount: String(finance.payable_overdue), message: 'Existem contas a pagar vencidas.' });
  if (Number(purchases.pending_purchases) > 0) alerts.push({ code: 'PENDING_PURCHASES', severity: 'MEDIUM', count: Number(purchases.pending_purchases), message: `${purchases.pending_purchases} compra(s) aguardando recebimento total.` });
  if (Number(cashDifferences.sessions_with_difference) > 0) alerts.push({ code: 'CASH_DIFFERENCE', severity: 'HIGH', count: Number(cashDifferences.sessions_with_difference), amount: String(cashDifferences.absolute_difference), message: 'Há divergências de fechamento de caixa nos últimos 7 dias.' });
  return alerts;
}

async function getDashboard(query = {}) {
  const period = normalizeDashboardPeriod(query);
  const currentPeriod = { dateFrom: period.dateFrom, dateTo: period.dateTo };
  const previousPeriod = { dateFrom: period.previousDateFrom, dateTo: period.previousDateTo };
  const [sales, previousSales, trend, topProducts, paymentMix, stock, lowStockItems, purchases, finance, cash, recentSales, cashDifferences] = await Promise.all([
    dashboardRepository.getSalesOverview(currentPeriod),
    dashboardRepository.getSalesOverview(previousPeriod),
    dashboardRepository.getSalesTrend(currentPeriod),
    dashboardRepository.getTopProducts(currentPeriod),
    dashboardRepository.getPaymentMix(currentPeriod),
    dashboardRepository.getStockOverview(),
    dashboardRepository.getLowStockItems(),
    dashboardRepository.getPurchasesOverview(),
    dashboardRepository.getFinanceOverview(currentPeriod),
    dashboardRepository.getOpenCashOverview(),
    dashboardRepository.getRecentSales(),
    dashboardRepository.getCashDifferences()
  ]);

  const salesComparison = {
    revenue: percentageChange(sales.revenue, previousSales.revenue),
    salesCount: percentageChange(sales.sales_count, previousSales.sales_count),
    averageTicket: percentageChange(sales.average_ticket, previousSales.average_ticket),
    unitsSold: percentageChange(sales.units_sold, previousSales.units_sold)
  };
  const financeWithNet = { ...finance, net_flow: moneyNet(finance.receipts, finance.disbursements) };

  return {
    generatedAt: new Date().toISOString(),
    period,
    sales: { ...sales, comparison: salesComparison, trend, topProducts, paymentMix, recentSales },
    stock: { ...stock, lowStockItems },
    purchases,
    finance: financeWithNet,
    cash,
    alerts: buildAlerts({ stock, finance: financeWithNet, purchases, cashDifferences })
  };
}

module.exports = { buildAlerts, getDashboard, moneyNet };
