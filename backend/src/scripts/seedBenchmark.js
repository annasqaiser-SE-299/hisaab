const { resetData, seedBenchmark } = require('../services/seed');
const { getBudget } = require('../services/budget');
const { getBalances } = require('../services/balances');

resetData();
seedBenchmark();

const budget = getBudget();
console.log(`Spent ${budget.spent} of ${budget.budget}: ${budget.percent_used}% ${budget.status}`);
for (const b of getBalances().balances) console.log(`${b.name}: net ${b.net}`);
