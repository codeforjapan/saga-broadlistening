import { BRAND_THEMES } from "./brand.themes";
import type {
  BrandThemes,
  Theme,
  ThemeName,
  ThemeOverride,
} from "./theme-types";

/** override に書かれていない値を base で補う */
export function mergeTheme(base: Theme, override: ThemeOverride): Theme {
  return {
    ...base,
    ...override,
    colors: { ...base.colors, ...override.colors },
  };
}

/** テーマのすべての値を返す。`default` 以外は、書かれていない値を `default` で補う */
export function resolveTheme(
  name: ThemeName,
  themes: BrandThemes = BRAND_THEMES
): Theme {
  return name === "default"
    ? themes.default
    : mergeTheme(themes.default, themes[name]);
}
