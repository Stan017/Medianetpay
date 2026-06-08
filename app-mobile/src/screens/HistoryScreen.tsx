import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { listTransactions, type Transaction } from '../api/transactions';
import { Colors, Fonts, shadow } from '../theme';

type FilterKey = 'all' | 'completed' | 'failed' | 'pending';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Aprobados' },
  { key: 'failed', label: 'Rechazados' },
  { key: 'pending', label: 'Pendientes' },
];

function statusColor(s: string) {
  if (s === 'completed') return Colors.success;
  if (s === 'failed' || s === 'reversed') return Colors.error;
  return Colors.warning;
}
function statusLabel(s: string) {
  return ({ completed: 'Aprobado', failed: 'Rechazado', pending: 'Pendiente', processing: 'Procesando', reversed: 'Revertido', refunded: 'Reembolsado' })[s] ?? s;
}
function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const [transactions, setTxns]       = useState<Transaction[]>([]);
  const [filter, setFilter]           = useState<FilterKey>('all');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');

  const load = useCallback(async (pageNum: number, f: FilterKey, reset: boolean) => {
    try {
      const result = await listTransactions({ status: f === 'all' ? undefined : f, page: pageNum, page_size: 20 });
      setTxns(prev => reset ? result.data : [...prev, ...result.data]);
      setTotalPages(result.total_pages);
      setPage(result.page);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
  }, []);

  useEffect(() => { setLoading(true); setTxns([]); load(1, filter, true); }, [filter, load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color={Colors.grayLight} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por descripción o monto..."
          placeholderTextColor={Colors.grayLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={Colors.grayLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={transactions.filter(t => {
            if (!search) return true;
            const q = search.toLowerCase();
            return (
              t.description?.toLowerCase().includes(q) ||
              parseFloat(t.amount).toFixed(2).includes(q)
            );
          })}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, filter, true); }} tintColor={Colors.orange} />}
          onEndReached={() => { if (!loadingMore && page < totalPages) { setLoadingMore(true); load(page + 1, filter, false); } }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="receipt-long" size={48} color={Colors.grayLight} />
              <Text style={styles.emptyText}>No hay transacciones</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.orange} style={{ paddingVertical: 16 }} /> : null}
          renderItem={({ item }) => (
            <View style={[styles.txnCard, shadow]}>
              <View style={[styles.statusBar, { backgroundColor: statusColor(item.status) }]} />
              <View style={styles.txnContent}>
                <View style={styles.txnTop}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{item.description ?? 'Sin descripción'}</Text>
                  <Text style={[styles.txnAmount, { color: item.status === 'completed' ? Colors.success : '#374151' }]}>
                    ${parseFloat(item.amount).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.txnBottom}>
                  <Text style={styles.txnTime}>{fmtDatetime(item.created_at)}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { backgroundColor: Colors.navy, paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontFamily: Fonts.extrabold, color: Colors.white, fontSize: 20 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: '#111827', paddingVertical: 4 },
  filterRow: { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.gray },
  chipTextActive: { color: Colors.white },

  txnCard: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  statusBar: { width: 4 },
  txnContent: { flex: 1, padding: 14, gap: 8 },
  txnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txnDesc: { fontFamily: Fonts.semibold, flex: 1, fontSize: 14, color: '#111827', marginRight: 12 },
  txnAmount: { fontFamily: Fonts.extrabold, fontSize: 16 },
  txnBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.grayLight },
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11 },

  emptyBox: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.grayLight },
});
