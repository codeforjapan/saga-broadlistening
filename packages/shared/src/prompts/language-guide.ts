/**
 * 中立的な言葉づかい（interview-language-guide の公開版）を、プロンプトの後ろにつなげる。
 * AIインタビュー（人物像の後ろ）と、トップページ・施策チャット（システムプロンプトの末尾）で使う
 */
export function appendLanguageGuide(prompt: string, languageGuide: string): string {
  return `${prompt.trimEnd()}\n\n${languageGuide.trim()}`;
}
