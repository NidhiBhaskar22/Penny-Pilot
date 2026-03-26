const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prismaClient");
const { monthKeyIST, getWeekOfMonth } = require("../src/utils/datKeys");

const DEMO_EMAIL = "demo@pennypilot.dev";
const DEMO_PASSWORD = "Demo@12345";
const COLLAB_EMAIL = "roommate@pennypilot.dev";
const COLLAB_PASSWORD = "Roommate@123";

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function monthStart(dateLike) {
  const date = new Date(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function atNoon(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
}

function buildMoneyDate(dateLike) {
  return atNoon(new Date(dateLike));
}

function toMonth(dateLike) {
  return monthKeyIST(new Date(dateLike));
}

function toWeek(dateLike) {
  return getWeekOfMonth(new Date(dateLike));
}

async function deleteUserGraph(userId) {
  const [accounts, expenses, incomes, goals, loans, emis] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { id: true } }),
    prisma.expense.findMany({ where: { userId }, select: { id: true } }),
    prisma.income.findMany({ where: { userId }, select: { id: true } }),
    prisma.goal.findMany({ where: { userId }, select: { id: true } }),
    prisma.loan.findMany({ where: { userId }, select: { id: true } }),
    prisma.eMI.findMany({ where: { userId }, select: { id: true } }),
  ]);

  const accountIds = accounts.map((row) => row.id);
  const expenseIds = expenses.map((row) => row.id);
  const incomeIds = incomes.map((row) => row.id);
  const goalIds = goals.map((row) => row.id);
  const loanIds = loans.map((row) => row.id);
  const emiIds = emis.map((row) => row.id);

  await prisma.goalContribution.deleteMany({
    where: {
      OR: [
        goalIds.length ? { goalId: { in: goalIds } } : undefined,
        incomeIds.length ? { incomeId: { in: incomeIds } } : undefined,
        expenseIds.length ? { expenseId: { in: expenseIds } } : undefined,
      ].filter(Boolean),
    },
  });

  await prisma.splitExpense.deleteMany({
    where: {
      OR: [
        expenseIds.length ? { expenseId: { in: expenseIds } } : undefined,
        { userId },
        { paidByUserId: userId },
      ].filter(Boolean),
    },
  });

  await prisma.eMISchedule.deleteMany({
    where: {
      OR: [
        emiIds.length ? { emiId: { in: emiIds } } : undefined,
        expenseIds.length ? { expenseId: { in: expenseIds } } : undefined,
        { userId },
      ].filter(Boolean),
    },
  });

  if (loanIds.length) {
    await prisma.loanPayment.deleteMany({
      where: { loanId: { in: loanIds } },
    });
  }

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.limit.deleteMany({ where: { userId } });
  await prisma.moneyLent.deleteMany({ where: { lenderId: userId } });
  await prisma.moneyBorrowed.deleteMany({ where: { borrowerId: userId } });
  await prisma.insurance.deleteMany({ where: { userId } });
  await prisma.taxRecord.deleteMany({ where: { userId } });
  await prisma.balance.deleteMany({ where: { userId } });
  await prisma.investmentTransaction.deleteMany({ where: { userId } });
  await prisma.investment.deleteMany({ where: { userId } });
  await prisma.eMI.deleteMany({ where: { userId } });
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.income.deleteMany({ where: { userId } });
  await prisma.goal.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  if (accountIds.length) {
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
  }
  await prisma.user.delete({ where: { id: userId } });
}

async function resetDemoUsers() {
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: [DEMO_EMAIL, COLLAB_EMAIL] } },
    select: { id: true, email: true },
  });

  for (const user of existingUsers) {
    await deleteUserGraph(user.id);
  }
}

async function createUser(name, email, password, balance) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      balance,
    },
  });
}

async function createAccount(userId, data) {
  return prisma.account.create({
    data: {
      userId,
      name: data.name,
      identifier: data.identifier,
      balance: data.balance,
      methods: {
        create: data.methods.map((method) => ({ method })),
      },
    },
    include: { methods: true },
  });
}

