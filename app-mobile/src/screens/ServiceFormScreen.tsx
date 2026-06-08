import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParams } from '../navigation/AppNavigator';
import { useCatalogStore } from '../store/catalogStore';
import { createService, updateService, updateProfile } from '../api/catalog';
import { Colors, Fonts, shadowMd } from '../theme';

type Route = RouteProp<RootStackParams, 'ServiceForm'>;

export default function ServiceFormScreen() {
  const nav = useNavigation();
  const route = useRoute<Route>();
  const { mode, service } = route.params;
  const { vitrina } = useCatalogStore();

  const isProfile = mode === 'profile';
  const isEdit = mode === 'edit';

  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [price, setPrice] = useState(service ? String(parseFloat(service.price)) : '');
  const [bio, setBio] = useState(vitrina?.bio ?? '');
  const [image, setImage] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para subir imágenes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],          // nuevo API — MediaTypeOptions está deprecated
      allowsEditing: true,
      aspect: isProfile ? [1, 1] : [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // En Android las URIs son content:// sin extensión — usar mimeType del asset
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      setImage({ uri: asset.uri, type: mimeType, name: `upload.${ext}` });
    }
  };

  const handleSave = async () => {
    if (isProfile) {
      setSaving(true);
      try {
        await updateProfile(bio || null, image ?? undefined);
        // VitrinaScreen.useFocusEffect recarga al volver — no hay que llamar aquí
        nav.goBack();
      } catch (e: any) {
        // Fix CATCH-BLIND: mostrar el error real que ya viene en e.message gracias al interceptor
        Alert.alert(
          'Error al guardar perfil',
          e?.message ?? 'No se pudo guardar el perfil.',
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!name.trim()) { Alert.alert('Campo requerido', 'El nombre del servicio es obligatorio.'); return; }
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) { Alert.alert('Precio inválido', 'Ingresa un precio mayor a $0.'); return; }

    setSaving(true);
    try {
      if (isEdit && service) {
        await updateService(service.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          image: image ?? undefined,
        });
      } else {
        await createService({
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceNum,
          image: image ?? undefined,
        });
      }
      // VitrinaScreen.useFocusEffect recarga al volver — no hay que llamar aquí
      nav.goBack();
    } catch (e: any) {
      // Fix CATCH-BLIND: e.message ya tiene el mensaje real (backend o network)
      Alert.alert(
        'Error al guardar servicio',
        e?.message ?? 'No se pudo guardar el servicio.',
      );
    } finally {
      setSaving(false);
    }
  };

  const currentImageUri = image?.uri ?? (isProfile ? vitrina?.profile_image_url : service?.image_url);
  const title = isProfile ? 'Perfil del negocio' : isEdit ? 'Editar servicio' : 'Nuevo servicio';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Imagen */}
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker} activeOpacity={0.8}>
            {currentImageUri ? (
              <Image source={{ uri: currentImageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="add-a-photo" size={32} color={Colors.grayLight} />
                <Text style={styles.imagePlaceholderText}>
                  {isProfile ? 'Foto del negocio' : 'Foto del servicio'}
                </Text>
                <Text style={styles.imagePlaceholderSub}>Toca para seleccionar</Text>
              </View>
            )}
            {currentImageUri && (
              <View style={styles.imageOverlay}>
                <MaterialIcons name="edit" size={20} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>

          {isProfile ? (
            // ── Modo perfil ───────────────────────────────────────────────────
            <>
              <Text style={styles.label}>Descripción del negocio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Ej: Peluquería en el norte de Quito, 10 años de experiencia..."
                placeholderTextColor={Colors.grayLight}
                multiline
                numberOfLines={3}
                maxLength={120}
              />
              <Text style={styles.charCount}>{bio.length}/120</Text>
            </>
          ) : (
            // ── Modo servicio ─────────────────────────────────────────────────
            <>
              <Text style={styles.label}>Nombre del servicio *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Corte de cabello"
                placeholderTextColor={Colors.grayLight}
                maxLength={100}
              />

              <Text style={styles.label}>Precio (USD) *</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceDollar}>$</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={Colors.grayLight}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={styles.label}>Descripción <Text style={styles.optional}>(opcional)</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ej: Incluye lavado y secado"
                placeholderTextColor={Colors.grayLight}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
              <Text style={styles.charCount}>{description.length}/300</Text>
            </>
          )}

          {/* Botón guardar */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {isProfile ? 'Guardar perfil' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 18, color: Colors.navy },

  form: { padding: 20, gap: 4 },

  imagePicker: { alignSelf: 'center', marginBottom: 20 },
  imagePreview: { width: 140, height: 140, borderRadius: 16 },
  imagePlaceholder: {
    width: 140, height: 140, borderRadius: 16,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', gap: 6,
  },
  imagePlaceholderText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.gray },
  imagePlaceholderSub: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.grayLight },
  imageOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.navy, borderRadius: 10,
    padding: 6,
  },

  label: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.navy, marginTop: 14, marginBottom: 6 },
  optional: { fontFamily: Fonts.regular, color: Colors.grayLight },

  input: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.regular, fontSize: 15, color: Colors.navy,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  charCount: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.grayLight, textAlign: 'right', marginTop: 4 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceDollar: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.navy },
  priceInput: { flex: 1 },

  saveBtn: {
    backgroundColor: Colors.navy, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.white },
});
