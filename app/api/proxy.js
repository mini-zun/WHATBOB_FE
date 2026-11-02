import { Buffer } from "node:buffer";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const base = process.env.BACKEND_API_URL;

  if (!base) {
    return res.status(500).json({
      message: "백엔드 주소 설정이 없습니다.",
    });
  }

  const path = req.query.path;

  if (
    typeof path !== "string" ||
    !path ||
    path.split("/").some((part) => part === "." || part === "..") ||
    /[\\?#%]/.test(path)
  ) {
    return res.status(400).json({
      message: "잘못된 API 경로입니다.",
    });
  }

  try {
    const target = new URL(base);
    target.pathname = `/api/${path}`;
    target.search = "";
    target.hash = "";

    // state 등 API 요청의 쿼리 파라미터 전달
    for (const [key, value] of Object.entries(req.query)) {
      if (key === "path") continue;

      const values = Array.isArray(value) ? value : [value];

      for (const item of values) {
        if (item !== undefined) {
          target.searchParams.append(key, item);
        }
      }
    }

    const headers = {
      Accept: "application/json",
    };

    // 로그인 이후 API 호출에 필요한 JWT 전달
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const options = {
      method: req.method,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    };

    // JSON 요청 본문 전달
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.body != null
    ) {
      headers["Content-Type"] = "application/json";
      options.body =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);
    }

    const upstream = await fetch(target, options);

    res.statusCode = upstream.status;
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json"
    );

    if (req.method === "HEAD" || upstream.status === 204) {
      return res.end();
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    return res.end(body);
  } catch {
    return res.status(502).json({
      message: "백엔드 연결에 실패했습니다.",
    });
  }
}