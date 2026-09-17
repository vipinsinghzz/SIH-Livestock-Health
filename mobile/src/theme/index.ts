/**
 * Livestock Saathi - Theme Foundation Export
 */

import { colors } from './colors';
import { typography } from './typography';
import { spacing, radii, shadows } from './spacing';

export const theme = {
  colors: colors.light,
  colorsDark: colors.dark,
  typography,
  spacing,
  radii,
  shadows,
};

export { colors, typography, spacing, radii, shadows };
export type Theme = typeof theme;
export default theme;
