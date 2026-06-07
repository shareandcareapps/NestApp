// core/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, spacing, borderRadius } from '../theme/index';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'welcome',
    gradient: ['#0F0A1E','#2D1B69','#4A2D9C'],
    icon: '🏡',
    iconBg: ['#F4A833','#E68A00'],
    title: 'Welcome to NestApp',
    subtitle: 'WHERE CULTURE MEETS COMMUNITY',
    body: 'The home for Indian, Pakistani, Nepalese, and Arab communities in St. Louis.',
    features: ['🛍️ Buy & sell within your community', '🚗 Share rides with neighbors', '📰 Stay updated on community news'],
  },
  {
    key: 'market',
    gradient: ['#1A0530','#3D0F69','#FF6B6B30'],
    icon: '🛍️',
    iconBg: ['#FF6B6B','#E84393'],
    title: 'Community Marketplace',
    subtitle: 'BUY · SELL · SHARE',
    body: 'Post and browse listings for apartments, jobs, food, and buy/sell items — all within your trusted community.',
    features: ['🏠 Find accommodation nearby', '💼 Discover job opportunities', '🍛 Buy homemade food & more'],
  },
  {
    key: 'carpool',
    gradient: ['#051A0F','#0F3D25','#00C48C30'],
    icon: '🚗',
    iconBg: ['#00C48C','#007A5E'],
    title: 'Carpool Together',
    subtitle: 'RIDE · SHARE · SAVE',
    body: 'Find or offer rides to the airport, university, temples, and more. Save money, reduce emissions, make friends.',
    features: ['✈️ Airport pickups & drops', '🎓 University carpools', '🛕 Temple & community events'],
  },
];

function AnimatedIllustration({ slide, isActive }) {
  const float = useRef(new Animated.Value(0)).current;
  const spin  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!isActive) return;
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -14, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    floatAnim.start();
    return () => floatAnim.stop();
  }, [isActive]);

  return (
    <Animated.View style={[illS.wrap, { transform: [{ translateY: float }] }]}>
      <LinearGradient colors={slide.iconBg} style={illS.circle} start={{x:0,y:0}} end={{x:1,y:1}}>
        <Text style={illS.icon}>{slide.icon}</Text>
      </LinearGradient>
      {/* Orbiting dots */}
      {[0,1,2].map(i => (
        <View key={i} style={[illS.orbitDot, {
          top: 10 + i * 28,
          right: -10 + i * 6,
          backgroundColor: slide.iconBg[0] + '60',
          width: 10 - i * 2,
          height: 10 - i * 2,
          borderRadius: 10,
        }]} />
      ))}
    </Animated.View>
  );
}

const illS = StyleSheet.create({
  wrap: { alignItems: 'center', position: 'relative' },
  circle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 64 },
  orbitDot: { position: 'absolute' },
});

export default function OnboardingScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  function goTo(idx) {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    setCurrentIdx(idx);
    Animated.spring(progressAnim, { toValue: idx, useNativeDriver: false }).start();
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIdx < SLIDES.length - 1) {
      goTo(currentIdx + 1);
    } else {
      handleFinish();
    }
  }

  async function handleFinish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try { await AsyncStorage.setItem('@nest_onboarded', 'true'); } catch (_) {}
    navigation.replace('Main');
  }

  const slide = SLIDES[currentIdx];

  const btnWidth = progressAnim.interpolate({
    inputRange: [0, SLIDES.length - 1],
    outputRange: [60, 160],
  });

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, idx) => (
          <LinearGradient key={s.key} colors={s.gradient} style={[styles.slide, { paddingTop: insets.top + 20 }]}>
            {/* Skip */}
            {idx < SLIDES.length - 1 && (
              <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
                <Text style={styles.skipTxt}>Skip</Text>
              </TouchableOpacity>
            )}

            {/* Illustration */}
            <View style={styles.illustrationWrap}>
              <AnimatedIllustration slide={s} isActive={currentIdx === idx} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.subtitle}>{s.subtitle}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>

              <View style={styles.featuresList}>
                {s.features.map(f => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureTxt}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <Animated.View style={[styles.dot, {
                backgroundColor: i === currentIdx ? '#F4A833' : 'rgba(255,255,255,0.3)',
                width: i === currentIdx ? 24 : 8,
              }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <Animated.View style={{ width: btnWidth, overflow: 'hidden', borderRadius: borderRadius.full }}>
            <LinearGradient colors={['#F4A833','#E68A00']} style={styles.nextBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
              {currentIdx < SLIDES.length - 1
                ? <Ionicons name="arrow-forward" size={22} color="#fff" />
                : <Text style={styles.nextBtnTxt}>Let's Go 🚀</Text>
              }
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0A1E' },
  slide: { width, flex: 1, alignItems: 'center' },
  skipBtn: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 10 },
  skipTxt: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.sm, fontWeight: '600' },
  illustrationWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 28, paddingBottom: 20, alignItems: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 34, marginBottom: 14 },
  body: { color: 'rgba(255,255,255,0.65)', fontSize: fonts.sizes.md, textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  featuresList: { gap: 10, width: '100%' },
  featureRow: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: borderRadius.lg, paddingVertical: 12, paddingHorizontal: 16 },
  featureTxt: { color: 'rgba(255,255,255,0.8)', fontSize: fonts.sizes.sm, fontWeight: '600' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 16, backgroundColor: '#0F0A1E' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  nextBtnTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800', whiteSpace: 'nowrap' },
});
