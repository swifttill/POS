/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client"
  ],
};

module.exports = nextConfig;
