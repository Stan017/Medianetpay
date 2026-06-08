import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParams } from '../navigation/AppNavigator';
import { useNotificationStore } from '../store/notificationStore';
import { Colors, Fonts } from '../theme';

const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'txn.approved': 'check-circle',
  'link.paid': 'link',
  'txn.failed': 'cancel',
  'txn.refunded': 'replay',
};

const TOAST_HEIGHT = 80;

export default function ToastBanner() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { toastQueue, dismissToast } = useNotificationStore();
  const slideAnim = useRef(new Animated.Value(-TOAST_HEIGHT)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard: evita callbacks de animación después de desmontar (Fabric race condition)
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Detener cualquier animación en vuelo antes de desmontar
      slideAnim.stopAnimation();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const current = toastQueue[0];

  useEffect(() => {
    if (!current) return;

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();

    // Auto-dismiss after 4s
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) slideOut();
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current?.id]);

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: -TOAST_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!mountedRef.current) return;
      if (finished) {
        // Resetear posición ANTES de dismissToast para que el siguiente
        // toast arranque desde arriba sin flash visual
        slideAnim.setValue(-TOAST_HEIGHT);
        dismissToast();
      }
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    slideOut();
    navigation.navigate('Notifications');
  };

  if (!current) return null;

  const iconName = ICON_MAP[current.type] ?? 'notifications';
  const isFailed = current.type === 'txn.failed';

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <TouchableOpacity
        style={[styles.banner, isFailed && styles.bannerFailed]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <MaterialIcons name={iconName} size={26} color={Colors.white} style={styles.icon} />
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
          <Text style={styles.body} numberOfLines={1}>{current.body}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 12,
    paddingTop: 52, // below status bar
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bannerFailed: {
    backgroundColor: Colors.error,
  },
  icon: {
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.white,
    marginBottom: 2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
});
