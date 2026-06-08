import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import type { RootStackParams } from '../navigation/AppNavigator';
import { Colors, Fonts, shadow, shadowMd } from '../theme';
import { useAuthStore } from '../store/authStore';

type Nav   = NativeStackNavigationProp<RootStackParams>;
type Route = RouteProp<RootStackParams, 'POSResult'>;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('0'))   return `593${digits.slice(1)}`;
  return `593${digits}`;
}

function idTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    ruc:              'RUC',
    cedula:           'Cédula',
    pasaporte:        'Pasaporte',
    consumidor_final: 'Cons. Final',
  };
  return type ? (map[type] ?? type) : '';
}

function buildReceipt(params: {
  approved:           boolean;
  amount:             number;
  description:        string;
  card_brand:         string;
  card_last4:         string;
  authorization_code: string | null;
  medianet_ref:       string | null;
  customerName?:      string;
  customerIdType?:    string;
  customerRucCedula?: string;
  merchantName?:      string;
  merchantRuc?:       string;
}): string {
  const now  = new Date();
  const date = now.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  const sep  = '━━━━━━━━━━━━━━━━━━━━━━━━━';

  const isConsumidorFinal = params.customerIdType === 'consumidor_final';

  const merchantBlock = params.merchantName
    ? `🏪 *${params.merchantName.toUpperCase()}*\n${params.merchantRuc ? `RUC: ${params.merchantRuc}` : ''}`
    : '';

  const clientBlock = params.customerName
    ? (isConsumidorFinal
        ? `👤 *CLIENTE*\nConsumidor Final`
        : `👤 *CLIENTE*\n${params.customerName}\n${idTypeLabel(params.customerIdType)}: ${params.customerRucCedula ?? ''}`)
    : '';

  const lines = [
    sep,
    `🧾 *COMPROBANTE DE PAGO*`,
    ...(merchantBlock ? [merchantBlock] : []),
    sep,
    ...(clientBlock ? [clientBlock, ''] : []),
    `📋 *DETALLE*`,
    `${params.description}`,
    '',
    sep,
    `💰 *TOTAL:  $${params.amount.toFixed(2)} USD*`,
    sep,
    '',
    `💳 ${params.card_brand} ••••${params.card_last4}`,
    params.approved ? `✅ *PAGO APROBADO*` : `❌ *PAGO RECHAZADO*`,
    ...(params.authorization_code ? [`🔑 Auth: ${params.authorization_code}`] : []),
    ...(params.medianet_ref        ? [`📄 Ref: ${params.medianet_ref}`]        : []),
    `🕐 ${date} ${time}`,
    '',
    `_Procesado por MediaNetPay_`,
    `_No válido como factura tributaria_`,
  ];

  return lines.join('\n');
}