async function createInstrument(data) {
  const instrument = await prisma.instrument.upsert({
    where: { symbol: data.symbol },
    update: {
      name: data.name,
      assetType: data.assetType,
      exchange: data.exchange,
      currency: data.currency,
      sector: data.sector || null,
      country: data.country || null,
      isEtf: Boolean(data.isEtf),
      isFund: Boolean(data.isFund),
      lastSyncedAt: new Date(),
    },
    create: {
      symbol: data.symbol,
      name: data.name,
      assetType: data.assetType,
      exchange: data.exchange,
      currency: data.currency,
      sector: data.sector || null,
      country: data.country || null,
      isEtf: Boolean(data.isEtf),
      isFund: Boolean(data.isFund),
      lastSyncedAt: new Date(),
    },
  });

  await prisma.instrumentQuote.upsert({
    where: { instrumentId: instrument.id },
    update: {
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      fetchedAt: new Date(),
    },
    create: {
      instrumentId: instrument.id,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      fetchedAt: new Date(),
    },
  });

  return instrument;
}

async function main() {
  await resetDemoUsers();

  const today = atNoon(new Date());
  const currentMonth = monthStart(today);
  const lastMonth = monthStart(addMonths(today, -1));
  const twoMonthsAgo = monthStart(addMonths(today, -2));
  const threeMonthsAgo = monthStart(addMonths(today, -3));

  const demoUser = await createUser("Penny Pilot Demo", DEMO_EMAIL, DEMO_PASSWORD, 154820);
  const roommate = await createUser("Aarav Roommate", COLLAB_EMAIL, COLLAB_PASSWORD, 28500);

  const accounts = {
    salary: await createAccount(demoUser.id, {
      name: "HDFC Salary",
      identifier: "HDFC-2481",
      balance: 51200,
      methods: ["NET_BANKING", "UPI", "DEBIT_CARD"],
    }),
    savings: await createAccount(demoUser.id, {
      name: "ICICI Savings",
      identifier: "ICICI-6104",
      balance: 68420,
      methods: ["NET_BANKING", "UPI", "DEBIT_CARD", "CASH"],
    }),
    wallet: await createAccount(demoUser.id, {
      name: "Daily Wallet",
      identifier: "Cash",
      balance: 5200,
      methods: ["CASH", "UPI"],
    }),
    broker: await createAccount(demoUser.id, {
      name: "Zerodha Funds",
      identifier: "Broker",
      balance: 30000,
      methods: ["NET_BANKING", "UPI"],
    }),
  };

  const roommateAccount = await createAccount(roommate.id, {
    name: "SBI Savings",
    identifier: "SBI-9912",
    balance: 28500,
    methods: ["UPI", "NET_BANKING", "DEBIT_CARD"],
  });

  const expenseCategories = {};
  for (const category of [
    ["Housing", "needs"],
    ["Groceries", "needs"],
    ["Dining", "wants"],
    ["Transport", "needs"],
    ["Utilities", "needs"],
    ["Health", "needs"],
    ["Entertainment", "wants"],
    ["Shopping", "wants"],
    ["Travel", "culture"],
    ["Education", "culture"],
  ]) {
    const created = await prisma.category.create({
      data: {
        userId: demoUser.id,
        name: category[0],
        type: "EXPENSE",
        kakeibo: category[1],
      },
    });
    expenseCategories[category[0]] = created;
  }

  const incomeCategories = {};
  for (const category of ["Salary", "Freelance", "Bonus", "Refund"]) {
    const created = await prisma.category.create({
      data: {
        userId: demoUser.id,
        name: category,
        type: "INCOME",
      },
    });
    incomeCategories[category] = created;
  }

  const roommateCategory = await prisma.category.create({
    data: {
      userId: roommate.id,
      name: "Shared Living",
      type: "EXPENSE",
      kakeibo: "needs",
    },
  });

  const incomeRows = [
    {
      amount: 85000,
      source: "Salary",
      tag: "Product Engineer Salary",
      creditedAt: buildMoneyDate(addDays(threeMonthsAgo, 2)),
      accountId: accounts.salary.id,
      paymentMethod: "NET_BANKING",
      categoryId: incomeCategories.Salary.id,
    },
    {
      amount: 84000,
      source: "Salary",
      tag: "Product Engineer Salary",
      creditedAt: buildMoneyDate(addDays(twoMonthsAgo, 3)),
      accountId: accounts.salary.id,
      paymentMethod: "NET_BANKING",
      categoryId: incomeCategories.Salary.id,
    },
    {
      amount: 86000,
      source: "Salary",
      tag: "Product Engineer Salary",
      creditedAt: buildMoneyDate(addDays(lastMonth, 2)),
      accountId: accounts.salary.id,
      paymentMethod: "NET_BANKING",
      categoryId: incomeCategories.Salary.id,
    },
    {
      amount: 87000,
      source: "Salary",
      tag: "Product Engineer Salary",
      creditedAt: buildMoneyDate(addDays(currentMonth, 1)),
      accountId: accounts.salary.id,
      paymentMethod: "NET_BANKING",
      categoryId: incomeCategories.Salary.id,
    },
    {
      amount: 18000,
      source: "External",
      tag: "Freelance dashboard work",
      creditedAt: buildMoneyDate(addDays(lastMonth, 12)),
      accountId: accounts.savings.id,
      paymentMethod: "UPI",
      categoryId: incomeCategories.Freelance.id,
    },
    {
      amount: 12000,
      source: "Gift",
      tag: "Festival gift",
      creditedAt: buildMoneyDate(addDays(twoMonthsAgo, 20)),
      accountId: accounts.savings.id,
      paymentMethod: "NET_BANKING",
      categoryId: incomeCategories.Bonus.id,
    },
  ];

  const createdIncomes = [];
  for (const row of incomeRows) {
    createdIncomes.push(
      await prisma.income.create({
        data: {
          userId: demoUser.id,
          ...row,
          month: toMonth(row.creditedAt),
        },
      })
    );
  }

  const expenseRows = [
    [threeMonthsAgo, 22000, "Apartment Rent", "Housing", accounts.savings.id, "NET_BANKING"],
    [threeMonthsAgo, 4200, "BigBasket", "Groceries", accounts.savings.id, "UPI"],
    [addDays(threeMonthsAgo, 8), 2600, "Uber Commute", "Transport", accounts.wallet.id, "UPI"],
    [addDays(threeMonthsAgo, 11), 1900, "Movie Night", "Entertainment", accounts.wallet.id, "CASH"],
    [addDays(threeMonthsAgo, 15), 3100, "Electricity Bill", "Utilities", accounts.savings.id, "NET_BANKING"],
    [twoMonthsAgo, 22000, "Apartment Rent", "Housing", accounts.savings.id, "NET_BANKING"],
    [addDays(twoMonthsAgo, 5), 4800, "DMart", "Groceries", accounts.savings.id, "UPI"],
    [addDays(twoMonthsAgo, 9), 3400, "Cafe Meetups", "Dining", accounts.wallet.id, "CASH"],
    [addDays(twoMonthsAgo, 14), 2200, "Pharmacy", "Health", accounts.savings.id, "UPI"],
    [addDays(twoMonthsAgo, 19), 6700, "Sneakers", "Shopping", accounts.salary.id, "DEBIT_CARD"],
    [lastMonth, 22000, "Apartment Rent", "Housing", accounts.savings.id, "NET_BANKING"],
    [addDays(lastMonth, 4), 5200, "Blinkit", "Groceries", accounts.savings.id, "UPI"],
    [addDays(lastMonth, 7), 2800, "Swiggy + Dining", "Dining", accounts.wallet.id, "UPI"],
    [addDays(lastMonth, 10), 1800, "Fuel", "Transport", accounts.wallet.id, "CASH"],
    [addDays(lastMonth, 12), 4400, "Concert Pass", "Entertainment", accounts.salary.id, "CREDIT_CARD"],
    [addDays(lastMonth, 18), 9500, "Weekend Trip Booking", "Travel", accounts.salary.id, "CREDIT_CARD"],
    [currentMonth, 22000, "Apartment Rent", "Housing", accounts.savings.id, "NET_BANKING"],
    [addDays(currentMonth, 3), 5600, "FreshToHome + Groceries", "Groceries", accounts.savings.id, "UPI"],
    [addDays(currentMonth, 6), 3200, "Team Dinner", "Dining", accounts.wallet.id, "UPI"],
    [addDays(currentMonth, 9), 2100, "Metro Recharge + Cab", "Transport", accounts.wallet.id, "UPI"],
    [addDays(currentMonth, 12), 3800, "WiFi + Power", "Utilities", accounts.savings.id, "NET_BANKING"],
    [addDays(currentMonth, 16), 7400, "Course Subscription", "Education", accounts.salary.id, "CREDIT_CARD"],
    [addDays(currentMonth, 19), 6600, "New Headphones", "Shopping", accounts.salary.id, "DEBIT_CARD"],
    [addDays(currentMonth, 22), 2900, "Gym + Health Check", "Health", accounts.savings.id, "UPI"],
  ];

  const createdExpenses = [];
  for (const [date, amount, paidTo, categoryName, accountId, paymentMethod] of expenseRows) {
    createdExpenses.push(
      await prisma.expense.create({
        data: {
          userId: demoUser.id,
          amount,
          paidTo,
          spentAt: buildMoneyDate(date),
          month: toMonth(date),
          week: toWeek(date),
          accountId,
          paymentMethod,
          categoryId: expenseCategories[categoryName].id,
        },
      })
    );
  }

  const splitExpenseBase = await prisma.expense.create({
    data: {
      userId: demoUser.id,
      amount: 2400,
      paidTo: "Flat Dinner Supplies",
      spentAt: buildMoneyDate(addDays(currentMonth, 13)),
      month: toMonth(addDays(currentMonth, 13)),
      week: toWeek(addDays(currentMonth, 13)),
      accountId: accounts.savings.id,
      paymentMethod: "UPI",
      categoryId: expenseCategories.Groceries.id,
    },
  });

  await prisma.splitExpense.createMany({
    data: [
      {
        expenseId: splitExpenseBase.id,
        userId: demoUser.id,
        amountOwed: 1200,
        amountPaid: 2400,
        paidByUserId: demoUser.id,
      },
      {
        expenseId: splitExpenseBase.id,
        userId: roommate.id,
        amountOwed: 1200,
        amountPaid: 0,
        paidByUserId: demoUser.id,
      },
    ],
  });

  await prisma.expense.create({
    data: {
      userId: roommate.id,
      amount: 1800,
      paidTo: "Room Utility Share",
      spentAt: buildMoneyDate(addDays(currentMonth, 10)),
      month: toMonth(addDays(currentMonth, 10)),
      week: toWeek(addDays(currentMonth, 10)),
      accountId: roommateAccount.id,
      paymentMethod: "UPI",
      categoryId: roommateCategory.id,
    },
  });

  const createdInvestments = [];
  for (const row of [
    {
      amount: 10000,
      instrument: "SIP",
      type: "Mutual Fund",
      roi: 11.4,
      projections: "Long-term compounding for retirement corpus",
      details: "NIFTY50 ETF",
      investedAt: buildMoneyDate(addDays(twoMonthsAgo, 4)),
      accountId: accounts.broker.id,
      paymentMethod: "NET_BANKING",
    },
    {
      amount: 12000,
      instrument: "Stocks",
      type: "Equity",
      roi: 14.8,
      projections: "Core Indian equity allocation",
      details: "RELIANCE",
      investedAt: buildMoneyDate(addDays(lastMonth, 6)),
      accountId: accounts.broker.id,
      paymentMethod: "NET_BANKING",
    },
    {
      amount: 8000,
      instrument: "Lump-sum",
      type: "Gold ETF",
      roi: 8.1,
      projections: "Defensive allocation",
      details: "GOLD ETF",
      investedAt: buildMoneyDate(addDays(lastMonth, 17)),
      accountId: accounts.broker.id,
      paymentMethod: "UPI",
    },
    {
      amount: 15000,
      instrument: "SIP",
      type: "Mutual Fund",
      roi: 12.6,
      projections: "Monthly investing habit",
      details: "Midcap Fund",
      investedAt: buildMoneyDate(addDays(currentMonth, 5)),
      accountId: accounts.broker.id,
      paymentMethod: "NET_BANKING",
    },
  ]) {
    createdInvestments.push(
      await prisma.investment.create({
        data: {
          userId: demoUser.id,
          accountId: row.accountId,
          paymentMethod: row.paymentMethod,
          amount: row.amount,
          instrument: row.instrument,
          type: row.type,
          roi: row.roi,
          projections: row.projections,
          details: row.details,
          investedAt: row.investedAt,
          month: toMonth(row.investedAt),
          week: toWeek(row.investedAt),
        },
      })
    );
  }

  const instruments = {
    reliance: await createInstrument({
      symbol: "RELIANCE.NS",
      name: "Reliance Industries",
      assetType: "STOCK",
      exchange: "NSE",
      currency: "INR",
      sector: "Energy",
      country: "India",
      price: 2962.45,
      change: 18.25,
      changePercent: 0.62,
      volume: 1432056,
    }),
    niftybees: await createInstrument({
      symbol: "NIFTYBEES.NS",
      name: "Nippon India ETF Nifty 50 BeES",
      assetType: "ETF",
      exchange: "NSE",
      currency: "INR",
      country: "India",
      isEtf: true,
      price: 257.8,
      change: 1.9,
      changePercent: 0.74,
      volume: 2156089,
    }),
    goldbees: await createInstrument({
      symbol: "GOLDBEES.NS",
      name: "Nippon India ETF Gold BeES",
      assetType: "ETF",
      exchange: "NSE",
      currency: "INR",
      country: "India",
      isEtf: true,
      price: 72.45,
      change: 0.55,
      changePercent: 0.76,
      volume: 984123,
    }),
    infy: await createInstrument({
      symbol: "INFY.NS",
      name: "Infosys",
      assetType: "STOCK",
      exchange: "NSE",
      currency: "INR",
      sector: "Technology",
      country: "India",
      price: 1684.3,
      change: -11.2,
      changePercent: -0.66,
      volume: 1210094,
    }),
  };

  for (const row of [
    {
      instrumentId: instruments.reliance.id,
      transactionType: "BUY",
      quantity: 6,
      price: 2520,
      fees: 45,
      transactedAt: buildMoneyDate(addDays(twoMonthsAgo, 8)),
    },
    {
      instrumentId: instruments.niftybees.id,
      transactionType: "BUY",
      quantity: 120,
      price: 241,
      fees: 25,
      transactedAt: buildMoneyDate(addDays(lastMonth, 4)),
    },
    {
      instrumentId: instruments.goldbees.id,
      transactionType: "BUY",
      quantity: 80,
      price: 68,
      fees: 18,
      transactedAt: buildMoneyDate(addDays(lastMonth, 16)),
    },
    {
      instrumentId: instruments.reliance.id,
      transactionType: "SELL",
      quantity: 2,
      price: 2895,
      fees: 35,
      transactedAt: buildMoneyDate(addDays(currentMonth, 9)),
    },
    {
      instrumentId: instruments.infy.id,
      transactionType: "BUY",
      quantity: 10,
      price: 1595,
      fees: 22,
      transactedAt: buildMoneyDate(addDays(currentMonth, 14)),
    },
  ]) {
    await prisma.investmentTransaction.create({
      data: {
        userId: demoUser.id,
        instrumentId: row.instrumentId,
        accountId: accounts.broker.id,
        paymentMethod: "NET_BANKING",
        transactionType: row.transactionType,
        quantity: row.quantity,
        price: row.price,
        fees: row.fees,
        notes: "Seeded demo trade",
        transactedAt: row.transactedAt,
        month: toMonth(row.transactedAt),
        week: toWeek(row.transactedAt),
      },
    });
  }

  const emergencyFund = await prisma.goal.create({
    data: {
      userId: demoUser.id,
      title: "Emergency Fund",
      description: "Build six months of expenses as safety capital",
      targetAmount: 300000,
      currentAmount: 120000,
      deadline: addMonths(today, 9),
    },
  });

  const travelGoal = await prisma.goal.create({
    data: {
      userId: demoUser.id,
      title: "Japan Trip",
      description: "Planned international trip fund",
      targetAmount: 180000,
      currentAmount: 45000,
      deadline: addMonths(today, 14),
    },
  });

  await prisma.goalContribution.createMany({
    data: [
      {
        goalId: emergencyFund.id,
        incomeId: createdIncomes[2].id,
        amount: 15000,
      },
      {
        goalId: emergencyFund.id,
        incomeId: createdIncomes[3].id,
        amount: 20000,
      },
      {
        goalId: travelGoal.id,
        incomeId: createdIncomes[4].id,
        amount: 12000,
      },
      {
        goalId: travelGoal.id,
        expenseId: createdExpenses[15].id,
        amount: 3000,
      },
    ],
  });

  const currentYear = today.getFullYear();
  const currentMonthNumber = today.getMonth() + 1;

  await prisma.limit.createMany({
    data: [
      {
        userId: demoUser.id,
        scope: "MONTHLY",
        amount: 6000,
        month: currentMonthNumber,
        year: currentYear,
        categoryId: expenseCategories.Dining.id,
      },
      {
        userId: demoUser.id,
        scope: "MONTHLY",
        amount: 9000,
        month: currentMonthNumber,
        year: currentYear,
        categoryId: expenseCategories.Shopping.id,
      },
      {
        userId: demoUser.id,
        scope: "MONTHLY",
        amount: 8000,
        month: currentMonthNumber,
        year: currentYear,
        categoryId: expenseCategories.Groceries.id,
      },
      {
        userId: demoUser.id,
        scope: "WEEKLY",
        amount: 2500,
        week: toWeek(addDays(currentMonth, 14)),
        year: currentYear,
        categoryId: expenseCategories.Entertainment.id,
      },
      {
        userId: demoUser.id,
        scope: "DAILY",
        amount: 1200,
        day: buildMoneyDate(addDays(currentMonth, 6)),
        categoryId: expenseCategories.Transport.id,
      },
    ],
  });

  const loan = await prisma.loan.create({
    data: {
      userId: demoUser.id,
      amount: 240000,
      tenureMonths: 24,
      startDate: addMonths(today, -5),
      interestRate: 10.5,
      outstanding: 176000,
      description: "Laptop + equipment loan",
    },
  });

  await prisma.loanPayment.createMany({
    data: [
      { loanId: loan.id, amount: 12000, paidAt: addMonths(today, -4) },
      { loanId: loan.id, amount: 12000, paidAt: addMonths(today, -3) },
      { loanId: loan.id, amount: 12000, paidAt: addMonths(today, -2) },
      { loanId: loan.id, amount: 12000, paidAt: addMonths(today, -1) },
    ],
  });

  const loanEmi = await prisma.eMI.create({
    data: {
      userId: demoUser.id,
      title: "Laptop EMI",
      type: "LOAN",
      totalAmount: 240000,
      numInstallments: 24,
      emiAmount: 12000,
      startDate: addMonths(today, -5),
      linkedLoanId: loan.id,
    },
  });

  const cardEmi = await prisma.eMI.create({
    data: {
      userId: demoUser.id,
      title: "Phone Card EMI",
      type: "CARD",
      totalAmount: 72000,
      numInstallments: 12,
      emiAmount: 6000,
      startDate: addMonths(today, -2),
    },
  });

  const emiSchedules = [];
  for (let index = 0; index < 6; index += 1) {
    emiSchedules.push({
      emiId: loanEmi.id,
      userId: demoUser.id,
      dueDate: addMonths(addDays(today, -10), index - 4),
      amount: 12000,
      paid: index < 4,
      paidAt: index < 4 ? addMonths(addDays(today, -8), index - 4) : null,
    });
  }
  for (let index = 0; index < 4; index += 1) {
    emiSchedules.push({
      emiId: cardEmi.id,
      userId: demoUser.id,
      dueDate: addMonths(addDays(today, 5), index - 1),
      amount: 6000,
      paid: index < 2,
      paidAt: index < 2 ? addMonths(addDays(today, 2), index - 1) : null,
    });
  }
  await prisma.eMISchedule.createMany({ data: emiSchedules });

  await prisma.moneyLent.create({
    data: {
      lenderId: demoUser.id,
      borrower: "College Friend",
      amount: 15000,
      amountRepaid: 5000,
      purpose: "Short-term travel help",
      dueDate: addMonths(today, 1),
      lentAt: addDays(today, -18),
      repaid: false,
    },
  });

  await prisma.moneyBorrowed.create({
    data: {
      borrowerId: demoUser.id,
      lender: "Family",
      amount: 25000,
      purpose: "Emergency backup",
      dueDate: addMonths(today, 2),
      returned: false,
    },
  });

  await prisma.insurance.create({
    data: {
      userId: demoUser.id,
      policyName: "Health Shield Plus",
      policyNumber: "HSP-2026-4482",
      coverageAmount: 500000,
      premium: 18000,
      renewalDate: addMonths(today, 10),
      details: "Family floater health insurance",
    },
  });

  await prisma.taxRecord.create({
    data: {
      userId: demoUser.id,
      financialYear: `${currentYear - 1}-${String(currentYear).slice(-2)}`,
      taxableIncome: 1040000,
      exemptions: 185000,
      liability: 96800,
    },
  });

  await prisma.balance.createMany({
    data: [
      {
        userId: demoUser.id,
        current: 128400,
        lastWeek: 121600,
        lastMonth: 113800,
        month: toMonth(lastMonth),
        week: toWeek(addDays(lastMonth, 20)),
        updatedAt: addDays(today, -32),
      },
      {
        userId: demoUser.id,
        current: 146100,
        lastWeek: 138500,
        lastMonth: 128400,
        month: toMonth(currentMonth),
        week: Math.max(1, toWeek(today) - 1),
        updatedAt: addDays(today, -7),
      },
      {
        userId: demoUser.id,
        current: 154820,
        lastWeek: 146100,
        lastMonth: 128400,
        month: toMonth(today),
        week: toWeek(today),
        updatedAt: today,
      },
    ],
  });

  console.log("Sample data created successfully.");
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Roommate login: ${COLLAB_EMAIL} / ${COLLAB_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed sample data");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
