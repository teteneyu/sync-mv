import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/components/AudioPlayer.tsx",
    "src/components/BulkLyricsModal.tsx",
    "src/components/Canvas.tsx",
    "src/components/ShotListSidebar.tsx",
    "src/components/StoryCardNode.tsx",
    "src/components/Toolbar.tsx",
    "src/hooks/useStoryCards.ts",
    "src/hooks/useTapSync.ts",
    "src/utils/exportUtils.ts",
    "src/utils/LyricsLoader.ts",
  ]),
]);

export default eslintConfig;
