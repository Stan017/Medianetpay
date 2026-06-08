import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { listTransactions, getAnalyticsSummary, type Transaction, type AnalyticsSummary } from '../api/transactions';
import { Colors, Fonts, shadow, shadowMd } from '../theme';
import type { RootStackParams } from '../navigation/AppNavigator';
import NotificationBell from '../components/NotificationBell';
import ToastBanner from '../components/ToastBanner';
import { useNotificationPolling } from '../hooks/useNotificationPolling';

type Nav = NativeStackNavigationProp<RootStackParams>;

function todayISO(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}
function statusColor(s: string) {
  if (s === 'completed') return Colors.success;
  if (s === 'failed' || s === 'reversed') return Colors.error;
  return Colors.warning;
}
function statusLabel(s: string) {
  return ({ completed: 'Aprobado', failed: 'Rechazado', pending: 'Pendiente', processing: 'Procesando', reversed: 'Revertido', refunded: 'Reembolsado' })[s] ?? s;
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { merchant, logout } = useAuthStore();
  useNotificationPolling();

  const [summary, setSummary]       = useState<AnalyticsSummary | null>(null);
  const [transactions, setTxns]     = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sum, txns] = await Promise.all([
        getAnalyticsSummary(todayISO()),
        listTransactions({ page_size: 2 }),
      ]);
      setSummary(sum);
      setTxns(txns.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Toast de notificaciones — flotante sobre todo el contenido */}
      <ToastBanner />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Bienvenido de vuelta</Text>
          <Text style={styles.headerName} numberOfLines={1}>{merchant?.business_name}</Text>
        </View>
        <View style={styles.headerRight}>
          {merchant?.test_mode && (
            <View style={styles.testBadge}><Text style={styles.testBadgeText}>PRUEBA</Text></View>
          )}
          <NotificationBell />
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', style: 'destructive', onPress: logout },
            ])}
          >
            <MaterialIcons name="logout" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.orange} />}
        ListHeaderComponent={
          <>
            {/* Stats */}
            {loading ? (
              <ActivityIndicator color={Colors.orange} style={{ marginVertical: 24 }} />
            ) : summary ? (
              <>
                {/* Total cobrado — tarjeta principal */}
                <View style={[styles.statMain, shadowMd]}>
                  <Text style={styles.statMainLabel}>Total cobrado hoy</Text>
                  <Text style={styles.statMainValue}>
                    ${parseFloat(summary.total_amount_completed).toFixed(2)}
                  </Text>
                  <Text style={styles.statMainCurrency}>USD</Text>
                </View>

                {/* Cobros + Rechazados */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, shadowMd]}>
                    <Text style={styles.statValue}>{summary.completed_count}</Text>
                    <Text style={styles.statLabel}>Cobros aprobados</Text>
                  </View>
                  <View style={[styles.statCard, shadowMd]}>
                    <Text style={[styles.statValue, { color: Colors.error }]}>{summary.failed_count}</Text>
                    <Text style={styles.statLabel}>Rechazados</Text>
                  </View>
                </View>
              </>
            ) : null}

            {/* Botones de acción */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnMain]} onPress={() => nav.navigate('Charge')} activeOpacity={0.88}>
                <View style={styles.actionIcon}>
                  <MaterialIcons name="qr-code-2" size={26} color={Colors.white} />
                </View>
                <Text style={styles.actionLabel}>Cobrar</Text>
                <Text style={styles.actionSub}>Link / QR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPos]} onPress={() => nav.navigate('SoftPOS')} activeOpacity={0.88}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.orange }]}>
                  <MaterialIcons name="contactless" size={26} color={Colors.white} />
                </View>
                <Text style={styles.actionLabel}>Datáfono</Text>
                <Text style={styles.actionSub}>Tarjeta NFC</Text>
              </TouchableOpacity>
            </View>

            {/* Título lista */}
            <Text style={styles.sectionTitle}>Recientes</Text>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="receipt-long" size={40} color={Colors.grayLight} />
              <Text style={styles.emptyText}>Sin transacciones aún</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.txnRow, shadow]}>
            <View style={[styles.txnDot, { backgroundColor: statusColor(item.status) }]} />
            <View style={styles.txnInfo}>
              <Text style={styles.txnDesc} numberOfLines={1}>{item.description ?? 'Sin descripción'}</Text>
              <Text style={styles.txnTime}>{fmtTime(item.created_at)}</Text>
            </View>
            <View style={styles.txnRight}>
              <Text style={[styles.txnAmount, { color: item.status === 'completed' ? Colors.success : '#374151' }]}>
                ${parseFloat(item.amount).toFixed(2)}
              </Text>
              <Text style={[styles.txnStatus, { color: statusColor(item.status) }]}>
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { backgroundColor: Colors.navy, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  headerName: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 17, maxWidth: 200 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testBadge: { backgroundColor: Colors.orange, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  testBadgeText: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 9, letterSpacing: 0.5 },
  logoutBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
  actionBtn: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
    ...shadowMd,
  },
  actionBtnMain: { backgroundColor: Colors.navy },
  actionBtnPos:  { backgroundColor: Colors.navy },
  actionIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { fontFamily: Fonts.extrabold, color: Colors.white, fontSize: 16 },
  actionSub:   { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },

  statMain: {
    backgroundColor: Colors.white, borderRadius: 16, marginHorizontal: 16,
    marginTop: 16, marginBottom: 10, padding: 22, alignItems: 'center',
    borderTopWidth: 4, borderTopColor: Colors.orange,
  },
  statMainLabel: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  statMainValue: { fontFamily: Fonts.black, fontSize: 44, color: Colors.success, lineHeight: 48 },
  statMainCurrency: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.grayLight, marginTop: 4 },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontFamily: Fonts.extrabold, fontSize: 22, color: Colors.navy },
  statLabel: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.gray, marginTop: 3, textAlign: 'center' },

  sectionTitle: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },

  txnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, gap: 12 },
  txnDot: { width: 10, height: 10, borderRadius: 5 },
  txnInfo: { flex: 1 },
  txnDesc: { fontFamily: Fonts.semibold, fontSize: 14, color: '#111827' },
  txnTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.grayLight, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontFamily: Fonts.bold, fontSize: 15 },
  txnStatus: { fontFamily: Fonts.semibold, fontSize: 11, marginTop: 2 },

  emptyBox: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyText: { fontFamily: Fonts.regular, color: Colors.grayLight, fontSize: 14 },
});
