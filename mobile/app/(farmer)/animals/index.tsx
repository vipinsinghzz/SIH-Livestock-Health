/**
 * PashuCare - Farmer: My Livestock Inventory (Luxury Biophilic Redesign)
 * File: mobile/app/(farmer)/animals/index.tsx
 * 
 * Redesigned using UI/UX Pro Max Intelligence:
 * - Full-bleed biophilic organic header with custom safe-area top bar
 * - Hand-painted circular species avatars (avatar_cow, avatar_goat, avatar_sheep, avatar_buffalo)
 * - Tactile status-ringed animal cards with breed, age, and tag ID
 * - Quick herd health summary badges (Total, Healthy, Attention)
 * - Live search and filter chips with counts
 * - Floating bottom navigation bar matching the dashboard (with "My Herd" selected)
 * - Floating Kisan Saathi AI chat bot with continuous smooth levitation hover motion
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLanguage } from '../../../src/services/i18n';
import animalService from '../../../src/services/animalService';
import { Animal } from '../../../src/types/animal';

// Native typography stack for reliable rendering
const FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });
const FONT_MEDIUM = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_SEMIBOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });
const FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif' });

const SPECIES_OPTIONS = ['All', 'Cattle', 'Buffalo', 'Goat', 'Sheep'];
const CONDITION_OPTIONS = ['All', 'Healthy', 'Needs Attention', 'Critical'];

export default function FarmerAnimalsScreen() {
  const router = useRouter();
  const { t, isEnglish } = useAppLanguage();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Floating up/down levitation animation for AI bot
  const botFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(botFloatAnim, {
          toValue: -7,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(botFloatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatingLoop.start();
    return () => floatingLoop.stop();
  }, [botFloatAnim]);

  const fetchAnimals = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await animalService.getAnimals();
      setAnimals(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to fetch livestock list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnimals();
  }, [fetchAnimals]);

  // Herd health metrics
  const healthStats = useMemo(() => {
    let healthyCount = 0;
    let attentionCount = 0;
    let criticalCount = 0;

    animals.forEach((a) => {
      if (a.healthStatus === 'Critical') {
        criticalCount++;
      } else if (a.healthStatus === 'Needs Attention') {
        attentionCount++;
      } else {
        healthyCount++;
      }
    });

    return {
      healthy: healthyCount,
      attention: attentionCount + criticalCount,
    };
  }, [animals]);

  // Condition counts for chips
  const conditionCounts = useMemo(() => {
    let healthy = 0;
    let attention = 0;
    let critical = 0;
    animals.forEach((a) => {
      const s = (a.healthStatus || 'Healthy').toLowerCase().trim();
      if (s === 'critical') critical++;
      else if (s === 'needs attention' || s.includes('attention') || s.includes('urgent') || s.includes('risk')) attention++;
      else healthy++;
    });
    return {
      All: animals.length,
      Healthy: healthy,
      'Needs Attention': attention,
      Critical: critical,
    };
  }, [animals]);

  // Species counts for chips
  const speciesCounts = useMemo(() => {
    const counts: Record<string, number> = { All: animals.length };
    SPECIES_OPTIONS.forEach((sp) => {
      if (sp !== 'All') {
        counts[sp] = animals.filter(
          (a) => a.species?.toLowerCase() === sp.toLowerCase() ||
                 (sp === 'Cattle' && (a.species?.toLowerCase() === 'cow' || a.species?.toLowerCase() === 'cattle'))
        ).length;
      }
    });
    return counts;
  }, [animals]);

  // Priority order for sorting: Critical (0) -> Needs Attention / Risk (1) -> Other intermediate (2) -> Healthy (3)
  const getHealthPriority = (status?: string): number => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'critical') return 0; // Highest priority (at the top)
    if (
      s === 'needs attention' ||
      s.includes('attention') ||
      s.includes('urgent') ||
      s.includes('risk') ||
      s.includes('sick') ||
      s.includes('danger')
    ) {
      return 1; // Needs medical attention (in between)
    }
    if (s === 'healthy' || s === 'normal') {
      return 3; // Lowest priority (at the bottom)
    }
    return 2; // Any intermediate / unknown status in between
  };

  // Filtering & Default Health-Priority Sorting
  const filteredAnimals = useMemo(() => {
    const list = animals.filter((animal) => {
      if (selectedSpecies !== 'All') {
        const spLower = selectedSpecies.toLowerCase();
        const animalSp = animal.species?.toLowerCase();
        if (spLower === 'cattle') {
          if (animalSp !== 'cattle' && animalSp !== 'cow') return false;
        } else if (animalSp !== spLower) {
          return false;
        }
      }
      if (selectedCondition !== 'All') {
        const condLower = selectedCondition.toLowerCase();
        const statusLower = (animal.healthStatus || 'Healthy').toLowerCase();
        if (condLower === 'healthy') {
          if (statusLower !== 'healthy' && statusLower !== 'normal') return false;
        } else if (condLower === 'needs attention') {
          if (!statusLower.includes('attention') && !statusLower.includes('urgent') && !statusLower.includes('risk')) return false;
        } else if (condLower === 'critical') {
          if (statusLower !== 'critical') return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = animal.name?.toLowerCase().includes(q);
        const matchesTag = animal.tagId?.toLowerCase().includes(q);
        const matchesBreed = animal.breed?.toLowerCase().includes(q);
        return matchesName || matchesTag || matchesBreed;
      }
      return true;
    });

    // Sort by default: Critical at top (0), Healthy at lowest priority (3), rest in between (1, 2)
    return [...list].sort((a, b) => {
      const priorityA = getHealthPriority(a.healthStatus);
      const priorityB = getHealthPriority(b.healthStatus);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary tie-breaker: newest animals first
      const dateA = a.createdAt || a.updatedAt ? new Date(a.createdAt || a.updatedAt || '').getTime() : 0;
      const dateB = b.createdAt || b.updatedAt ? new Date(b.createdAt || b.updatedAt || '').getTime() : 0;
      if (dateB !== dateA && !isNaN(dateB) && !isNaN(dateA)) {
        return dateB - dateA;
      }

      // Tertiary tie-breaker: name
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [animals, selectedSpecies, selectedCondition, searchQuery]);

  // Hand-painted species avatars
  const getSpeciesAvatar = (species: string) => {
    switch (species?.toLowerCase()) {
      case 'cattle':
      case 'cow':
        return require('../../../assets/avatar_cow.png');
      case 'buffalo':
        return require('../../../assets/avatar_buffalo.png');
      case 'goat':
        return require('../../../assets/avatar_goat.png');
      case 'sheep':
        return require('../../../assets/avatar_sheep.png');
      default:
        return require('../../../assets/avatar_cow.png');
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'Needs Attention':
        return {
          bg: '#FEF3C7',
          border: '#FDE68A',
          text: '#B45309',
          dot: '#D97706',
          label: isEnglish ? '▲ Attention' : '▲ ध्यान दें',
        };
      case 'Critical':
        return {
          bg: '#FEE2E2',
          border: '#FECACA',
          text: '#B91C1C',
          dot: '#EF4444',
          label: isEnglish ? '● Critical' : '● गंभीर',
        };
      case 'Healthy':
      default:
        return {
          bg: '#DCFCE7',
          border: '#BBF7D0',
          text: '#15803D',
          dot: '#16A34A',
          label: isEnglish ? '● Healthy' : '● स्वस्थ',
        };
    }
  };

  const renderAnimalItem = ({ item }: { item: Animal }) => {
    const badge = getHealthBadge(item.healthStatus);
    const targetId = item._id || item.id;
    const avatar = getSpeciesAvatar(item.species);

    return (
      <TouchableOpacity
        style={styles.animalCard}
        onPress={() => router.push(`/(farmer)/animals/${targetId}` as any)}
        activeOpacity={0.82}
      >
        <View style={styles.cardContentRow}>
          {/* Avatar with Status Ring */}
          <View style={[styles.avatarRing, { borderColor: badge.dot }]}>
            <Image source={avatar} style={styles.avatarImg} resizeMode="cover" />
          </View>

          {/* Details */}
          <View style={styles.cardDetailsCol}>
            {/* Name + Health Badge */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.animalNameText} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.healthBadgePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={[styles.healthBadgePillText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            </View>

            {/* Tag ID */}
            <View style={styles.tagIdRow}>
              <View style={styles.tagIdChip}>
                <Text style={styles.tagIdText} numberOfLines={1}>
                  🏷️ {item.tagId}
                </Text>
              </View>
              {item.isPendingSync && (
                <View style={styles.syncBadge}>
                  <Text style={styles.syncBadgeText}>⏳ {isEnglish ? 'Pending' : 'लंबित'}</Text>
                </View>
              )}
            </View>

            {/* Meta: Breed • Age • Gender */}
            <Text style={styles.animalMetaText} numberOfLines={1}>
              {item.breed || item.species} • {item.age ? `${item.age} ${isEnglish ? 'yrs' : 'वर्ष'}` : ''} {item.gender ? `• ${item.gender}` : ''}
            </Text>
          </View>

          {/* Right Chevron */}
          <View style={styles.cardChevronBtn}>
            <Text style={styles.cardChevronText}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ======================================================== */}
        {/* TOP APP BAR & ACTIONS */}
        {/* ======================================================== */}
        <View style={styles.topAppBar}>
          <View style={styles.topAppBarLeft}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.backArrowText}>←</Text>
            </TouchableOpacity>

            <View style={styles.appBarTitleCol}>
              <View style={styles.titleWithBadgeRow}>
                <Text style={styles.appBarTitle}>
                  {isEnglish ? 'My Livestock' : 'मेरे पशु'}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{animals.length}</Text>
                </View>
              </View>
              <Text style={styles.appBarSub}>
                {isEnglish ? 'Complete herd directory' : 'पशुधन सूची एवं स्वास्थ्य स्थिति'}
              </Text>
            </View>
          </View>

          {/* Register Animal Action Button */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/(farmer)/animals/add')}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>
              {isEnglish ? '+ Add' : '+ जोड़ें'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* QUICK HERD HEALTH SUMMARY PILLS */}
        {/* ======================================================== */}
        <View style={styles.statsSummaryDeck}>
          <TouchableOpacity
            style={[styles.statMiniCard, selectedCondition === 'All' && { backgroundColor: '#E2E8F0' }]}
            onPress={() => setSelectedCondition('All')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statMiniVal, { color: '#0F5132' }]}>{animals.length}</Text>
            <Text style={styles.statMiniLbl}>{isEnglish ? 'Total Herd' : 'कुल पशु'}</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={[styles.statMiniCard, selectedCondition === 'Healthy' && { backgroundColor: '#DCFCE7' }]}
            onPress={() => setSelectedCondition(selectedCondition === 'Healthy' ? 'All' : 'Healthy')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statMiniVal, { color: '#16A34A' }]}>{healthStats.healthy}</Text>
            <Text style={styles.statMiniLbl}>{isEnglish ? 'Healthy' : 'स्वस्थ'}</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={[styles.statMiniCard, (selectedCondition === 'Needs Attention' || selectedCondition === 'Critical') && { backgroundColor: '#FEF3C7' }]}
            onPress={() => setSelectedCondition(selectedCondition === 'Needs Attention' ? 'All' : 'Needs Attention')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statMiniVal, { color: healthStats.attention > 0 ? '#D97706' : '#64748B' }]}>
              {healthStats.attention}
            </Text>
            <Text style={styles.statMiniLbl}>{isEnglish ? 'Attention' : 'ध्यान दें'}</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* SEARCH & FILTER CONTROLS */}
        {/* ======================================================== */}
        <View style={styles.searchFilterWrapper}>
          {/* Search Box */}
          <View style={styles.searchBar}>
            <Image
              source={require('../../../assets/icons/icon_search.png')}
              style={styles.searchVectorIcon}
              resizeMode="contain"
            />
            <TextInput
              style={styles.searchInput}
              placeholder={isEnglish ? 'Search by tag, name, breed...' : 'टैग, नाम, नस्ल खोजें...'}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Species Filter Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SPECIES_OPTIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.speciesList}
            renderItem={({ item }) => {
              const isSelected = selectedSpecies === item;
              const count = speciesCounts[item] ?? 0;
              const label =
                item === 'All'
                  ? (isEnglish ? 'All Species' : 'सभी प्रजातियां')
                  : item === 'Cattle'
                  ? (isEnglish ? 'Cattle' : 'गाय')
                  : item === 'Buffalo'
                  ? (isEnglish ? 'Buffalo' : 'भैंस')
                  : item === 'Goat'
                  ? (isEnglish ? 'Goat' : 'बकरी')
                  : (isEnglish ? 'Sheep' : 'भेड़');

              return (
                <TouchableOpacity
                  style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                  onPress={() => setSelectedSpecies(item)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                    {label} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Condition Filter Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CONDITION_OPTIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={[styles.speciesList, { marginTop: 8 }]}
            renderItem={({ item }) => {
              const isSelected = selectedCondition === item;
              const count = conditionCounts[item as keyof typeof conditionCounts] ?? 0;
              const label =
                item === 'All'
                  ? (isEnglish ? 'All Status' : 'सभी स्थिति')
                  : item === 'Healthy'
                  ? (isEnglish ? '● Healthy' : '● स्वस्थ')
                  : item === 'Needs Attention'
                  ? (isEnglish ? '▲ Attention' : '▲ ध्यान दें')
                  : (isEnglish ? '● Critical' : '● गंभीर');

              const isCrit = item === 'Critical';
              const isAttn = item === 'Needs Attention';
              const isHlth = item === 'Healthy';

              return (
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipSelected,
                    isSelected && isCrit && { backgroundColor: '#DC2626', borderColor: '#B91C1C' },
                    isSelected && isAttn && { backgroundColor: '#D97706', borderColor: '#B45309' },
                    isSelected && isHlth && { backgroundColor: '#15803D', borderColor: '#166534' },
                  ]}
                  onPress={() => setSelectedCondition(isSelected && item !== 'All' ? 'All' : item)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextSelected,
                    ]}
                  >
                    {label} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Sort Priority Indicator */}
        <View style={styles.sortPriorityBar}>
          <View style={styles.sortPriorityLeft}>
            <View style={styles.sortIndicatorDot} />
            <Text style={styles.sortPriorityLabel}>
              {isEnglish ? 'Health Triage Order' : 'स्वास्थ्य प्राथमिकता क्रम'}
            </Text>
          </View>
          <Text style={styles.sortPrioritySub}>
            {isEnglish ? 'Critical  ▸  Attention  ▸  Healthy' : 'गंभीर  ▸  ध्यान दें  ▸  स्वस्थ'}
          </Text>
        </View>

        {/* Error Notice */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            <TouchableOpacity onPress={fetchAnimals} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{isEnglish ? 'Retry' : 'पुनः प्रयास'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* MAIN LIST / CONTENT */}
        {/* ======================================================== */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0F5132" />
            <Text style={styles.loadingText}>
              {isEnglish ? 'Loading livestock herd...' : 'पशुधन लोड हो रहा है...'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAnimals}
            keyExtractor={(item) => item._id || item.tagId}
            renderItem={renderAnimalItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0F5132']}
                tintColor="#0F5132"
              />
            }
            ListEmptyComponent={
              animals.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyAvatarBox}>
                    <Image
                      source={require('../../../assets/avatar_cow.png')}
                      style={styles.emptyAvatarImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {isEnglish ? 'No Animals Registered Yet' : 'कोई पशु पंजीकृत नहीं है'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {isEnglish
                      ? 'Add your cows, buffaloes, goats, or sheep to track medical history, vaccination reminders, and AI health diagnoses.'
                      : 'टीकाकरण अनुसूची, स्वास्थ्य रिकॉर्ड और AI रोग निदान के लिए अपने पशु को पंजीकृत करें।'}
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => router.push('/(farmer)/animals/add')}
                  >
                    <Text style={styles.emptyAddBtnText}>
                      {isEnglish ? '+ Register First Animal' : '+ पहला पशु पंजीकृत करें'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptySearchIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>
                    {isEnglish ? 'No Matching Livestock' : 'कोई पशु नहीं मिला'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {isEnglish
                      ? `No animals match "${searchQuery || selectedSpecies}". Try adjusting your filters.`
                      : `"${searchQuery || selectedSpecies}" से मेल खाता कोई पशु नहीं मिला।`}
                  </Text>
                  <TouchableOpacity
                    style={styles.clearFilterBtn}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedSpecies('All');
                    }}
                  >
                    <Text style={styles.clearFilterBtnText}>
                      {isEnglish ? 'Reset Search Filters' : 'फ़िल्टर रीसेट करें'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )}
      </SafeAreaView>

      {/* ======================================================== */}
      {/* 8. FLOATING KISAN SAATHI AI BOT (SMOOTH HOVER LEVITATION) */}
      {/* ======================================================== */}
      <Animated.View
        style={[
          styles.floatingAiBotWrapper,
          { transform: [{ translateY: botFloatAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.floatingAiBot}
          onPress={() => router.push('/(farmer)/kisan-saathi' as any)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Kisan Saathi AI Assistant"
        >
          <Image
            source={require('../../../assets/icons/floating_bot.png')}
            style={styles.floatingAiIcon}
            resizeMode="contain"
          />
          <View style={styles.floatingAiPill}>
            <Text style={styles.floatingAiPillText}>AI</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ======================================================== */}
      {/* 9. FLOATING BOTTOM NAVIGATION DOCK (MY HERD ACTIVE) */}
      {/* ======================================================== */}
      <View style={styles.floatingNavContainer} pointerEvents="box-none">
        <View style={styles.bottomNavDock}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => router.push('/(farmer)')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            accessibilityLabel={isEnglish ? 'Home' : 'होम'}
          >
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../../assets/icons/nav_home.png')}
                style={[styles.navIconImage, { tintColor: '#334155' }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navTabLabel}>{isEnglish ? 'Home' : 'होम'}</Text>
          </TouchableOpacity>

          {/* Tab 2: My Herd (ACTIVE ON THIS PAGE) */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {}}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: true }}
            accessibilityLabel={isEnglish ? 'My Herd' : 'मेरे पशु'}
          >
            <View style={styles.navActiveIconBadge}>
              <Image
                source={require('../../../assets/icons/nav_cow.png')}
                style={[styles.navIconImage, { width: 28, height: 28, tintColor: '#0F5132' }]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.navTabLabel, styles.navTabLabelActive]}>
              {isEnglish ? 'My Herd' : 'मेरे पशु'}
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Center Elevated Scan */}
          <TouchableOpacity
            style={styles.navCenterScanItem}
            onPress={() => router.push('/(farmer)/ai-scan' as any)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={isEnglish ? 'AI Disease Scan' : 'रोग स्कैन'}
          >
            <View style={styles.navCenterScanCircle}>
              <Image
                source={require('../../../assets/icons/nav_scan.png')}
                style={styles.navCenterScanIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navCenterScanLabel}>{isEnglish ? 'Scan' : 'स्कैन'}</Text>
          </TouchableOpacity>

          {/* Tab 4: Services */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => router.push('/(farmer)/vaccination' as any)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            accessibilityLabel={isEnglish ? 'Services' : 'सेवाएं'}
          >
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../../assets/icons/nav_grid.png')}
                style={[styles.navIconImage, { tintColor: '#334155' }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navTabLabel}>{isEnglish ? 'Services' : 'सेवाएं'}</Text>
          </TouchableOpacity>

          {/* Tab 5: Profile */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => router.push('/(farmer)/profile' as any)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            accessibilityLabel={isEnglish ? 'Profile' : 'प्रोफाइल'}
          >
            <View style={styles.navInactiveIconBox}>
              <Image
                source={require('../../../assets/icons/nav_profile.png')}
                style={[styles.navIconImage, { tintColor: '#334155' }]}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navTabLabel}>{isEnglish ? 'Profile' : 'प्रोफाइल'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  safeArea: {
    flex: 1,
  },

  /* 1. Top App Bar */
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topAppBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backArrowText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: -2,
  },
  appBarTitleCol: {
    flex: 1,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appBarTitle: {
    fontSize: 20,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countBadgeText: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
  },
  appBarSub: {
    fontSize: 11.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginTop: 2,
  },
  registerBtn: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },

  /* 2. Quick Stats Summary Deck */
  statsSummaryDeck: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8EFEA',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#072A1B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statMiniCard: {
    alignItems: 'center',
    flex: 1,
  },
  statMiniVal: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },
  statMiniLbl: {
    fontSize: 10.5,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  /* 3. Search & Filter Controls */
  searchFilterWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchVectorIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#94A3B8',
  },
  sortPriorityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sortPriorityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  sortPriorityLabel: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    color: '#475569',
  },
  sortPrioritySub: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#94A3B8',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    color: '#0F172A',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  speciesList: {
    gap: 8,
    paddingBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 4,
  },
  filterChipSelected: {
    backgroundColor: '#0F5132',
    borderColor: '#0F5132',
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },

  /* 4. Animal Cards List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 165, // Generous clearance for floating bottom dock & AI bot
  },
  animalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: '#E8EFEA',
    ...Platform.select({
      ios: {
        shadowColor: '#072A1B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    padding: 2,
    backgroundColor: '#F0FDF4',
    marginRight: 13,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  animalNameText: {
    fontSize: 16,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  healthBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  healthBadgePillText: {
    fontSize: 10.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
  },
  tagIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tagIdChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  tagIdText: {
    fontSize: 11,
    fontFamily: FONT_MEDIUM,
    fontWeight: '600',
    color: '#475569',
  },
  syncBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  syncBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    color: '#D97706',
    fontWeight: '700',
  },
  animalMetaText: {
    fontSize: 12,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    marginBottom: 2,
  },
  cardChevronBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardChevronText: {
    fontSize: 18,
    color: '#64748B',
    marginTop: -2,
    fontWeight: '600',
  },

  /* 5. Centered & Empty States */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONT_MEDIUM,
    color: '#64748B',
    marginTop: 12,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#DC2626',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    fontSize: 11,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyAvatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  emptyAvatarImg: {
    width: '100%',
    height: '100%',
  },
  emptySearchIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_REGULAR,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: '#0F5132',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#0F5132',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    fontSize: 13,
  },
  clearFilterBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  clearFilterBtnText: {
    color: '#475569',
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    fontSize: 12,
  },

  /* 8. Floating Kisan Saathi AI Bot */
  floatingAiBotWrapper: {
    position: 'absolute',
    bottom: 104,
    right: 18,
    zIndex: 998,
  },
  floatingAiBot: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#107C41',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  floatingAiIcon: {
    width: 61,
    height: 61,
    borderRadius: 30.5,
  },
  floatingAiPill: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingAiPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
  },

  /* 9. Floating Bottom Navigation Dock */
  floatingNavContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 999,
  },
  bottomNavDock: {
    width: '100%',
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    borderWidth: 1.2,
    borderColor: '#E2EBE5',
    ...Platform.select({
      ios: {
        shadowColor: '#072A1B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  navActiveIconBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 124, 65, 0.15)',
  },
  navInactiveIconBox: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterScanItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  navCenterScanCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F5132',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#107C41',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.38,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  navIconImage: {
    width: 26,
    height: 26,
  },
  navCenterScanIcon: {
    width: 28,
    height: 28,
  },
  navCenterScanLabel: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    color: '#0F5132',
    marginTop: 2,
  },
  navTabLabel: {
    fontSize: 11.5,
    fontFamily: FONT_BOLD,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  navTabLabelActive: {
    color: '#0F5132',
    fontFamily: FONT_BOLD,
    fontWeight: '800',
    fontSize: 11.5,
    marginTop: 2,
  },
});
