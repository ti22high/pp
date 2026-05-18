import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Link } from '@tiptap/extension-link';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';

// Полный набор расширений TipTap для текстового overlay (§4.4).
//
// StarterKit покрывает: Document, Paragraph, Text, Heading, Bold, Italic,
// Strike, Code, CodeBlock, Blockquote, BulletList, OrderedList, ListItem,
// HardBreak, History, HorizontalRule, Dropcursor, Gapcursor.
//
// TextStyleKit (TipTap v3) — собранный набор inline-стилей через <span>:
// TextStyle + FontSize + FontFamily + Color + BackgroundColor + LineHeight.
// Поэтому отдельных пакетов FontSize/LineHeight не нужно — всё через него.
export const tiptapExtensions = [
  StarterKit,
  TextStyleKit,
  Link.configure({ openOnClick: false, autolink: true }),
  Highlight.configure({ multicolor: true }),
  Underline,
  Subscript,
  Superscript,
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
];
