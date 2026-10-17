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

			return res.status(201).json({ token: token });
		}
	} catch {
		logger.error(new Error("Internal server error"));
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.post("/api/v1/call", async (req, res) => {
	try {
		const { token = "", content = "", chatId = "" } = req.body;

		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
		} catch (error) {
			logger.error(error);
			return res.status(403).json({ error: "Jwt error" });
		}

		if (!content) {
			return res.status(400).json({ error: "Content is required" });
		}

		const before = JSON.parse(await fs.readFile("data.json", "utf-8"));
		const oldChat = before.chats.find((c) => c.id === chatId && c.userId === decoded.sub);

		const history = oldChat
			? oldChat.messages.map((m) => ({ role: m.role, content: m.content }))
			: [];

		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "openrouter/free",
				messages: [...history, { role: "user", content }],
				reasoning: { enabled: true },
			}),
		});
		const data = await response.json();

		if (!response.ok || !data?.choices?.[0]) {
			logger.error({ status: response.status, data }, "OpenRouter error");
			return res.status(502).json({ error: "Upstream error" });
		}

		const userMSG = {
			id: crypto.randomUUID(),
			role: "user",
			name: decoded.name,
			content,
		};
		const botMSG = {
			id: crypto.randomUUID(),
			provider: data.provider,
			model: data.model,
			tokenUsage: data.usage?.total_tokens,
			reasoning: data.choices[0].message?.reasoning,
			role: data.choices[0].message?.role,
			content: data.choices[0].message?.content,
		};

		const filedata = JSON.parse(await fs.readFile("data.json", "utf-8"));

		if (!filedata.accounts.some((a) => a.id === decoded.sub)) {
			filedata.accounts.push({ id: decoded.sub, name: decoded.name });
			logger.info({ user: decoded.name }, "User created");
		}

		let currentChat = filedata.chats.find((c) => c.id === chatId && c.userId === decoded.sub);
		if (currentChat) {
			currentChat.messages.push(userMSG, botMSG);
		} else {
			currentChat = {
				id: crypto.randomUUID(),
				userId: decoded.sub,
				createdTime: Date.now(),
				messages: [userMSG, botMSG],
			};
			filedata.chats.push(currentChat);
		}

		await fs.writeFile("data.json", JSON.stringify(filedata, null, 2), "utf-8");

		return res.status(200).json({ response: botMSG.content, chatId: currentChat.id });
	} catch (error) {
		logger.error(error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
