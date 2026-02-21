import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pagesでホスティングする場合、もしリポジトリ名がURLに含まれるなら(例: https://username.github.io/repo-name)
  // 以下のbasePathのコメントアウトを外し、'repo-name'部分を実際のリポジトリ名に変更してください。
  basePath: '/super-mv-maker',
};

export default nextConfig;
