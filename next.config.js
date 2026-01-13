/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverComponentsExternalPackages: ["@libsql/client", "libsql"],
    },
};

module.exports = nextConfig;
