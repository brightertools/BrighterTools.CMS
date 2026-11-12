import { useCallback, useRef } from 'react'
import type { EditorState, LexicalEditor } from 'lexical'
import { $createParagraphNode, $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from '@lexical/list'
import { LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $generateHtmlFromNodes } from '@lexical/html'
import { $setBlocksType } from '@lexical/selection'
import './LexicalRichTextField.css'

export interface RichTextValue {
  format?: 'lexical'
  version?: 1
  json?: unknown
  html: string
  plainText: string
}

interface LexicalRichTextFieldProps {
  label: string
  value: RichTextValue | undefined
  onChange: (value: RichTextValue) => void
  basic?: boolean
}

function hasSerializedRoot(json: unknown): json is { root: unknown } {
  return typeof json === 'object' && json !== null && 'root' in json && Array.isArray((json as { root?: { children?: unknown[] } }).root?.children) && !!(json as { root: { children: unknown[] } }).root.children.length
}

function Toolbar({ basic = false }: { basic?: boolean }) {
  const [editor] = useLexicalComposerContext()

  const formatHeading = useCallback(
    (tag: 'h2' | 'h3') => {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(tag))
        }
      })
    },
    [editor],
  )

  const formatParagraph = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }, [editor])

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }, [editor])

  const insertLink = useCallback(() => {
    const url = window.prompt('Link URL')
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    }
  }, [editor])

  return (
    <div className="lexical-toolbar">
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
        <em>I</em>
      </button>
      <button type="button" onClick={formatParagraph}>
        ¶
      </button>
      <button hidden={basic} type="button" onClick={() => formatHeading('h2')}>
        H2
      </button>
      <button hidden={basic} type="button" onClick={() => formatHeading('h3')}>
        H3
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
        • List
      </button>
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
        1. List
      </button>
      <button hidden={basic} type="button" onClick={formatQuote}>
        " Quote
      </button>
      <button type="button" onClick={insertLink}>
        Link
      </button>
    </div>
  )
}

/**
 * initialConfig (including the hydrated editorState) is only read once, on mount — Lexical does
 * not support swapping editorState via prop updates. Callers that load `value` asynchronously
 * must not render this component until the initial value is known (gate on a loading flag), and
 * should `key={...}` it when switching between different documents.
 */
export function LexicalRichTextField({ label, value, onChange, basic = false }: LexicalRichTextFieldProps) {
  const initialConfig = useRef({
    namespace: 'bt-cms-editor',
    theme: {
      heading: { h2: 'lexical-h2', h3: 'lexical-h3' },
      list: { ul: 'lexical-ul', ol: 'lexical-ol', listitem: 'lexical-li' },
      link: 'lexical-link',
      quote: 'lexical-quote',
      text: { bold: 'lexical-bold', italic: 'lexical-italic' },
    },
    onError: (error: Error) => console.error(error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    editorState: hasSerializedRoot(value?.json) ? JSON.stringify(value.json) : undefined,
  }).current

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      editorState.read(() => {
        const plainText = $getRoot().getTextContent()
        const html = $generateHtmlFromNodes(editor, null)
        onChange({ format: 'lexical', version: 1, json: editorState.toJSON(), html, plainText })
      })
    },
    [onChange],
  )

  return (
    <div className="field">
      <label>{label}</label>
      <LexicalComposer initialConfig={initialConfig}>
        <Toolbar basic={basic} />
        <div className="lexical-editor-shell">
          <RichTextPlugin
            contentEditable={<ContentEditable className="lexical-content-editable" aria-label={label} />}
            placeholder={<div className="lexical-placeholder">Enter text…</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <OnChangePlugin onChange={handleChange} />
        </div>
      </LexicalComposer>
    </div>
  )
}
