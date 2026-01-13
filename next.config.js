/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverComponentsExternalPackages: ["@libsql/client", "libsql", "@prisma/adapter-libsql"],
    },
};

module.exports = nextConfig;
