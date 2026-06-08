import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParams } from '../navigation/AppNavigator';
import { useNotificationStore } from '../store/notificationStore';
import { Colors, Fonts } from '../theme';

export default function NotificationBell() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={styles.wrapper}
      activeOpacity={0.7}
    >
      <MaterialIcons name="notifications" size={26} color={Colors.white} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginRight: 4,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.white,
    lineHeight: 12,
  },
});
