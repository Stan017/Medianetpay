import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { loginWithEmail, loginWithGoogleIdToken, getProfile } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Colors, Fonts } from '../theme';

const NAVY      = Colors.navy;
const ORANGE    = Colors.orange;
const BG        = Colors.bg;
const GRAY      = Colors.gray;
const BORDER    = Colors.border;
const ERROR_BG  = '#fef2f2';
const ERROR_CLR = Colors.error;

const redirectUri = makeRedirectUri({ scheme: 'medianetpay' });

export default function LoginScreen() {
  const { setAuth } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Constants.expoConfig?.extra?.googleWebClientId ?? '',
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) handleGoogleCallback(idToken);
    } else if (response?.type === 'error') {
      setError('Error con Google. Intenta de nuevo.');
    }
  }, [response]);

  async function handleGoogleCallback(idToken: string) {
    setLoading(true);
    setError('');
    try {
      const auth    = await loginWithGoogleIdToken(idToken);
      const profile = await getProfile();
      await setAuth(auth.access_token, profile);
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      setError('Ingresa tu email y contraseña');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const auth    = await loginWithEmail(email.trim(), password);
      const profile = await getProfile();
      await setAuth(auth.access_token, profile);
    } catch (err: any) {
      setError(err.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Ingresa tus credenciales para continuar</Text>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={ERROR_CLR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={18} color={GRAY} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor="#a0aec0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Contraseña */}
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={18} color={GRAY} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#a0aec0"
                secureTextEntry={!showPw}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleEmailLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPw((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name={showPw ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={GRAY}
                />
              </TouchableOpacity>
            </View>

            {/* Botón Iniciar Sesión */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.loginBtnInner}>
                  <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O CONTINÚA CON</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.googleBtn, (!request || loading) && { opacity: 0.6 }]}
              onPress={() => { setError(''); promptAsync(); }}
              disabled={!request || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>Google</Text>
            </TouchableOpacity>

            {/* Registro */}
            <Text style={styles.registerHint}>
              ¿No tienes una cuenta?{' '}
              <Text style={{ color: ORANGE, fontFamily: 'Outfit_700Bold' }}>
                medianetpay.ec
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 32 },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoImg:  { width: 354, height: 114 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  title:    { fontFamily: 'Outfit_800ExtraBold', fontSize: 24, color: NAVY, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontFamily: 'Outfit_400Regular',   fontSize: 14, color: GRAY, textAlign: 'center', marginBottom: 22 },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ERROR_BG,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { fontFamily: 'Outfit_600SemiBold', color: ERROR_CLR, fontSize: 13, flex: 1 },

  // Inputs
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#111827',
  },
  eyeBtn: { padding: 4 },

  // Login button
  loginBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
  loginBtnInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginBtnText:     { fontFamily: 'Outfit_700Bold', color: '#fff', fontSize: 16 },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: '#94a3b8', letterSpacing: 0.5 },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  googleG:    { fontSize: 16, fontWeight: '900', color: '#4285F4', fontFamily: 'Outfit_900Black' },
  googleText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#374151' },

  // Footer
  registerHint: {
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: GRAY,
  },
});
