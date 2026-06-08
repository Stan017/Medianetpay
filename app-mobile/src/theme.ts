/**
 * Design tokens compartidos — alineados con el portal desktop.
 * Usar en TODOS los screens y componentes.
 */

export const Colors = {
  navy:    '#003358',
  blue:    '#1a56db',
  orange:  '#F89937',
  bg:      '#f0f4f8',
  white:   '#ffffff',
  border:  '#e2e8f0',
  gray:    '#6b7280',
  grayLight: '#94a3b8',
  success: '#16a34a',
  error:   '#dc2626',
  warning: '#d97706',
  cardBg:  '#ffffff',
};

export const Fonts = {
  regular:    'Outfit_400Regular',
  semibold:   'Outfit_600SemiBold',
  bold:       'Outfit_700Bold',
  extrabold:  'Outfit_800ExtraBold',
  black:      'Outfit_900Black',
};

/** Sombra suave estilo desktop */
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 3,
};

/** Sombra más pronunciada para cards principales */
export const shadowMd = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 16,
  elevation: 5,
};
