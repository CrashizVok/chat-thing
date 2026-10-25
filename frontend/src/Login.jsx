// Login.jsx
import { useState } from "react";
import { TailSpin } from "react-loader-spinner";
import Chat from "./Chat";

function Login() {
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [token, setToken] = useState(null);

	async function submit(e) {
		e.preventDefault();
		if (!name.trim() || !password || loading) return;
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/v1/jwt", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim(), password }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setToken(data.token);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}

	if (token) return <Chat token={token} />;

	return (
		<form onSubmit={submit}>
			<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Név" />
			<input
				type="password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				placeholder="Jelszó"
			/>
			<button disabled={loading}>login</button>
			{loading && <TailSpin color="#00BFFF" height={30} width={30} />}
			{error && <div role="alert">{error}</div>}
		</form>
	);
}

export default Login;
