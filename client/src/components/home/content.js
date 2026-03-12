export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: "easeOut" },
  }),
};

export const featureCards = [
  {
    title: "Track cash flow without blind spots",
    copy:
      "Bring income, expenses, investments, and balances into one operating view instead of managing five separate spreadsheets.",
  },
  {
    title: "Run your finances by account and method",
    copy:
      "See where money moved, which account handled it, and how each payment method affects your monthly picture.",
  },
  {
    title: "Catch pressure before it becomes damage",
    copy:
      "Limits, category trends, and balance shifts expose overspending patterns early enough to respond.",
  },
  {
    title: "Plan forward, not backward",
    copy:
      "Track EMIs, loans, goals, and investments together so future commitments stay visible next to current spending.",
  },
];

export const overviewStats = [
  { label: "Money views", value: "Income, expense, balance, investment" },
  { label: "Planning layer", value: "Goals, limits, EMIs, loans" },
  { label: "Control model", value: "Accounts, categories, payment methods" },
];

export const trustItems = [
  "Expense tracking",
  "Budget limits",
  "Investment insights",
  "EMI and loan management",
  "Goal planning",
];

export const workflowSteps = [
  {
    step: "01",
    title: "Capture every move",
    copy:
      "Log salary, bills, subscriptions, investments, and transfers in the same system from day one.",
  },
  {
    step: "02",
    title: "Read the pattern",
    copy:
      "Use category, account, and period views to see where your financial momentum is improving or leaking.",
  },
  {
    step: "03",
    title: "Act with intent",
    copy:
      "Set limits, fund goals, and manage debt with enough context to make the next move obvious.",
  },
];

export const useCases = [
  {
    audience: "Students",
    copy:
      "Control monthly allowances, rent, subscriptions, and split expenses without losing sight of essentials.",
  },
  {
    audience: "Professionals",
    copy:
      "Track salary inflows, SIPs, discretionary spending, and short-term goals in one disciplined workflow.",
  },
  {
    audience: "Households",
    copy:
      "Balance family spending, loan commitments, planned purchases, and recurring payments from a shared structure.",
  },
];

export const planningItems = [
  "Set daily, weekly, or monthly spending limits",
  "Monitor active EMIs and loan obligations",
  "Track goal contributions from income or expense flow",
  "Balance discipline with flexibility across categories",
];

export const securityItems = [
  "Secure authentication flow",
  "Private account-scoped data access",
  "Clear separation between app and public pages",
  "Production deployment with managed backend and database",
];
