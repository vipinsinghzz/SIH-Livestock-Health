import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export type IconName =
  | 'arrow-back'
  | 'mail'
  | 'phone'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'person'
  | 'tractor'
  | 'stethoscope'
  | 'shield'
  | 'location'
  | 'checkmark'
  | 'refresh'
  | 'alert'
  | 'card'
  | 'business'
  | 'bell'
  | 'scan'
  | 'plus'
  | 'home'
  | 'cow'
  | 'cow_standing'
  | 'camera'
  | 'goat'
  | 'sheep'
  | 'buffalo'
  | 'vaccine'
  | 'clipboard'
  | 'chat'
  | 'chevron-right'
  | 'tag'
  | 'grid'
  | 'clock';

const iconSources: Record<IconName, any> = {
  'arrow-back': require('../../assets/icons/arrow-back.png'),
  mail: require('../../assets/icons/mail.png'),
  phone: require('../../assets/icons/phone.png'),
  lock: require('../../assets/icons/lock.png'),
  eye: require('../../assets/icons/eye.png'),
  'eye-off': require('../../assets/icons/eye-off.png'),
  person: require('../../assets/icons/person.png'),
  tractor: require('../../assets/icons/tractor.png'),
  stethoscope: require('../../assets/icons/stethoscope.png'),
  shield: require('../../assets/icons/shield.png'),
  location: require('../../assets/icons/location.png'),
  checkmark: require('../../assets/icons/checkmark.png'),
  refresh: require('../../assets/icons/refresh.png'),
  alert: require('../../assets/icons/alert.png'),
  card: require('../../assets/icons/card.png'),
  business: require('../../assets/icons/business.png'),
  bell: require('../../assets/icons/bell_minimal.png'),
  scan: require('../../assets/icons/scan.png'),
  camera: require('../../assets/icons/camera.png'),
  plus: require('../../assets/icons/plus.png'),
  home: require('../../assets/icons/home.png'),
  cow: require('../../assets/icons/cow.png'),
  cow_standing: require('../../assets/icons/cow_standing.png'),
  goat: require('../../assets/icons/goat.png'),
  sheep: require('../../assets/icons/sheep.png'),
  buffalo: require('../../assets/icons/buffalo.png'),
  vaccine: require('../../assets/icons/vaccine.png'),
  clipboard: require('../../assets/icons/clipboard.png'),
  chat: require('../../assets/icons/chat.png'),
  'chevron-right': require('../../assets/icons/chevron-right.png'),
  tag: require('../../assets/icons/tag.png'),
  grid: require('../../assets/icons/grid.png'),
  clock: require('../../assets/icons/clock.png'),
};

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export function AppIcon({ name, size = 20, color, style }: AppIconProps) {
  const source = iconSources[name];
  if (!source) return null;

  return (
    <Image
      source={source}
      style={[
        { width: size, height: size },
        color ? { tintColor: color } : undefined,
        style,
      ]}
      resizeMode="contain"
    />
  );
}

export default AppIcon;
