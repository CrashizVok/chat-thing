require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const pino = require('pino');
const logger = pino();
const app = express();
app.use(express.json());
const port = 3010;

app.use(express.static('static'));

app.get('/', (req, res) => {
  return res.status(404).json({ error: 'ok' });
});

app.get('/api/v1/jwt', (req, res) => {
  const userId = 13;
  const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  logger.info({ userId: userId, route: '/api/v1/jwt' }, 'JWT generated');

  return res.status(201).json({ token: token });
});

app.post('/api/v1/call', (req, res) => {
  const { body = {} } = req.body;
  return res.status(404).json({ error: 'ok' });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
