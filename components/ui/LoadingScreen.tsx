import { useEffect, useRef } from 'react';
import { View, Image, Animated, Easing } from 'react-native';
import { Colors } from '@/constants/colors';

export function LoadingScreen() {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 72, height: 72, resizeMode: 'contain' }}
        />
      </Animated.View>
    </View>
  );
}
