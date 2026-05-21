/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@fumik/shared"],
  // Explicitly define PostCSS plugins to avoid external config conflicts
  experimental: {
    // This option is typically for Next.js 11/12, but can prevent
    // external postcss.config.js files from being loaded.
    // However, it's better to explicitly set the postcss options.
    // disablePostcssPreset: true,
  },
  webpack: (config, { isServer }) => {
    // Find the existing PostCSS Loader
    const cssRule = config.module.rules.find(
      (rule) =>
        rule.test &&
        rule.test.toString().includes('css') &&
        Array.isArray(rule.use) &&
        rule.use.some((u) => u.loader && u.loader.includes('postcss-loader'))
    );

    if (cssRule) {
      cssRule.use = cssRule.use.map((u) => {
        if (u.loader && u.loader.includes('postcss-loader')) {
          return {
            ...u,
            options: {
              ...u.options,
              postcssOptions: {
                plugins: [
                  require('tailwindcss')({
                    config: './tailwind.config.ts', // Explicitly point to project's tailwind config
                  }),
                  require('autoprefixer'),
                ],
              },
            },
          };
        }
        return u;
      });
    }

    return config;
  },
  // Ensure we tell Vercel to look for custom build script
  // Vercel generally handles turbo workspaces, but this makes it explicit.
  output: 'standalone', // Needed for Next.js output in monorepos for Vercel
};

export default nextConfig;