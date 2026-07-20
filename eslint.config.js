import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

// FSD 레이어 의존 방향: shared → entities → features → widgets → pages → app
// 각 레이어는 자기보다 "위" 레이어를 import 할 수 없다.
const FSD_LAYERS = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']

function forbiddenUpperLayers(layer) {
  const upper = FSD_LAYERS.slice(FSD_LAYERS.indexOf(layer) + 1)
  return upper.map((l) => ({
    group: [`@/${l}/*`, `@/${l}`],
    message:
      `FSD 위반: ${layer} 레이어는 상위 레이어(${l})를 import 할 수 없습니다. ` +
      `공통으로 필요하면 더 아래 레이어로 내리세요. (docs/frontend-guidelines.md)`,
  }))
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    plugins: {
      prettier,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // ── 리팩터링 시그널 (docs/frontend-guidelines.md) ──
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'warn',
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'max-depth': ['warn', 4],
      complexity: ['warn', 15],
      'no-nested-ternary': 'warn',
    },
  },

  // ── FSD 레이어 경계 강제 ──
  ...FSD_LAYERS.map((layer) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', { patterns: forbiddenUpperLayers(layer) }],
    },
  })),

  // shared/lib/api.ts: 토큰 조회를 위해 entities/user 참조 (파일 내 주석으로 명시된 예외)
  {
    files: ['src/shared/lib/api.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // 도면 캔버스는 Konva 렌더 분기가 많아 길이 제한 예외
  {
    files: ['src/widgets/diagram-map/DiagramMap.tsx'],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off' },
  },
])
