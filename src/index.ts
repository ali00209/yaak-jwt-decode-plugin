import type { PluginDefinition } from "@yaakapp/api";

export class InvalidTokenError extends Error {}
InvalidTokenError.prototype.name = "InvalidTokenError";

function b64DecodeUnicode(str: string) {
  return decodeURIComponent(
    atob(str).replace(/(.)/g, (m, p) => {
      let code = (p as string).charCodeAt(0).toString(16).toUpperCase();
      if (code.length < 2) code = "0" + code;
      return "%" + code;
    }),
  );
}

function base64UrlDecode(str: string) {
  let output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw new Error("base64 string is not of the correct length");
  }
  try {
    return b64DecodeUnicode(output);
  } catch {
    return atob(output);
  }
}

function jwtDecode<T>(token: string, options?: { header?: boolean }): T {
  if (typeof token !== "string") {
    throw new InvalidTokenError("Invalid token specified: must be a string");
  }
  const pos = options?.header === true ? 0 : 1;
  const part = token.split(".")[pos];
  if (typeof part !== "string") {
    throw new InvalidTokenError(
      `Invalid token specified: missing part #${pos + 1}`,
    );
  }
  let decoded: string;
  try {
    decoded = base64UrlDecode(part);
  } catch (e) {
    throw new InvalidTokenError(
      `Invalid token specified: invalid base64 for part #${pos + 1} (${(e as Error).message})`,
    );
  }
  try {
    return JSON.parse(decoded) as T;
  } catch (e) {
    throw new InvalidTokenError(
      `Invalid token specified: invalid json for part #${pos + 1} (${(e as Error).message})`,
    );
  }
}

// Minimal JSONPath evaluator — supports dot notation and array indices
// e.g. $.sub  $.data.login  $.roles[0]  $  (root)
function applyJsonPath(obj: unknown, path: string): unknown {
  const trimmed = path.trim();

  // "$" alone → return the whole object
  if (trimmed === "$") return obj;

  // Must start with "$."
  if (!trimmed.startsWith("$.")) {
    throw new Error(`JSONPath must start with "$." (got: ${trimmed})`);
  }

  const parts = trimmed
    .slice(2) // remove "$."
    .split(".")
    .flatMap((segment) => {
      // Split array indices out of each segment: "roles[0]" → ["roles", "0"]
      const matches = segment.match(/^([^\[]+)(.*)$/);
      if (!matches) return [segment];
      const [, key, brackets] = matches;
      const indices = [...brackets.matchAll(/\[(\d+)\]/g)].map((m) => m[1]);
      return key ? [key, ...indices] : indices;
    });

  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stringify(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export const plugin: PluginDefinition = {
  templateFunctions: [
    {
      name: "jwt.decode",
      description:
        "Decode a JWT payload, with optional JSONPath filter (e.g. $.data.login)",
      args: [
        {
          type: "text",
          name: "token",
          label: "JWT Token",
          placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        {
          type: "text",
          name: "path",
          label: "JSONPath (optional)",
          placeholder: "$.data.login",
        },
      ],
      async onRender(_ctx, args) {
        const token = (args.values.token as string | undefined)?.trim();
        const path = (args.values.path as string | undefined)?.trim();

        if (!token) return null;

        let payload: Record<string, unknown>;
        try {
          payload = jwtDecode<Record<string, unknown>>(token);
        } catch (e) {
          return e instanceof InvalidTokenError
            ? e.message
            : "Unexpected error";
        }

        if (!path) {
          return JSON.stringify(payload, null, 2);
        }

        try {
          const result = applyJsonPath(payload, path);
          if (result === undefined) return `No value found at path: ${path}`;
          return stringify(result);
        } catch (e) {
          return (e as Error).message;
        }
      },
    },
  ],
};
