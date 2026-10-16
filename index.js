require("dotenv").config();
const fs = require("node:fs/promises");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const express = require("express");
const pino = require("pino");
const logger = pino();
const app = express();
app.use(express.json());
const port = 3000;
app.use(express.static("static"));

const deriveId = (name, key) => {
	return crypto
		.createHmac("sha256", process.env.ID_PEPPER)
		.update(`${name}\0${key}`)
		.digest("hex");
};

app.get("/", (req, res) => {
	return res.status(404).json({ error: "ok" });
});

app.post("/api/v1/jwt", (req, res) => {
	try {
		const { name = "", password = "" } = req.body;

		if (!name || !password) {
			logger.info({ route: "/api/v1/jwt" }, "Name and secret are required.");
			return res.status(400).json({ error: "Unknown error. Try again!" });
		} else {
			const token = jwt.sign({ name: name }, process.env.JWT_SECRET, {
				subject: deriveId(name, password),
				expiresIn: "1h",
			});
			logger.info({ route: "/api/v1/jwt" }, "JWT generated");

			return res.status(201).json({ jwt: token });
		}
	} catch {
		logger.error(new Error("Internal server error"));
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.post("/api/v1/call", async (req, res) => {
	try {
		const { token = "", content = "" } = req.body;

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
			console.log(decoded);

			const fileContent = await fs.readFile("data.json", "utf-8");
			const data = JSON.parse(fileContent);
			const existUser = data.accounts.some(
				(account) => account.name === decoded.name && account.id === decoded.sub,
			);

			if (!existUser) {
				const NewUser = {
					id: decoded.sub,
					name: decoded.name,
				};
				data.accounts.push(NewUser);

				await fs.writeFile("data.json", JSON.stringify(data, null, 2), "utf-8");
				logger.info({ user: decoded.name }, "User created");
			}
		} catch (error) {
			logger.error(new Error(error));
			return res.status(403).json({ error: "Jwt error" });
		}

		if (!content) {
			logger.info({ route: "/api/v1/call" }, "The content's required.");
			return res.status(403).json({ error: "Unknown error. Try again!" });
		} else {
			//TODO stream !!!
			// TODO save
			const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "openrouter/free",
					messages: [
						{
							role: "user",
							content: content, ///`${content}`
						},
					],
					reasoning: { enabled: true },
				}),
			});

			const data = await response.json();

			logger.info({ response }, data);

			return res.status(200).json({ response: data?.choices[0]?.message?.content });
		}
	} catch {
		logger.error(new Error("Internal server error"));
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
