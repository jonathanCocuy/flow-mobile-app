import React, { useState, useEffect } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

function FlowXLogo({ size = 52, color = '#09090b' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
      <Path d="M7 14h.01" />
      <Path d="M9 5v2" />
      <Path d="M15 5v2" />
    </Svg>
  );
}

export function SplashView() {
  const [logoScale]   = useState(() => new Animated.Value(0.5));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [textOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [logoScale, logoOpacity, textOpacity]);

  return (
    <View style={styles.root}>
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], marginBottom: 22 }}>
        <View style={styles.logoBox}>
          <FlowXLogo size={52} color="#09090b" />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', gap: 6 }}>
        <Text style={styles.brand}>FlowX</Text>
        <Text style={styles.sub}>Your finances, beautifully simple.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb1: {
    position: 'absolute', top: -80, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#10b981', opacity: 0.14,
  },
  orb2: {
    position: 'absolute', bottom: 80, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#3b82f6', opacity: 0.11,
  },
  orb3: {
    position: 'absolute', top: '35%', right: -10,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#f43f5e', opacity: 0.08,
  },
  logoBox: {
    width: 100, height: 100,
    borderRadius: 28,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: '#fafafa',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  sub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
