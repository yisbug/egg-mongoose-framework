/**
 * @type {import('prettier').Config}
 * @see https://www.prettier.cn/docs/options.html
 */
export default {
  trailingComma: 'all', // 在多行逗号分隔的语法结构中，尽可能打印尾随逗号。
  singleQuote: true, // 使用单引号代替双引号。
  semi: true, // 在语句末尾打印分号。
  printWidth: 80, // 指定打印换行的行长度。
  arrowParens: 'always', // 在唯一的箭头函数参数周围加上括号。
  proseWrap: 'always', // 如果文本超出打印宽度，则换行。
  endOfLine: 'lf', // 使用 \n 作为换行符。
  experimentalTernaries: false, // 使用好奇三元组，在条件后面加上问号。
  tabWidth: 2, // 指定每个缩进级别的空格数。
  useTabs: false, // 使用制表符而不是空格来缩进行。
  quoteProps: 'consistent', // 如果对象中至少有一个属性需要引号，则将所有属性都加引号。
  jsxSingleQuote: false, // 在 JSX 中使用单引号而不是双引号。
  bracketSpacing: true, // 打印对象文字中括号之间的空格。
  bracketSameLine: false, // 将>多行 HTML（HTML、JSX、Vue、Angular）元素的放在最后一行的末尾，而不是单独放在下一行（不适用于自闭合元素）。
  singleAttributePerLine: false, // 在 HTML、Vue 和 JSX 中强制每行使用单个属性。
  embeddedLanguageFormatting: 'auto', // 控制 Prettier 是否格式化文件中嵌入的引用代码。
};
