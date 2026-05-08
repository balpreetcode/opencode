#!/usr/bin/env node

import http from "node:http";
import { Readable } from "node:stream";

const port = Number.parseInt(process.env.PORT || "8787", 10);
const routeSpec = process.env.OPENCODE_PROXY_ROUTES || [
  "anthropic=https://api.anthropic.com",
  "copilot=https://api.githubcopilot.com",
  "gemini=https://generativelanguage.googleapis.com",
  "groq=https://api.groq.com/openai/v1",
  "openai=https://api.openai.com/v1",
  "openrouter=https://openrouter.ai/api/v1",
  "xai=https://api.x.ai/v1",
].join(",");

const routes = new Map(
  routeSpec
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf("=");
      if (separator === -1) {
        throw new Error(`Invalid route "${entry}". Expected name=https://upstream/base`);
      }
      const name = entry.slice(0, separator).trim().replace(/^\/+|\/+$/g, "");
      const upstream = entry.slice(separator + 1).trim().replace(/\/+$/g, "");
      if (!name || !upstream) {
        throw new Error(`Invalid route "${entry}". Expected name=https://upstream/base`);
      }
      return [name, upstream];
    }),
);

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function responseJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function targetFor(req) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const [, routeName, ...rest] = requestUrl.pathname.split("/");
  const upstreamBase = routes.get(routeName);
  if (!upstreamBase) {
    return { requestUrl, routeName, upstreamUrl: null };
  }

  const upstreamUrl = new URL(upstreamBase + "/" + rest.join("/"));
  upstreamUrl.search = requestUrl.search;
  return { requestUrl, routeName, upstreamUrl };
}

function filteredHeaders(headers, upstreamUrl) {
  const nextHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || hopByHopHeaders.has(key.toLowerCase())) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        nextHeaders.append(key, item);
      }
      continue;
    }
    nextHeaders.set(key, value);
  }
  nextHeaders.set("host", upstreamUrl.host);
  return nextHeaders;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    responseJson(res, 200, { ok: true, routes: [...routes.keys()] });
    return;
  }

  const { routeName, upstreamUrl } = targetFor(req);
  if (!upstreamUrl) {
    responseJson(res, 404, {
      error: "unknown_route",
      route: routeName || "",
      availableRoutes: [...routes.keys()],
    });
    return;
  }

  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: filteredHeaders(req.headers, upstreamUrl),
      body: hasBody ? req : undefined,
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    });

    const responseHeaders = {};
    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (!hopByHopHeaders.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    }
    res.writeHead(upstreamResponse.status, responseHeaders);
    if (upstreamResponse.body) {
      Readable.fromWeb(upstreamResponse.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    responseJson(res, 502, {
      error: "proxy_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`opencode provider proxy listening on http://127.0.0.1:${port}`);
  for (const [name, upstream] of routes.entries()) {
    console.log(`/${name} -> ${upstream}`);
  }
});
