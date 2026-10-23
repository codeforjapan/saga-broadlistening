/**
 * seed 投入で繰り返し現れる
 * 「PostgREST を実行 → 失敗なら fail fast → 件数をログ」の共通化。
 *
 * PostgREST のクエリビルダーは await されるまでリクエストを送らないため、
 * 組み立て済みのクエリを引数で受け取っても実行順序は変わらない。
 */

/** 行を返すクエリ（`.select()` 付き）の結果の最小形 */
type RowsResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/** 行を返さないクエリ（`.select()` なしの INSERT 等）の結果の最小形 */
type VoidResult = {
  error: { message: string } | null;
};

/** サマリーに出す 1 ステップ分の投入件数 */
type SeedStepCount = {
  label: string;
  count: number;
};

/**
 * 開始ログの指定方法。
 * 通常は絵文字だけを渡し、既定の `${emoji} Inserting ${label}...` を使う。
 * 絵文字の表示幅の調整や「Inserting」以外の動詞が必要なステップだけ、
 * `startMessage` で全文を指定する。
 */
type StartLog =
  | { emoji: string; startMessage?: never }
  | { emoji?: never; startMessage: string };

type InsertSeedOptions<T> = StartLog & {
  /** 完了ログとサマリーで使う表示名（例: `tags`） */
  label: string;
  /** 実行前の PostgREST クエリ */
  query: PromiseLike<RowsResult<T>>;
};

/**
 * 行を返すクエリを実行し、失敗時は `errorLabel` 入りのエラーで fail fast する。
 * ログは出さないので、投入ログを共有できないステップから使う。
 */
export async function expectRows<T>(
  errorLabel: string,
  query: PromiseLike<RowsResult<T>>
): Promise<T[]> {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(`Failed to ${errorLabel}: ${error?.message}`);
  }

  return data;
}

/** 行を返さないクエリを実行し、失敗時は fail fast する */
export async function expectOk(
  errorLabel: string,
  query: PromiseLike<VoidResult>
): Promise<void> {
  const { error } = await query;

  if (error) {
    throw new Error(`Failed to ${errorLabel}: ${error.message}`);
  }
}

/**
 * ラベル（小文字）をサマリーの見出し（Title Case）へ変換する。
 * 例: `policies-tags relations` → `Policies-Tags Relations`
 */
function toSummaryLabel(label: string): string {
  return label.replace(
    /[a-z]+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1)
  );
}

/**
 * 投入ステップの実行と、サマリー用の件数の記録をまとめて受け持つ。
 * 件数を手で書き写さずにサマリーを組み立てるため、記録は投入順に貯める。
 */
export function createSeedReporter() {
  const steps: SeedStepCount[] = [];

  return {
    /**
     * 開始ログ → INSERT → 完了ログ、までを実行して投入した行を返す。
     * 行の型はクエリから推論されるので、呼び出し側でそのまま使える。
     */
    async insert<T>({
      emoji,
      label,
      startMessage,
      query,
    }: InsertSeedOptions<T>): Promise<T[]> {
      console.log(startMessage ?? `${emoji} Inserting ${label}...`);

      const rows = await expectRows(`insert ${label}`, query);

      console.log(`✅ Inserted ${rows.length} ${label}`);
      steps.push({ label, count: rows.length });

      return rows;
    },

    /** insert() を使えないステップの件数をサマリーへ記録する */
    record(label: string, count: number): void {
      steps.push({ label, count });
    },

    /** 記録した件数を投入順に出力する */
    printSummary(): void {
      console.log("\n📊 Summary:");
      for (const { label, count } of steps) {
        console.log(`  ${toSummaryLabel(label)}: ${count}`);
      }
    },
  };
}

/**
 * NOT NULL かつ DEFAULT を持つカラムの取りこぼしを防ぐ。
 *
 * PostgREST の一括 INSERT は、行ごとにキーが異なると不足キーを **NULL で埋める**
 * （カラムを省略したときの DEFAULT にはならない）。そのため一部の行にしか
 * 書いていない NOT NULL カラムがあると "violates not-null constraint" で落ちる。
 * 行ごとに書き漏らしても平気なように、既定値をここでまとめて補う。
 */
export function withDefaults<T extends object, D extends Partial<T>>(
  defaults: D,
  rows: T[]
): T[] {
  return rows.map((row) => ({ ...defaults, ...row }));
}
