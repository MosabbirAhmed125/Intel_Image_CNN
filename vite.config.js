import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function serveOrtStaticPlugin() {
	return {
		name: "serve-ort-static",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const cleanUrl = req.url?.split("?")[0];
				if (cleanUrl && cleanUrl.startsWith("/ort/")) {
					const filePath = path.join(
						process.cwd(),
						"public",
						cleanUrl,
					);
					if (
						fs.existsSync(filePath) &&
						fs.statSync(filePath).isFile()
					) {
						const ext = path.extname(filePath);
						const mimeTypes = {
							".mjs": "application/javascript; charset=utf-8",
							".js": "application/javascript; charset=utf-8",
							".wasm": "application/wasm",
						};
						res.setHeader(
							"Content-Type",
							mimeTypes[ext] || "application/octet-stream",
						);
						fs.createReadStream(filePath).pipe(res);
						return;
					}
				}
				next();
			});
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss(), serveOrtStaticPlugin()],
	optimizeDeps: {
		exclude: ["onnxruntime-web"],
	},
});
