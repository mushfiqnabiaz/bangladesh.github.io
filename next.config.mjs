/** @type {import('next').NextConfig} */
const basePath = "/bangladesh.github.io";

const nextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  images: {
    unoptimized: true
  },
  output: "export",
  trailingSlash: true,
  typedRoutes: true
};

export default nextConfig;
