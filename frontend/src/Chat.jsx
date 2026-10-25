import { useState } from "react";
import { TailSpin } from "react-loader-spinner";
import Markdown from "react-markdown";

function Chat({ token }) {
	const [messages, setMessages] = useState([]);
	const [chatId, setChatId] = useState("");
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [loggedOut, setLoggedOut] = useState(false);

	async function send() {
		const content = input.trim();
		if (!content || loading) <TailSpin color="00BFFF" height={50} width={50} />;
		setInput("");
		setMessages((m) => [...m, { role: "user", content }]);
		setLoading(true);

		try {
			const res = await fetch("/api/v1/call", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, content, chatId }),
			});
			const data = await res.json();
			if (res.status === 403) return setLoggedOut(true);
			if (!res.ok) throw new Error(data.error);
			setChatId(data.chatId);
			setMessages((m) => [...m, { role: "assistant", content: data.response }]);
		} catch (e) {
			setMessages((m) => [...m, { role: "assistant", content: e.message, error: true }]);
		} finally {
			setLoading(false);
		}
	}
	if (loggedOut) return <Login />;

	return (
		<div>
			<div>
				{messages.map((m, i) => (
					<div key={i}>
						<b>{m.role === "user" ? "Youu" : "BOT"}:</b>
						<Markdown>{m.content}</Markdown>
					</div>
				))}
				{loading && <TailSpin color="00BFFF" height={50} width={50} />}
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					send();
				}}
			>
				<textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							send();
						}
					}}
					rows={1}
					placeholder="...."
				/>
				<button disabled={loading}>send</button>
			</form>
		</div>
	);
}

export default Chat;
