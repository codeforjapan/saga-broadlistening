/**
 * Rubyful V2 Client
 * ふりがな表示を管理するクライアントユーティリティ
 */

import { getRubyEnabledFromStorage, setRubyEnabledToStorage } from "./storage";

// DOM操作用の定数
const SELECTORS = {
  RUBYFUL_RT: ".rubyful-rt",
} as const;

const CLASSES = {
  HIDDEN: "hidden",
} as const;

class RubyfulClient {
  private isEnabled = false;

  /**
   * ルビON状態を <html> の data 属性へ反映する。
   * ルビはクライアント側で後から注入されるため、行間の切り替え（D-16:
   * 本文1.8 → ルビ表示時1.9）は CSS 側でこの属性を見て行う（styles.css）
   */
  private syncDocumentState(enabled: boolean): void {
    if (typeof document === "undefined") return;
    document.documentElement.toggleAttribute("data-ruby-enabled", enabled);
  }

  /**
   * ルビ要素の表示状態を更新
   */
  private updateRubyVisibility(visible: boolean): void {
    const action = visible ? "remove" : "add";

    // Rubyful V2で自動生成されたルビ
    document.querySelectorAll(SELECTORS.RUBYFUL_RT).forEach((element) => {
      element.classList[action](CLASSES.HIDDEN);
    });
  }

  /**
   * 新しく追加されたルビ要素を処理
   */

  /**
   * ルビを表示
   */
  show() {
    this.isEnabled = true;
    setRubyEnabledToStorage(true);
    this.syncDocumentState(true);
    this.updateRubyVisibility(true);
  }

  /**
   * ルビを非表示
   */
  hide() {
    this.isEnabled = false;
    setRubyEnabledToStorage(false);
    this.syncDocumentState(false);
    this.updateRubyVisibility(false);
  }

  /**
   * ルビの表示状態を切り替え
   */
  toggle() {
    if (this.isEnabled) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 現在の表示状態を取得
   */
  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * LocalStorageから表示状態を取得
   */
  getIsEnabledFromStorage(): boolean {
    return getRubyEnabledFromStorage();
  }

  /**
   * ページ読み込み時に LocalStorage の設定を document へ反映する。
   * トグルはページリロードを伴うため、初期反映はここで行えば十分
   */
  applyStoredStateToDocument(): void {
    this.syncDocumentState(this.getIsEnabledFromStorage());
  }
}

// シングルトンインスタンスをexport
export const rubyfulClient = new RubyfulClient();

// 関連コンポーネントもexport
export { RubyfulInitializer } from "./initializer";
export { RubyToggle } from "./ruby-toggle";
