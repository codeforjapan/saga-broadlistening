import { EXTERNAL_UID_FRAGMENT_PARAMS } from "@mirai-gikai/shared/external-identity/providers";
import { PENDING_UID_FRAGMENT_WINDOW_KEY } from "../constants";

/**
 * root layout の <head> に同期的に埋め込むスクリプトを組み立てる。
 *
 * React のハイドレーションや GA（page_view に location.href を載せる）より前に、
 * `#uid=...` を window のプロパティへ退避して URL から取り除く。検証と送信は
 * ExternalUidCapture（TS 側）が行うので、ここは「退避と除去」だけに留める。
 *
 * 文字列として埋め込むため依存は持たず、パラメータ名と保存先のキーだけを差し込む。
 * 例外は握りつぶす：このスクリプトの失敗でページ表示を壊さないため（UID は受け取れないだけ）。
 */
export function buildEarlyCaptureScript(): string {
  const params = JSON.stringify(EXTERNAL_UID_FRAGMENT_PARAMS);
  const windowKey = JSON.stringify(PENDING_UID_FRAGMENT_WINDOW_KEY);

  return `(function(){
  try {
    var h = location.hash;
    if (!h || h.indexOf("=") < 0) return;
    var p = new URLSearchParams(h.slice(1));
    var keys = ${params};
    var hit = false;
    for (var i = 0; i < keys.length; i++) {
      if (p.has(keys[i])) { hit = true; p.delete(keys[i]); }
    }
    if (!hit) return;
    window[${windowKey}] = h;
    var rest = p.toString();
    history.replaceState(history.state, "", location.pathname + location.search + (rest ? "#" + rest : ""));
  } catch (e) {}
})();`;
}

/** 入力が固定なので起動時に1度だけ組み立てる */
export const EARLY_CAPTURE_SCRIPT = buildEarlyCaptureScript();
