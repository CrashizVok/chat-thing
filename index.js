require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
        const hash = crypto.createHash("sha256").update(secretKey).digest("hex")
        const token = jwt.sign({ userName: name, secretKey:  hash}, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });
        logger.info({route: '/api/v1/jwt' }, 'JWT generated');

        res.cookie("jwt", token) // <-- Bullshit
        return res.status(201).json({error : token})
      }
  }
  catch{
    logger.error(new Error("Internal server error"))
    return res.status(500).json({error: "Internal server error"})
  } 
});

app.post('/api/v1/call', async (req, res) => {
  try{
      const {token = "", content = ""} = req.body 
      // TODO auth (check token)

      try{ // const uniqueId = 
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        console.log(decoded);

        //TODO check user exist

        const user = {
          id : crypto.randomUUID(),
          name : decoded.userName,
          secretKey: decoded.secretKey
        }
      }
      catch (error){
        logger.error(new Error(error))
        return res.status(403).json({error: "Jwt error"})
      }
      
      if (!content){
        logger.info({route: '/api/v1/call' }, "The content's required.");
        return res.status(403).json({error: "Unknown error. Try again!"})
      }
      else{
        // First API call with reasoning
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "model": "openrouter/free",
            "messages": [
              {
                "role": "user",
                "content": content ///`${content}`
              }
            ],
            "reasoning": {"enabled": true}
          })
        })

        const data = await response.json()

        logger.info({ response }, data)

        return res.status(200).json({ response: data.choices[0].message.content})
      }

    

    /*
    // Extract the assistant message with reasoning_details and save it to the response variable
    const result = await response.json();
    response = result.choices[0].message;

    // Preserve the assistant message with reasoning_details
    const messages = [
      {
        role: 'user',
        content: "How many r's are in the word 'strawberry'?",
      },
      {
        role: 'assistant',
        content: response.content,
        reasoning_details: response.reasoning_details, // Pass back unmodified
      },
      {
        role: 'user',
        content: "Are you sure? Think carefully.",
      },
    ];

    // Second API call - model continues reasoning from where it left off
    const response2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "model": "openrouter/free",
        "messages": messages  // Includes preserved reasoning_details
      })
    });
    */




  }
  catch{
    logger.error(new Error("Internal server error"))
    return res.status(500).json({error: "Internal server error"})
  } 
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
