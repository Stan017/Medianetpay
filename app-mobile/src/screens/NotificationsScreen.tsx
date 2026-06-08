import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParams } from '../navigation/AppNavigator';
import { useNotificationStore } from '../store/notificationStore';
import { AppNotification } from '../api/notifications';
import { Colors, Fonts } from '../theme';

const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'txn.approved': 'check-circle',
  'link.paid': 'link',
  'txn.failed': 'cancel',
  'txn.refunded': 'replay',
};

const ICON_COLOR: Record<string, string> = {
  'txn.approved': Colors.success,
  'link.paid': Colors.blue,
  'txn.failed': Colors.error,
  'txn.refunded': Colors.warning,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function groupByDate(items: AppNotification[]): { label: string; data: AppNotification[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const today: AppNotification[] = [];
  const thisWeek: AppNotification[] = [];
  const older: AppNotification[] = [];

  for (const item of items) {
    const t = new Date(item.created_at).getTime();
    if (t >= todayStart) today.push(item);
    else if (t >= weekStart) thisWeek.push(item);
    else older.push(item);
  }

  const groups: { label: string; data: AppNotification[] }[] = [];
  if (today.length) groups.push({ label: 'HOY', data: today });
  if (thisWeek.length) groups.push({ label: 'ESTA SEMANA', data: thisWeek });
  if (older.length) groups.push({ label: 'ANTES', data: older });
  return groups;
}

interface NotifItemProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}

function NotifItem({ item, onPress }: NotifItemProps) {
  const iconName = ICON_MAP[item.type] ?? 'notifications';
  const iconColor = ICON_COLOR[item.type] ?? Colors.gray;

  return (
    <TouchableOpacity
      style={[styles.item, item.read && styles.itemRead]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <MaterialIcons name={iconName} size={24} color={iconColor} style={styles.itemIcon} />
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, item.read && styles.itemTitleRead]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemBodyText} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        {!item.read && <View style={styles.dot} />}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleItemPress = async (item: AppNotification) => {
    if (!item.read) await markRead(item.id);
  };

  const groups = groupByDate(notifications);

  const renderContent = () => {
    if (notifications.length === 0) {
      return (
        <View style={styles.empty}>
          <MaterialIcons name="notifications-none" size={64} color={Colors.grayLight} />
          <Text style={styles.emptyText}>Sin notificaciones aún</Text>
        </View>
      );
    }

    const flatData: (string | AppNotification)[] = [];
    for (const group of groups) {
      flatData.push(group.label);
      flatData.push(...group.data);
    }

    return (
      <FlatList
        data={flatData}
        keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.orange} />
        }
        renderItem={({ item }) => {
          if (typeof item === 'string') {
            return <Text style={styles.groupLabel}>{item}</Text>;
          }
          return <NotifItem item={item} onPress={handleItemPress} />;
        }}
        contentContainerStyle={styles.list}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Leer todo</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.readAllBtn} />
        )}
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.navy,
  },
  readAllBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  readAllText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.orange,
  },
  list: {
    paddingBottom: 24,
  },
  groupLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    color: Colors.gray,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemRead: {
    backgroundColor: Colors.bg,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.navy,
    marginBottom: 2,
  },
  itemTitleRead: {
    fontFamily: Fonts.regular,
    color: Colors.gray,
  },
  itemBodyText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.gray,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
    gap: 6,
  },
  itemTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.grayLight,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.grayLight,
  },
});
