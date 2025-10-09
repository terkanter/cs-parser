const esbuild = require("esbuild");
const { nodeExternalsPlugin } = require("esbuild-node-externals");
const path = require("node:path");

async function build() {
  try {
    console.log("🚀 Starting build process...");

    const result = await esbuild.build({
      entryPoints: ["src/index.ts"],
      outdir: "dist",
      platform: "node",
      target: "node22",
      format: "cjs",
      bundle: true,
      sourcemap: true,
      minify: false,
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
      plugins: [
        nodeExternalsPlugin({
          // Bundle workspace packages
          allowList: ["@repo/prisma", "@repo/api-errors", "@repo/api-core", "@repo/steam-api"],
        }),
      ],
      external: ["@dotenvx/dotenvx"],
      metafile: true,
      outbase: "src",
    });

    if (result.metafile) {
      const info = await esbuild.analyzeMetafile(result.metafile);
      console.log("📊 Build analysis:", info);
    }

    console.log("✅ Build completed successfully!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

build();
