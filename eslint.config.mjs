import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // node 环境全局变量
        ...globals.mocha, // mocha 测试框架全局变量
        /** 追加一些其他自定义全局规则 */
        // wx: true,
      },
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    rules: {
      'no-console': 0, // 禁用 console
      'no-unused-vars': 0, // 禁止出现未使用过的变量
      'no-async-promise-executor': 0, // 禁止使用异步函数作为 Promise executor
      'prefer-template': 'error', // 强制使用模板字符串而不是字符串拼接
      'template-curly-spacing': ['error', 'never'], // 强制在模板字符串中使用一致的间距
      'quotes': ['error', 'single'], // 强制使用单引号
    },
  },
  {
    ignores: ['node_modules'],
  },
  // ...其他配置
];
