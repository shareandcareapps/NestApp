// core/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, spacing, borderRadius } from '../theme/index';
import useAppStore from '../store/index';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'welcome',
    gradient: ['#0F0A1E','#2D1B69','#4A2D9C'],
    iconName: 'leaf',
    iconBg: ['#F4A833','#E68A00'],
    title: 'Welcome to NestApp',
    subtitle: 'WHERE CULTURE MEETS COMMUNITY',
    body: 'The home for Indian, Pakistani, Nepalese, and Arab communities in St. Louis.',
    features: [
      { icon: 'bag-outline',       text: 'Buy & sell within your community' },
      { icon: 'car-outline',       text: 'Share rides with neighbors' },
      { icon: 'newspaper-outline', text: 'Stay updated on community news' },
    ],
  },
  {
    key: 'market',
    gradient: ['#1A0530','#3D0F69','#1A0F3D'],
    iconName: 'storefront',
    iconBg: ['#FF6B6B','#E84393'],
    title: 'Community Marketplace',
    subtitle: 'BUY · SELL · SHARE',
    body: 'Post and browse listings for apartments, jobs, food, and buy/sell items — all within your trusted community.',
    features: [
      { icon: 'business-outline',  text: 'Find accommodation nearby' },
      { icon: 'briefcase-outline', text: 'Discover job opportunities' },
      { icon: 'restaurant-outline',text: 'Buy homemade food & more' },
    ],
  },
  {
    key: 'carpool',
    gradient: ['#051A0F','#0F3D25','#092A1E'],
    iconName: 'car-sport',
    iconBg: ['#00C48C','#007A5E'],
    title: 'Carpool Together',
    subtitle: 'RIDE · SHARE · SAVE',
    body: 'Find or offer rides to the airport, university, temples, and more. Save money, reduce emissions, make friends.',
    features: [
      { icon: 'airplane-outline',  text: 'Airport pickups & drops' },
      { icon: 'school-outline',    text: 'University carpools' },
      { icon: 'leaf-outline',      text: 'Temple & community events' },
    ],
  },
];

function AnimatedIllustration({ slide, isActive }) {
  const float   = useRef(new Animated.Value(0)).current;
  const glow    = useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    if (!isActive) return;
    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -14, duration: 2000, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0,   duration: 2000, useNativeDriver: true }),
      ])
    );
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
      ])
    );
    floatAnim.start();
    glowAnim.start();
    return () => { floatAnim.stop(); glowAnim.stop(); };
  }, [isActive]);

  return (
    <Animated.View style={[illS.wrap, { transform: [{ translateY: float }] }]}>
      {/* Outer glow ring */}
      <Animated.View style={[illS.glowRing, { backgroundColor: slide.iconBg[0] + '18', opacity: glow }]} />

      {/* Glass shell */}
      <View style={illS.glassShell}>
        <LinearGradient
          colors={slide.iconBg}
          style={illS.circle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Specular highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
            style={illS.specular}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name={slide.iconName} size={68} color="rgba(255,255,255,0.92)" />
        </LinearGradient>
      </View>

      {/* Orbiting accent dots */}
      {[0, 1, 2].map(i => (
        <Animated.View key={i} style={[
          illS.orbitDot,
          {
            backgroundColor: slide.iconBg[0] + (60 - i * 15).toString(16),
            width: 10 - i * 2,
            height: 10 - i * 2,
            borderRadius: 10,
            top: 8  + i * 30,
            right: -8 + i * 8,
            opacity: glow,
          },
        ]} />
      ))}
    </Animated.View>
  );
}

const illS = StyleSheet.create({
  wrap:       { alignItems: 'center', position: 'relative' },
  glowRing:   { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  glassShell: {
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24 },
      android: { elevation: 14 },
    }),
  },
  circle:    { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  specular:  { position: 'absolute', top: 0, left: 0, right: 0, height: 70, borderRadius: 75 },
  orbitDot:  { position: 'absolute' },
});

export default function OnboardingScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
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
    navigation.replace(isAuthenticated ? 'Main' : 'Auth');
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
                  <View key={f.text} style={styles.featureRow}>
                    <View style={[styles.featureIconWrap, { backgroundColor: s.iconBg[0] + '28' }]}>
                      <Ionicons name={f.icon} size={16} color={s.iconBg[0]} />
                    </View>
                    <Text style={styles.featureTxt}>{f.text}</Text>
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
              {currentIdx < SLIDES.length - 1 ? (
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.nextBtnTxt}>Let's Go</Text>
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                </View>
              )}
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  featureIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureTxt: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: fonts.sizes.sm, fontWeight: '600' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 16, backgroundColor: '#0F0A1E' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  nextBtnTxt: { color: '#fff', fontSize: fonts.sizes.md, fontWeight: '800', whiteSpace: 'nowrap' },
});