export default function POSResultScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { merchant } = useAuthStore();

  const {
    status, amount, description,
    card_brand, card_last4, authorization_code, medianet_ref,
    customerName, customerIdType, customerRucCedula, customerPhone,
  } = route.params;

  const approved = status === 'completed';

  // Si ya viene teléfono del cliente, no necesitamos pedirlo
  const [receiptModal, setReceiptModal] = useState(false);
  const [phone, setPhone]               = useState('');

  async function sendReceipt(phoneNumber: string) {
    const msg = buildReceipt({
      approved,
      amount,
      description,
      card_brand,
      card_last4,
      authorization_code,
      medianet_ref,
      customerName,
      customerIdType,
      customerRucCedula,
      merchantName: merchant?.business_name,
      merchantRuc:  merchant?.ruc,
    });

    const intl   = normalizePhone(phoneNumber);
    const waUrl  = `whatsapp://send?phone=${intl}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;

    try {
      const can = await Linking.canOpenURL(waUrl);
      await Linking.openURL(can ? waUrl : webUrl);
    } catch {
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que esté instalado.');
    }
    setReceiptModal(false);
    setPhone('');
  }

  function handleSendReceipt() {
    if (customerPhone) {
      // Teléfono ya capturado — enviar directo
      sendReceipt(customerPhone);
    } else {
      // Consumidor final o sin teléfono — pedir número
      setReceiptModal(true);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: approved ? '#f0fdf4' : '#fef2f2' }]}>
      <View style={styles.content}>

        {/* Ícono resultado */}
        <View style={[styles.iconCircle, { backgroundColor: (approved ? Colors.success : Colors.error) + '20' }]}>
          <MaterialIcons
            name={approved ? 'check-circle' : 'cancel'}
            size={72}
            color={approved ? Colors.success : Colors.error}
          />
        </View>

        <Text style={[styles.title, { color: approved ? Colors.success : Colors.error }]}>
          {approved ? '¡Cobro aprobado!' : 'Cobro rechazado'}
        </Text>
        <Text style={styles.subtitle}>
          {approved
            ? 'El pago fue procesado correctamente.'
            : 'La tarjeta fue rechazada. Intente con otra tarjeta.'}
        </Text>

        {/* Detalle */}
        <View style={[styles.detailCard, shadowMd]}>

          {/* Cliente — solo si no es consumidor final sin nombre */}
          {customerName && customerName !== 'CONSUMIDOR FINAL' && (
            <>
              <Row label="Cliente"  value={customerName} />
              {customerRucCedula && (
                <Row label={idTypeLabel(customerIdType)} value={customerRucCedula} />
              )}
              <View style={styles.divider} />
            </>
          )}

          <Row
            label="Monto"
            value={`$${amount.toFixed(2)} USD`}
            valueStyle={{ color: approved ? Colors.success : Colors.error, fontFamily: Fonts.extrabold }}
          />
          <View style={styles.divider} />
          <Row label="Concepto"  value={description} />
          <View style={styles.divider} />
          <Row label="Tarjeta"   value={`${card_brand} ••••${card_last4}`} />

          {authorization_code && (
            <>
              <View style={styles.divider} />
              <Row label="Autorización" value={authorization_code} valueStyle={{ fontFamily: Fonts.semibold, color: Colors.navy }} />
            </>
          )}
          {medianet_ref && (
            <>
              <View style={styles.divider} />
              <Row label="Referencia" value={medianet_ref} valueStyle={{ fontSize: 12 }} />
            </>
          )}
        </View>

        {/* Botón comprobante WhatsApp — solo si aprobado */}
        {approved && (
          <TouchableOpacity style={styles.waBtn} onPress={handleSendReceipt} activeOpacity={0.85}>
            <Text style={{ fontSize: 18 }}>📲</Text>
            <Text style={styles.waBtnText}>
              {customerPhone ? 'Enviar comprobante al cliente' : 'Enviar comprobante'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Botón nuevo cobro */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => nav.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'SoftPOS' }] })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="contactless" size={20} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Nuevo cobro</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => nav.reset({ index: 0, routes: [{ name: 'Main' }] })}
        >
          <Text style={styles.secondaryBtnText}>Ver historial</Text>
        </TouchableOpacity>

      </View>

      {/* Modal número de teléfono — solo cuando no hay customerPhone */}
      <Modal visible={receiptModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Número del cliente</Text>
            <Text style={styles.modalSub}>Ingresa el número para enviar el comprobante</Text>
            <TextInput
              style={styles.modalInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+593 99 999 9999"
              placeholderTextColor={Colors.grayLight}
              keyboardType="phone-pad"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setReceiptModal(false); setPhone(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !phone && { backgroundColor: Colors.grayLight }]}
                onPress={() => phone && sendReceipt(phone)}
                disabled={!phone}
              >
                <Text style={styles.modalConfirmText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueStyle]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, gap: 12 },
  label: { fontFamily: Fonts.regular,  fontSize: 13, color: Colors.grayLight },
  value: { fontFamily: Fonts.semibold, fontSize: 14, color: '#111827', textAlign: 'right', flex: 1 },
});

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },

  iconCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title:      { fontFamily: Fonts.extrabold, fontSize: 26, textAlign: 'center' },
  subtitle:   { fontFamily: Fonts.regular,   fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20, marginBottom: 4 },

  detailCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 18, width: '100%', marginBottom: 4 },
  divider:    { height: 1, backgroundColor: Colors.border, marginVertical: 2 },

  waBtn: {
    backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  waBtnText: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 15 },

  primaryBtn: {
    backgroundColor: Colors.navy, borderRadius: 14, paddingVertical: 15,
    width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  primaryBtnText: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 16 },

  secondaryBtn:     { paddingVertical: 10 },
  secondaryBtnText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.grayLight },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard:    { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle:   { fontFamily: Fonts.bold,    fontSize: 17, color: Colors.navy, textAlign: 'center' },
  modalSub:     { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray, textAlign: 'center' },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: '#111827',
    backgroundColor: Colors.bg,
  },
  modalBtns:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel:      { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalCancelText:  { fontFamily: Fonts.semibold, color: Colors.gray, fontSize: 15 },
  modalConfirm:     { flex: 1, backgroundColor: Colors.navy, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalConfirmText: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 15 },
});
