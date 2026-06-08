import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParams } from '../navigation/AppNavigator';
import { Colors, Fonts, shadow, shadowMd } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParams>;
type CardOption = { token: '4242' | '0002' | '5500'; label: string; brand: string; approved: boolean };
type IdType = 'ruc' | 'cedula' | 'pasaporte' | 'consumidor_final';

const CARDS: CardOption[] = [
  { token: '4242', label: '•••• 4242', brand: 'Visa',       approved: true  },
  { token: '5500', label: '•••• 5500', brand: 'Mastercard', approved: true  },
  { token: '0002', label: '•••• 0002', brand: 'Visa',       approved: false },
];

function detectIdType(value: string): IdType {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13) return 'ruc';
  if (digits.length === 10) return 'cedula';
  if (digits.length > 0)    return 'pasaporte';
  return 'cedula';
}

export default function SoftPOSScreen() {
  const nav = useNavigation<Nav>();
  const [digits, setDigits]       = useState('');
  const [description, setDescription] = useState('');
  const [cardToken, setCardToken] = useState<CardOption>(CARDS[0]);

  // Modal datos del cliente
  const [clientModal, setClientModal] = useState(false);
  const [clientName, setClientName]   = useState('');
  const [clientId, setClientId]       = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const amount = digits ? parseInt(digits, 10) / 100 : 0;
  const amountStr = amount.toFixed(2);
  const [intPart, decPart] = amountStr.split('.');

  function pressDigit(d: string) {
    if (digits.length >= 7) return;
    setDigits(prev => (prev === '' && d === '0') ? '' : prev + d);
  }
  function pressBackspace() { setDigits(prev => prev.slice(0, -1)); }
  function pressClear()     { setDigits(''); }

  function validateAmount(): boolean {
    if (amount < 0.5)  { Alert.alert('Monto inválido', 'El monto mínimo es $0.50'); return false; }
    if (amount > 500)  { Alert.alert('Monto inválido', 'El monto máximo es $500.00'); return false; }
    return true;
  }

  function handleConsumidorFinal() {
    if (!validateAmount()) return;
    nav.navigate('CardRead', {
      amount,
      description: description.trim() || `Cobro $${amountStr}`,
      cardToken: cardToken.token,
      customerIdType:    'consumidor_final',
      customerRucCedula: '9999999999',
      customerName:      'CONSUMIDOR FINAL',
    });
  }

  function handleOpenClientModal() {
    if (!validateAmount()) return;
    setClientModal(true);
  }

  function handleConfirmClient() {
    if (!clientName.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre o razón social del cliente.');
      return;
    }
    if (!clientId.trim()) {
      Alert.alert('Falta la identificación', 'Ingresa la cédula, RUC o pasaporte.');
      return;
    }
    const idType = detectIdType(clientId);
    setClientModal(false);
    nav.navigate('CardRead', {
      amount,
      description: description.trim() || `Cobro $${amountStr}`,
      cardToken: cardToken.token,
      customerName:      clientName.trim().toUpperCase(),
      customerIdType:    idType,
      customerRucCedula: clientId.trim(),
      customerEmail:     clientEmail.trim() || undefined,
      customerPhone:     clientPhone.trim() || undefined,
    });
  }

  function closeModal() {
    setClientModal(false);
    setClientName(''); setClientId('');
    setClientEmail(''); setClientPhone('');
  }

  const PAD = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['C','0','⌫'],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Display monto */}
        <View style={styles.display}>
          <Text style={styles.displayCurrency}>$</Text>
          <Text style={styles.displayInt}>{intPart || '0'}</Text>
          <Text style={styles.displayDec}>.{decPart}</Text>
          <Text style={styles.displayUSD}>USD</Text>
        </View>

        {/* Keypad */}
        <View style={styles.pad}>
          {PAD.map((row, ri) => (
            <View key={ri} style={styles.padRow}>
              {row.map(key => {
                const isClear = key === 'C';
                const isBack  = key === '⌫';
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.padKey, isClear && styles.padKeyClear]}
                    onPress={() => {
                      if (isClear) pressClear();
                      else if (isBack) pressBackspace();
                      else pressDigit(key);
                    }}
                    activeOpacity={0.7}
                  >
                    {isBack ? (
                      <MaterialIcons name="backspace" size={22} color={Colors.navy} />
                    ) : (
                      <Text style={[styles.padKeyText, isClear && { color: Colors.error }]}>{key}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Descripción */}
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardLabel}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Camiseta, almuerzo, servicio..."
            placeholderTextColor={Colors.grayLight}
            maxLength={120}
            returnKeyType="done"
          />
          <Text style={styles.charCount}>{description.length}/120</Text>
        </View>

        {/* Selector tarjeta */}
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardLabel}>Tarjeta de prueba</Text>
          <View style={styles.cardOptions}>
            {CARDS.map(c => (
              <TouchableOpacity
                key={c.token}
                style={[styles.cardChip, cardToken.token === c.token && styles.cardChipActive]}
                onPress={() => setCardToken(c)}
              >
                <Text style={[styles.cardChipText, cardToken.token === c.token && styles.cardChipTextActive]}>
                  {c.brand} {c.label}
                </Text>
                <Text style={{ fontSize: 11, color: c.approved ? Colors.success : Colors.error }}>
                  {c.approved ? '✓ Aprobada' : '✗ Rechazada'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Botones de cobro */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary, amount < 0.5 && styles.btnDisabled]}
            onPress={handleConsumidorFinal}
            disabled={amount < 0.5}
            activeOpacity={0.85}
          >
            <MaterialIcons name="person-outline" size={20} color={Colors.navy} />
            <Text style={styles.actionBtnSecondaryText}>Consumidor{'\n'}final</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary, amount < 0.5 && styles.btnDisabled]}
            onPress={handleOpenClientModal}
            disabled={amount < 0.5}
            activeOpacity={0.85}
          >
            <MaterialIcons name="badge" size={20} color={Colors.white} />
            <Text style={styles.actionBtnPrimaryText}>Con datos{'\n'}del cliente</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal datos del cliente */}
      <Modal visible={clientModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Datos del cliente</Text>
              <TouchableOpacity onPress={closeModal}>
                <MaterialIcons name="close" size={22} color={Colors.grayLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Para emitir factura electrónica. Cédula (10d), RUC (13d) o pasaporte.
            </Text>

            <Text style={styles.fieldLabel}>Nombre / Razón social *</Text>
            <TextInput
              style={styles.fieldInput}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Ej: Juan Pérez / DISTRIBUIDORA ABC"
              placeholderTextColor={Colors.grayLight}
              autoCapitalize="characters"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Cédula / RUC / Pasaporte *</Text>
            <TextInput
              style={styles.fieldInput}
              value={clientId}
              onChangeText={setClientId}
              placeholder="0102030405"
              placeholderTextColor={Colors.grayLight}
              keyboardType="default"
              returnKeyType="next"
            />
            {clientId.length > 0 && (
              <Text style={styles.idTypeHint}>
                Tipo detectado: {detectIdType(clientId) === 'ruc' ? 'RUC' : detectIdType(clientId) === 'cedula' ? 'Cédula' : 'Pasaporte'}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Email <Text style={styles.optional}>(opcional — para RIDE)</Text></Text>
            <TextInput
              style={styles.fieldInput}
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="cliente@email.com"
              placeholderTextColor={Colors.grayLight}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Teléfono <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              style={styles.fieldInput}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="0987654321"
              placeholderTextColor={Colors.grayLight}
              keyboardType="phone-pad"
              returnKeyType="done"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmClient}>
                <MaterialIcons name="contactless" size={18} color={Colors.white} />
                <Text style={styles.modalConfirmText}>Cobrar ${amountStr}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  display: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: 16, padding: 24, ...shadow, gap: 4,
  },
  displayCurrency: { fontFamily: Fonts.bold,     fontSize: 28, color: Colors.navy, paddingBottom: 6 },
  displayInt:      { fontFamily: Fonts.black,     fontSize: 56, color: Colors.navy, lineHeight: 60 },
  displayDec:      { fontFamily: Fonts.extrabold, fontSize: 28, color: Colors.grayLight, paddingBottom: 6 },
  displayUSD:      { fontFamily: Fonts.semibold,  fontSize: 14, color: Colors.grayLight, paddingBottom: 8, marginLeft: 4 },

  pad:    { gap: 10 },
  padRow: { flexDirection: 'row', gap: 10 },
  padKey: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, height: 68,
    alignItems: 'center', justifyContent: 'center', ...shadow,
  },
  padKeyClear:  { backgroundColor: '#fef2f2' },
  padKeyText:   { fontFamily: Fonts.bold, fontSize: 24, color: Colors.navy },

  card:      { backgroundColor: Colors.white, borderRadius: 16, padding: 16 },
  cardLabel: { fontFamily: Fonts.semibold, fontSize: 11, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  optional:  { fontFamily: Fonts.regular, color: Colors.grayLight, textTransform: 'none', letterSpacing: 0 },

  descInput: {
    backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: '#111827',
  },
  charCount: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.grayLight, textAlign: 'right', marginTop: 4 },

  cardOptions: { gap: 8 },
  cardChip: {
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardChipActive:     { borderColor: Colors.navy, backgroundColor: '#eff6ff' },
  cardChipText:       { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.gray },
  cardChipTextActive: { color: Colors.navy },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    ...shadowMd,
  },
  actionBtnSecondary: {
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.navy,
  },
  actionBtnPrimary: { backgroundColor: Colors.navy },
  actionBtnSecondaryText: { fontFamily: Fonts.extrabold, color: Colors.navy, fontSize: 14, textAlign: 'center' },
  actionBtnPrimaryText:   { fontFamily: Fonts.extrabold, color: Colors.white, fontSize: 14, textAlign: 'center' },
  btnDisabled: { opacity: 0.4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle:  { fontFamily: Fonts.bold, fontSize: 18, color: Colors.navy },
  modalSub:    { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 4 },

  fieldLabel: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: {
    backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: '#111827',
  },
  idTypeHint: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.orange, marginTop: -4 },

  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel:     { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontFamily: Fonts.semibold, color: Colors.gray, fontSize: 15 },
  modalConfirm:    { flex: 2, backgroundColor: Colors.navy, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  modalConfirmText:{ fontFamily: Fonts.bold, color: Colors.white, fontSize: 15 },
});
