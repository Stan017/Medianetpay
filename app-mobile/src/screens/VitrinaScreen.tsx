import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Animated, Share, Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParams } from '../navigation/AppNavigator';
import { useCatalogStore } from '../store/catalogStore';
import { CatalogService } from '../api/catalog';
import { Colors, Fonts, shadowMd } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParams>;

// Toggle custom — reemplaza Switch nativo que crashea en Fabric dentro de FlatList
function CustomToggle({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handlePress = () => {
    if (disabled) return;
    Animated.timing(anim, {
      toValue: value ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onToggle();
  };

  const trackBg = anim.interpolate({ inputRange: [0, 1], outputRange: [Colors.border, Colors.success] });
  const thumbPos = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={toggleStyles.track}>
      <Animated.View style={[toggleStyles.trackFill, { backgroundColor: trackBg }]} />
      <Animated.View style={[toggleStyles.thumb, { left: thumbPos }]} />
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  track: { width: 46, height: 26, borderRadius: 13, overflow: 'hidden', justifyContent: 'center' },
  trackFill: { ...StyleSheet.absoluteFillObject, borderRadius: 13 },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white, position: 'absolute', top: 2, elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
});

export default function VitrinaScreen() {
  const nav = useNavigation<Nav>();
  const { vitrina, loading, fetchVitrina, toggleActive, removeService } = useCatalogStore();
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchVitrina();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVitrina();
    setRefreshing(false);
  };

  const handleToggle = async (val: boolean) => {
    setToggling(true);
    try {
      await toggleActive(val);
    } catch (e: any) {
      // Fix CATCH-BLIND: e.message tiene el detalle real
      Alert.alert(
        'Error en vitrina',
        e?.message ?? 'No se pudo cambiar el estado de la vitrina.',
      );
    } finally {
      setToggling(false);
    }
  };

  const handleShare = async () => {
    if (!vitrina?.vitrina_url) return;
    await Share.share({
      message: `¡Visita mi vitrina en MediaNetPay!\n${vitrina.vitrina_url}`,
      url: vitrina.vitrina_url,
    });
  };

  const handleDelete = (service: CatalogService) => {
    Alert.alert(
      'Eliminar servicio',
      `¿Eliminar "${service.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removeService(service.id),
        },
      ],
    );
  };

  const activeServices = vitrina?.services.filter((s) => s.active) ?? [];

  // No early return — mismo árbol nativo siempre para evitar RetryableMountingLayerException en Fabric
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mi Vitrina</Text>
          <Text style={styles.headerSub}>Tu página pública de servicios</Text>
        </View>
        {vitrina?.vitrina_url && (
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
            <MaterialIcons name="share" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={activeServices}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.orange} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Card de estado */}
            <View style={[styles.statusCard, shadowMd]}>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <MaterialIcons
                    name={vitrina?.vitrina_active ? 'storefront' : 'store'}
                    size={26}
                    color={vitrina?.vitrina_active ? Colors.success : Colors.grayLight}
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.statusTitle}>
                      {vitrina?.vitrina_active ? 'Vitrina activa' : 'Vitrina inactiva'}
                    </Text>
                    <Text style={styles.statusSub}>
                      {vitrina?.vitrina_active
                        ? 'Tus clientes pueden verte'
                        : 'Actívala para que te encuentren'}
                    </Text>
                  </View>
                </View>
                {toggling ? (
                  <ActivityIndicator size="small" color={Colors.orange} />
                ) : (
                  <CustomToggle
                    value={vitrina?.vitrina_active ?? false}
                    onToggle={() => handleToggle(!(vitrina?.vitrina_active ?? false))}
                    disabled={toggling}
                  />
                )}
              </View>

              {/* URL pública */}
              {vitrina?.vitrina_url && (
                <TouchableOpacity onPress={handleShare} style={styles.urlRow} activeOpacity={0.7}>
                  <MaterialIcons name="link" size={16} color={Colors.orange} />
                  <Text style={styles.urlText} numberOfLines={1}>
                    {vitrina.vitrina_url.replace('https://', '').replace('http://', '')}
                  </Text>
                  <MaterialIcons name="open-in-new" size={16} color={Colors.orange} />
                </TouchableOpacity>
              )}
            </View>

            {/* Bio */}
            <TouchableOpacity
              style={[styles.bioCard, shadowMd]}
              onPress={() => nav.navigate('ServiceForm', { mode: 'profile' })}
              activeOpacity={0.8}
            >
              <View style={styles.bioRow}>
                {vitrina?.profile_image_url ? (
                  <Image source={{ uri: vitrina.profile_image_url }} style={styles.profileImg} />
                ) : (
                  <View style={styles.profileImgPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={22} color={Colors.grayLight} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.bioText} numberOfLines={2}>
                    {vitrina?.bio ?? 'Toca para agregar una descripción de tu negocio'}
                  </Text>
                </View>
                <MaterialIcons name="edit" size={18} color={Colors.grayLight} />
              </View>
            </TouchableOpacity>

            {/* Sección servicios */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                SERVICIOS ({activeServices.length}/{10})
              </Text>
              {activeServices.length < 10 && (
                <TouchableOpacity
                  onPress={() => nav.navigate('ServiceForm', { mode: 'create' })}
                  style={styles.addBtn}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={18} color={Colors.white} />
                  <Text style={styles.addBtnText}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          loading && !vitrina ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.orange} />
            </View>
          ) : (
            <View style={styles.empty}>
              <MaterialIcons name="storefront" size={52} color={Colors.grayLight} />
              <Text style={styles.emptyTitle}>Sin servicios aún</Text>
              <Text style={styles.emptySub}>Agrega lo que ofreces y comparte tu vitrina</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => nav.navigate('ServiceForm', { mode: 'create' })}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>+ Agregar primer servicio</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.serviceCard, shadowMd]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.serviceImg} />
            ) : (
              <View style={styles.serviceImgPlaceholder}>
                <MaterialIcons name="image" size={24} color={Colors.grayLight} />
              </View>
            )}
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.servicePrice}>${parseFloat(item.price).toFixed(2)}</Text>
            </View>
            <View style={styles.serviceActions}>
              <TouchableOpacity
                onPress={() => nav.navigate('ServiceForm', { mode: 'edit', service: item })}
                style={styles.actionIcon}
              >
                <MaterialIcons name="edit" size={20} color={Colors.navy} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={styles.actionIcon}
              >
                <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: Fonts.bold, color: Colors.white, fontSize: 18 },
  headerSub: { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  shareBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { padding: 16, paddingBottom: 32 },

  statusCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusTitle: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.navy },
  statusSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, marginTop: 2 },
  urlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  urlText: { flex: 1, fontFamily: Fonts.semibold, fontSize: 13, color: Colors.orange },

  bioCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 14, marginBottom: 16,
  },
  bioRow: { flexDirection: 'row', alignItems: 'center' },
  profileImg: { width: 48, height: 48, borderRadius: 12 },
  profileImgPlaceholder: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  bioText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.semibold, fontSize: 11,
    color: Colors.gray, letterSpacing: 0.8,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.navy, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  addBtnText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.white },

  serviceCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    padding: 12, marginBottom: 10, gap: 12,
  },
  serviceImg: { width: 64, height: 64, borderRadius: 10 },
  serviceImgPlaceholder: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.navy },
  serviceDesc: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, marginTop: 2 },
  servicePrice: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.success, marginTop: 4 },
  serviceActions: { gap: 8 },
  actionIcon: { padding: 4 },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.navy },
  emptySub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.navy,
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.white },
});
