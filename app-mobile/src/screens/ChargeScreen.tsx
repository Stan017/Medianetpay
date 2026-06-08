import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Linking, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createLink } from '../api/links';
import { Colors, Fonts, shadow } from '../theme';
import { usePresetsStore } from '../store/presetsStore';
import type { RootStackParams } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParams>;

function expiresIn5Min(): string {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('0'))   return `593${digits.slice(1)}`;
  return `593${digits}`;
}

export default function ChargeScreen() {
  const nav = useNavigation<Nav>();
  const { presets, load: loadPresets, add: addPreset, remove: removePreset } = usePresetsStore();

  const [amount, setAmount]           = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [presetModalVisible, setPresetModalVisible] = useState(false);
  const [presetName, setPresetName]   = useState('');

  // Modal datos del cliente
  const [clientModal, setClientModal] = useState(false);
  const [clientName, setClientName]   = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => { loadPresets(); }, []);

  function applyPreset(amt: number, desc: string) {
    setAmount(amt.toFixed(2));
    setDescription(desc);
    setError('');
  }

  function handleSavePreset() {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num < 0.5) { setError('Ingresa un monto válido para guardar'); return; }
    setPresetName(description.trim() || 'Cobro rápido');
    setPresetModalVisible(true);
  }

  function confirmSavePreset() {
    const num = parseFloat(amount);
    const desc = description.trim() || 'Cobro rápido';
    if (presetName.trim()) addPreset(presetName.trim(), num, desc);
    setPresetModalVisible(false);
    setPresetName('');
  }

  function handleAmountChange(text: string) {
    const clean = text.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(clean);
  }

  async function buildLink(): Promise<{ num: number; desc: string; url: string; id: string } | null> {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num < 0.5) { setError('El monto mínimo es $0.50'); return null; }
    if (num > 500) { setError('El monto máximo es $500.00'); return null; }
    const desc = description.trim() || 'Cobro';
    setError(''); setLoading(true);
    try {
      const link = await createLink({ amount: num, description: desc, max_uses: 1, expires_at: expiresIn5Min() });
      return { num, desc, url: link.checkout_url, id: link.id };
    } catch (err: any) {
      setError(err.message ?? 'Error al crear el cobro');
      return null;
    } finally { setLoading(false); }
  }

  // Consumidor final — genera link y abre selector de contacto de WA
  async function handleConsumidorFinal() {
    const result = await buildLink();
    if (!result) return;
    nav.navigate('QR', { linkId: result.id, checkoutUrl: result.url, amount: result.num, description: result.desc });
  }

  // Con datos del cliente — abre modal primero
  function handleOpenClientModal() {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num < 0.5) { setError('El monto mínimo es $0.50'); return; }
    if (num > 500) { setError('El monto máximo es $500.00'); return; }
    setError('');
    setClientModal(true);
  }

  async function handleConfirmClient() {
    if (!clientName.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa el nombre del cliente.');
      return;
    }
    setClientModal(false);

    const result = await buildLink();
    if (!result) { setClientModal(true); return; }

    // Si hay teléfono, WA abre directo al cliente
    const msg = encodeURIComponent(
      `Hola ${clientName.trim()} 👋 Te comparto el link para tu pago:\n\n` +
      `💰 *$${result.num.toFixed(2)} USD*\n` +
      `📋 ${result.desc}\n\n` +
      `${result.url}\n\n` +
      `🔒 Pago seguro con MediaNetPay · Válido por 5 minutos`
    );

    try {
      let waUrl: string;
      if (clientPhone.trim()) {
        const intl = normalizePhone(clientPhone);
        waUrl = `whatsapp://send?phone=${intl}&text=${msg}`;
        const can = await Linking.canOpenURL(waUrl);
        await Linking.openURL(can ? waUrl : `https://wa.me/${intl}?text=${msg}`);
      } else {
        // Sin teléfono → QR pantalla (el comerciante lo muestra)
        nav.navigate('QR', { linkId: result.id, checkoutUrl: result.url, amount: result.num, description: result.desc });
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir WhatsApp.');
    }
    setClientName(''); setClientPhone('');
  }

  function closeClientModal() {
    setClientModal(false);
    setClientName(''); setClientPhone('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Cobros rápidos */}
          {presets.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Cobros rápidos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {presets.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.presetChip}
                    onPress={() => applyPreset(p.amount, p.description)}
                    onLongPress={() =>
                      Alert.alert('Eliminar', `¿Eliminar "${p.label}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => removePreset(p.id) },
                      ])
                    }
                  >
                    <Text style={styles.presetLabel}>{p.label}</Text>
                    <Text style={styles.presetAmount}>${p.amount.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Monto */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Monto a cobrar</Text>
            <View style={styles.amountRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={Colors.grayLight}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.currency}>USD</Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
            <TextInput
              style={styles.descInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Camiseta, servicio de diseño..."
              placeholderTextColor={Colors.grayLight}
              maxLength={120}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{description.length}/120</Text>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#1e40af" />
            <Text style={styles.infoText}>
              El QR expira en <Text style={{ fontFamily: Fonts.bold }}>5 minutos</Text> · Máximo <Text style={{ fontFamily: Fonts.bold }}>$500</Text>
            </Text>
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Guardar preset */}
          <TouchableOpacity style={styles.savePresetBtn} onPress={handleSavePreset}>
            <MaterialIcons name="bookmark-add" size={16} color={Colors.navy} />
            <Text style={styles.savePresetText}>Guardar como cobro rápido</Text>
          </TouchableOpacity>

          {/* Botones de cobro */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary, loading && styles.btnDisabled]}
              onPress={handleConsumidorFinal}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={Colors.navy} /> : (
                <>
                  <MaterialIcons name="person-outline" size={20} color={Colors.navy} />
                  <Text style={styles.actionBtnSecondaryText}>Consumidor{'\n'}final</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary, loading && styles.btnDisabled]}
              onPress={handleOpenClientModal}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={Colors.white} /> : (
                <>
                  <MaterialIcons name="badge" size={20} color={Colors.white} />
                  <Text style={styles.actionBtnPrimaryText}>Con datos{'\n'}del cliente</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal preset */}
      <Modal visible={presetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nombre del cobro rápido</Text>
            <Text style={styles.modalSub}>
              ${parseFloat(amount || '0').toFixed(2)} — {description.trim() || 'Cobro rápido'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Ej: Almuerzo, Café, Camiseta..."
              placeholderTextColor={Colors.grayLight}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmSavePreset}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setPresetModalVisible(false); setPresetName(''); }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmSavePreset}>
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal datos del cliente */}
      <Modal visible={clientModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.sheetOverlay}
        >
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Datos del cliente</Text>
              <TouchableOpacity onPress={closeClientModal}>
                <MaterialIcons name="close" size={22} color={Colors.grayLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              El link se enviará por WhatsApp directo al cliente si ingresas su teléfono.
            </Text>

            <Text style={styles.fieldLabel}>Nombre *</Text>
            <TextInput
              style={styles.fieldInput}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Ej: Juan Pérez"
              placeholderTextColor={Colors.grayLight}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Teléfono <Text style={styles.optional}>(para envío directo por WA)</Text></Text>
            <TextInput
              style={styles.fieldInput}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="0987654321"
              placeholderTextColor={Colors.grayLight}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeClientModal}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, loading && { backgroundColor: Colors.grayLight }]}
                onPress={handleConfirmClient}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <>
                      <MaterialIcons name={clientPhone.trim() ? 'send' : 'qr-code-2'} size={18} color={Colors.white} />
                      <Text style={styles.modalConfirmText}>
                        {clientPhone.trim() ? 'Enviar por WA' : 'Ver QR'}
                      </Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 12 },

  card:         { backgroundColor: Colors.white, borderRadius: 16, padding: 18, ...shadow },
  sectionLabel: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  optional:     { fontFamily: Fonts.regular, color: Colors.grayLight, textTransform: 'none', letterSpacing: 0 },

  amountRow:  { flexDirection: 'row', alignItems: 'center' },
  dollarSign: { fontFamily: Fonts.bold, fontSize: 32, color: Colors.navy, marginRight: 4 },
  amountInput:{ flex: 1, fontFamily: Fonts.extrabold, fontSize: 52, color: Colors.navy, paddingVertical: 4 },
  currency:   { fontFamily: Fonts.semibold, fontSize: 16, color: Colors.grayLight, alignSelf: 'flex-end', paddingBottom: 10 },

  descInput: {
    backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: '#111827',
  },
  charCount: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.grayLight, textAlign: 'right', marginTop: 6 },

  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { fontFamily: Fonts.regular, fontSize: 13, color: '#1e40af', flex: 1, lineHeight: 18 },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { fontFamily: Fonts.semibold, color: Colors.error, fontSize: 13, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  actionBtnSecondary:     { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.navy },
  actionBtnPrimary:       { backgroundColor: Colors.navy },
  actionBtnSecondaryText: { fontFamily: Fonts.extrabold, color: Colors.navy, fontSize: 14, textAlign: 'center' },
  actionBtnPrimaryText:   { fontFamily: Fonts.extrabold, color: Colors.white, fontSize: 14, textAlign: 'center' },
  btnDisabled: { opacity: 0.5 },

  presetChip: {
    backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 4, alignItems: 'center', minWidth: 80,
  },
  presetLabel:  { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.navy },
  presetAmount: { fontFamily: Fonts.extrabold, fontSize: 16, color: Colors.orange, marginTop: 2 },

  savePresetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  savePresetText:{ fontFamily: Fonts.semibold, fontSize: 13, color: Colors.navy },

  // Modal preset (centrado)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard:    { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle:   { fontFamily: Fonts.bold, fontSize: 17, color: Colors.navy, textAlign: 'center' },
  modalSub:     { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray, textAlign: 'center' },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: '#111827',
    backgroundColor: Colors.bg,
  },
  modalBtns:        { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel:      { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalCancelText:  { fontFamily: Fonts.semibold, color: Colors.gray, fontSize: 15 },
  modalConfirm:     { flex: 1, backgroundColor: Colors.navy, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  modalConfirmText: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 15 },

  // Bottom sheet (datos del cliente)
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 10,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle:  { fontFamily: Fonts.bold, fontSize: 18, color: Colors.navy },
  sheetSub:    { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray, lineHeight: 18, marginBottom: 4 },

  fieldLabel: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: {
    backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, fontFamily: Fonts.regular, fontSize: 15, color: '#111827',
  },
});
