import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';

import { Colors, Fonts, shadowMd } from '../theme';
import type { RootStackParams } from '../navigation/AppNavigator';

type Nav   = NativeStackNavigationProp<RootStackParams>;
type Route = RouteProp<RootStackParams, 'Result'>;

const CONFIGS = {
  success: { icon: 'check-circle' as const, title: '¡Cobro exitoso!',   subtitle: 'El pago fue procesado correctamente.',                            color: Colors.success, bg: '#f0fdf4' },
  failed:  { icon: 'cancel' as const,       title: 'Cobro rechazado',    subtitle: 'El pago fue rechazado. El cliente puede intentar nuevamente.',   color: Colors.error,   bg: '#fef2f2' },
  timeout: { icon: 'hourglass-empty' as const, title: 'QR expirado',    subtitle: 'El código QR caducó. Genera uno nuevo para intentar el cobro.',  color: Colors.warning, bg: '#fffbeb' },
};

export default function ResultScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { status, amount, description } = route.params;
  const cfg = CONFIGS[status] ?? CONFIGS.timeout;

  async function handleWhatsAppReceipt() {
    try {
      const now = new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
      const msg = encodeURIComponent(
        `🧾 *Comprobante de pago — MediaNetPay*\n\n` +
        `✅ Estado: Aprobado\n` +
        `💰 Monto: $${amount.toFixed(2)} USD\n` +
        `📋 Concepto: ${description}\n` +
        `🕐 Fecha: ${now}\n\n` +
        `_Procesado por MediaNetPay_`
      );
      const waUrl = `whatsapp://send?text=${msg}`;
      const canOpen = await Linking.canOpenURL(waUrl);
      await Linking.openURL(canOpen ? waUrl : `https://wa.me/?text=${msg}`);
    } catch {
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que esté instalado.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: cfg.bg }]}>
      <View style={styles.content}>
        {/* Ícono */}
        <View style={[styles.iconCircle, { backgroundColor: cfg.color + '20' }]}>
          <MaterialIcons name={cfg.icon} size={64} color={cfg.color} />
        </View>

        <Text style={[styles.title, { color: cfg.color }]}>{cfg.title}</Text>
        <Text style={styles.subtitle}>{cfg.subtitle}</Text>

        {/* Detalle del cobro */}
        {status !== 'timeout' && (
          <View style={[styles.detailCard, shadowMd]}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monto</Text>
              <Text style={[styles.detailValue, { color: cfg.color, fontFamily: Fonts.extrabold }]}>
                ${amount.toFixed(2)} USD
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Descripción</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{description}</Text>
            </View>
          </View>
        )}

        {/* Acciones */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => nav.navigate('Charge')} activeOpacity={0.85}>
          <MaterialIcons name="qr-code-2" size={18} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Nuevo cobro</Text>
        </TouchableOpacity>

        {status === 'success' && (
          <TouchableOpacity style={styles.waBtn} onPress={handleWhatsAppReceipt} activeOpacity={0.85}>
            <Text style={styles.waIcon}>📲</Text>
            <Text style={styles.waBtnText}>Enviar recibo por WhatsApp</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => nav.navigate('Main')}>
          <Text style={styles.secondaryBtnText}>Ver historial</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

  iconCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },

  title:    { fontFamily: Fonts.extrabold, fontSize: 26, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: Fonts.regular,   fontSize: 15, color: Colors.gray, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  detailCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 18, width: '100%', marginBottom: 28 },
  detailRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, gap: 12 },
  detailLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.grayLight },
  detailValue: { fontFamily: Fonts.semibold, fontSize: 14, color: '#111827', textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },

  primaryBtn: {
    backgroundColor: Colors.navy, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 40,
    width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12,
  },
  primaryBtnText:   { fontFamily: Fonts.bold, color: Colors.white, fontSize: 16 },
  waBtn: {
    backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 8, marginBottom: 12,
  },
  waIcon:    { fontSize: 18 },
  waBtnText: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 15 },

  secondaryBtn:     { paddingVertical: 10 },
  secondaryBtnText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.grayLight },
});
