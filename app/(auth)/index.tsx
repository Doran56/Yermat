import { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator, ScrollView, Image, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';
import { EULA_URL, PRIVACY_URL } from '@/constants/legal';

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Adresse email invalide');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true, emailRedirectTo: 'yermat://' },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { email: trimmed } });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 120, height: 120, resizeMode: 'contain' }}
          />
          <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 16 }}>
            Bois de l'eau, suis ton hydratation 💧
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700' }}>
            Connexion
          </Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Saisis ton adresse email. On t'envoie un code à 6 chiffres — aucun mot de passe.
          </Text>

          <Input
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            placeholder="ton@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            error={error ?? undefined}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || !email.trim()}
            activeOpacity={0.85}
            style={{
              backgroundColor: Colors.amber[500],
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (!email.trim() || loading) ? 0.5 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '700' }}>Envoyer le code</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={{ color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 32, lineHeight: 18 }}>
          En continuant, tu acceptes nos{' '}
          <Text style={{ color: Colors.brand, fontWeight: '600' }} onPress={() => Linking.openURL(EULA_URL)}>
            conditions d'utilisation (EULA)
          </Text>
          {' '}— tolérance zéro pour tout contenu offensant ou comportement abusif — et notre{' '}
          <Text style={{ color: Colors.brand, fontWeight: '600' }} onPress={() => Linking.openURL(PRIVACY_URL)}>
            politique de confidentialité
          </Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
