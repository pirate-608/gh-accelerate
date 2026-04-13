// 配置需要代理的域名
const GITHUB_DOMAINS = [
    "github.com",
    "api.github.com",
    "raw.githubusercontent.com",
    "objects.githubusercontent.com",
    "codeload.github.com"
];

// 代理主函数
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 处理根路径访问，返回简单说明
        if (url.pathname === "/" && url.search === "") {
            return new Response(`
        <h1>GitHub 代理服务</h1>
        <p>使用方法：在 GitHub 链接前加上本域名即可</p>
        <p>示例：<br>
        - https://${url.host}/github.com/username/repo<br>
        - https://${url.host}/raw.githubusercontent.com/username/repo/branch/file
        </p>
      `, {
                headers: { "Content-Type": "text/html;charset=utf-8" }
            });
        }

        // 解析目标 URL
        let targetUrl = url.pathname.slice(1) + url.search + url.hash;

        // 自动补全协议
        if (!targetUrl.startsWith("http")) {
            // 检查是否是我们要代理的域名
            const isGithubDomain = GITHUB_DOMAINS.some(domain =>
                targetUrl.startsWith(domain)
            );

            targetUrl = isGithubDomain ? `https://${targetUrl}` : `https://github.com/${targetUrl}`;
        }

        try {
            // 创建新的请求
            const newRequest = new Request(targetUrl, {
                method: request.method,
                headers: request.headers,
                body: request.body,
                redirect: "manual"
            });

            // 发送请求并获取响应
            const response = await fetch(newRequest);

            // 处理重定向
            if (response.redirected) {
                const location = response.headers.get("Location");
                if (location && GITHUB_DOMAINS.some(d => location.includes(d))) {
                    const newLocation = location.replace(/^https?:\/\//, `${url.protocol}//${url.host}/`);
                    return new Response(null, {
                        status: response.status,
                        headers: { ...response.headers, Location: newLocation }
                    });
                }
            }

            // 构造响应，修改部分头信息
            const headers = new Headers(response.headers);
            headers.set("Access-Control-Allow-Origin", "*");

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers
            });
        } catch (e) {
            return new Response(`代理错误: ${e.message}`, { status: 500 });
        }
    }
};