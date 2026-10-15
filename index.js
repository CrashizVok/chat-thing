require('dotenv').config();
const jwt = require('jsonwebtoken');
const express = require('express');
const pino = require('pino');
const logger = pino();
const app = express();
app.use(express.json());
const port = 3000;

app.use(express.static('static'));

app.get('/', (req, res) => {
  return res.status(404).json({ error: 'ok' });
});

app.get('/api/v1/jwt', (req, res) => {
  try{
    const {name = "", secretKey = ""} = req.body

      if (!name || !secretKey){
        logger.info({route: '/api/v1/jwt' }, "Name and secret are required.");
        return res.status(403).json({error: "Unknown error. Try again!"})
      }
      else{
        const token = jwt.sign({ userName: name, secretKey: secretKey }, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });
        logger.info({route: '/api/v1/jwt' }, 'JWT generated');

        res.cookie("jwt", token)
        return res.status(201).json({error : "JWT generated"})
      }
  }
  catch{
    logger.error(new Error("Internal server error"))
    return res.status(500).json({error: "Internal server error"})
  } 
});

app.post('/api/v1/call', async (req, res) => {
  try{
    // TODO auth (check token)
    const secret = process.env.OPENROUTER

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.2', // change this 
        messages: [
          {
            role: 'user',
            content: `${content}`,
          },
        ],
      }) 
    })



  }
  catch{
    logger.error(new Error("Internal server error"))
    return res.status(500).json({error: "Internal server error"})
  } 

  /*TODO 
  fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer <OPENROUTER_API_KEY>',
      'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
      'X-OpenRouter-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.2',
      messages: [
        {
          role: 'user',
          content: 'What is the meaning of life?',
        },
      ],
    }),
  });
  */
  return res.status(404).json({ error: 'ok' });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
