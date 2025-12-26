const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoute = require('./routes/authRoute');
const authenticateToken = require('./middleware/authMiddleware');
const incomeRoute = require('./routes/incomeRoute');
const expenseRoute = require('./routes/expenseRoute');
const investmentRoute = require('./routes/investmentRoute');
const balanceRoute = require('./routes/balanceRoute');
const limitsRoute = require('./routes/limitsRoutes');
const dashboardRoute = require('./routes/dashboardRoute');
const splitRoute = require('./routes/splitRoute');
const loanRoute = require('./routes/loanRoute');
const emiRoute = require('./routes/emiRoute')
const errorHandler = require('./middleware/errorMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/incomes', incomeRoute);
app.use('/api/expenses', expenseRoute);
app.use('/api/investments', investmentRoute);
app.use('/api/balances', balanceRoute);
app.use('/api/limits', limitsRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/splits', splitRoute);
app.use('/api/loans', loanRoute);
app.use('/api/emis', emiRoute);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});


app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});


app.use(errorHandler.errorHandler);

module.exports = app;