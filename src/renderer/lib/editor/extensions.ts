import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';

// Полный набор расширений TipTap для текстового overlay (§4.4).
//
// StarterKit (v3) покрывает: Document, Paragraph, Text, Heading, Bold, Italic,
// Strike, Code, CodeBlock, Blockquote, BulletList, OrderedList, ListItem,
// HardBreak, History, HorizontalRule, Dropcursor, Gapcursor, а также Link и
// Underline — поэтому отдельные пакеты Link/Underline НЕ подключаем (иначе
// дубль имён расширений). Link настраиваем через опции StarterKit.
//
// TextStyleKit (TipTap v3) — собранный набор inline-стилей через <span>:
// TextStyle + FontSize + FontFamily + Color + BackgroundColor + LineHeight.
export const tiptapExtensions = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
];
