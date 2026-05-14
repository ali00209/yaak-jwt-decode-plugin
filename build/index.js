
//#region src/index.ts
var InvalidTokenError = class extends Error {};
InvalidTokenError.prototype.name = "InvalidTokenError";
function b64DecodeUnicode(str) {
	return decodeURIComponent(atob(str).replace(/(.)/g, (m, p) => {
		let code = p.charCodeAt(0).toString(16).toUpperCase();
		if (code.length < 2) code = "0" + code;
		return "%" + code;
	}));
}
function base64UrlDecode(str) {
	let output = str.replace(/-/g, "+").replace(/_/g, "/");
	switch (output.length % 4) {
		case 0: break;
		case 2:
			output += "==";
			break;
		case 3:
			output += "=";
			break;
		default: throw new Error("base64 string is not of the correct length");
	}
	try {
		return b64DecodeUnicode(output);
	} catch {
		return atob(output);
	}
}
function jwtDecode(token, options) {
	if (typeof token !== "string") throw new InvalidTokenError("Invalid token specified: must be a string");
	const pos = options?.header === true ? 0 : 1;
	const part = token.split(".")[pos];
	if (typeof part !== "string") throw new InvalidTokenError(`Invalid token specified: missing part #${pos + 1}`);
	let decoded;
	try {
		decoded = base64UrlDecode(part);
	} catch (e) {
		throw new InvalidTokenError(`Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`);
	}
	try {
		return JSON.parse(decoded);
	} catch (e) {
		throw new InvalidTokenError(`Invalid token specified: invalid json for part #${pos + 1} (${e.message})`);
	}
}
function applyJsonPath(obj, path) {
	const trimmed = path.trim();
	if (trimmed === "$") return obj;
	if (!trimmed.startsWith("$.")) throw new Error(`JSONPath must start with "$." (got: ${trimmed})`);
	const parts = trimmed.slice(2).split(".").flatMap((segment) => {
		const matches = segment.match(/^([^\[]+)(.*)$/);
		if (!matches) return [segment];
		const [, key, brackets] = matches;
		const indices = [...brackets.matchAll(/\[(\d+)\]/g)].map((m) => m[1]);
		return key ? [key, ...indices] : indices;
	});
	let current = obj;
	for (const part of parts) {
		if (current === null || current === void 0) return void 0;
		if (typeof current !== "object") return void 0;
		current = current[part];
	}
	return current;
}
function stringify(value) {
	if (value === void 0) return "";
	if (value === null) return "null";
	if (typeof value === "object") return JSON.stringify(value, null, 2);
	return String(value);
}
const plugin = { templateFunctions: [{
	name: "jwt.decode",
	description: "Decode a JWT payload, with optional JSONPath filter (e.g. $.data.login)",
	args: [{
		type: "text",
		name: "token",
		label: "JWT Token",
		placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
	}, {
		type: "text",
		name: "path",
		label: "JSONPath (optional)",
		placeholder: "$.data.login"
	}],
	async onRender(_ctx, args) {
		const token = args.values.token?.trim();
		const path = args.values.path?.trim();
		if (!token) return null;
		let payload;
		try {
			payload = jwtDecode(token);
		} catch (e) {
			return e instanceof InvalidTokenError ? e.message : "Unexpected error";
		}
		if (!path) return JSON.stringify(payload, null, 2);
		try {
			const result = applyJsonPath(payload, path);
			if (result === void 0) return `No value found at path: ${path}`;
			return stringify(result);
		} catch (e) {
			return e.message;
		}
	}
}] };

//#endregion
exports.InvalidTokenError = InvalidTokenError;
exports.plugin = plugin;