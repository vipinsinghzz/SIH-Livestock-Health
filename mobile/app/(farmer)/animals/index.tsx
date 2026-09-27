/**
 * Livestock Saathi - Farmer: Animal Inventory List
 * File: mobile/app/(farmer)/animals/index.tsx
 * 
 * Complete livestock herd directory with instant search, species filter chips,
 * health status badges, and registration navigation.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import animalService from '../../../src/services/animalService';
import { Animal } from '../../../src/types/animal';

const SPECIES_OPTIONS = ['All', 'Cattle', 'Buffalo', 'Goat', 'Sheep', 'Pig', 'Poultry', 'Other'];

export default function FarmerAnimalsScreen() {
  const router = useRouter();
  const { t } = useAppLanguage();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('All');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const filteredAnimals = useMemo(() => {
    return animals.filter((animal) => {
      // Species filter
      if (selectedSpecies !== 'All' && animal.species !== selectedSpecies) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = animal.name?.toLowerCase().includes(q);
        const matchesTag = animal.tagId?.toLowerCase().includes(q);
        const matchesBreed = animal.breed?.toLowerCase().includes(q);
        return matchesName || matchesTag || matchesBreed;
      }
      return true;
    });
  }, [animals, selectedSpecies, searchQuery]);

  const getSpeciesEmoji = (species: string) => {
    switch (species) {
      case 'Cattle':
        return '🐄';
      case 'Buffalo':
        return '🐃';
      case 'Goat':
        return '🐐';
      case 'Sheep':
        return '🐑';
      case 'Poultry':
        return '🐔';
      case 'Pig':
        return '🐖';
      default:
        return '🐾';
    }
  };

  const getHealthBadgeStyle = (status: string) => {
    switch (status) {
      case 'Healthy':
        return { bg: colors.light.successBg, text: colors.light.success, label: t('farmer.healthy', 'Healthy') };
      case 'Needs Attention':
        return { bg: colors.light.warningBg, text: colors.light.warning, label: t('farmer.attention', 'Attention') };
      case 'Critical':
        return { bg: colors.light.dangerBg, text: colors.light.danger, label: t('farmer.critical', 'Critical') };
      default:
        return { bg: colors.light.surfaceAlt, text: colors.light.textSecondary, label: status || t('common.unknown', 'Unknown') };
    }
  };

  const renderAnimalItem = ({ item }: { item: Animal }) => {
    const badge = getHealthBadgeStyle(item.healthStatus);
    const targetId = item._id || item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(farmer)/animals/${targetId}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{getSpeciesEmoji(item.species)}</Text>
          </View>

          <View style={styles.details}>
            <View style={styles.titleRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
              {item.isPendingSync && (
                <View style={[styles.badge, { backgroundColor: '#FEF3C7', marginLeft: 6 }]}>
                  <Text style={[styles.badgeText, { color: '#D97706' }]}>⏳ {t('common.offline', 'Pending Sync')}</Text>
                </View>
              )}
            </View>

            <Text style={styles.tagText}>🏷️ {t('farmer.tag', 'Tag ID: {tag}', { tag: item.tagId })}</Text>
            <Text style={styles.metaText}>
              {t(`farmer.${item.species.toLowerCase()}`, item.species)} • {item.breed} • {t('farmer.ageYears', '{age} yrs', { age: item.age })} • {item.gender}
            </Text>

            {item.milkYieldDaily && item.milkYieldDaily !== 'N/A' && (
              <Text style={styles.milkYieldText}>🥛 Daily Milk: {item.milkYieldDaily}</Text>
            )}
          </View>

          <Text style={styles.arrowIcon}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Controls */}
      <View style={styles.topControlSection}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>{t('nav.myLivestock', 'Livestock Inventory')}</Text>
            <Text style={styles.headerSub}>
              {t('farmer.registeredAnimals', '{count} registered in herd', { count: animals.length })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(farmer)/animals/add')}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>{t('farmer.addAnimal', '+ Add Animal')}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search', 'Search by tag, name, or breed...')}
            placeholderTextColor={colors.light.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
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
            const label = item === 'All' ? t('common.all', 'All') : `${getSpeciesEmoji(item)} ${t(`farmer.${item.toLowerCase()}`, item)}`;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => setSelectedSpecies(item)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Error Notice */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={fetchAnimals} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main List / Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>{t('farmer.loadingRecords', 'Loading livestock herd...')}</Text>
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
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            animals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🐄</Text>
                <Text style={styles.emptyTitle}>{t('farmer.noAnimalsYet', 'No Animals Registered Yet')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('farmer.noAnimalsDesc', 'Add your cows, buffaloes, goats, or sheep to maintain medical records, receive vaccination reminders, and screen symptoms.')}
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => router.push('/(farmer)/animals/add')}
                >
                  <Text style={styles.emptyAddBtnText}>{t('farmer.registerFirstAnimal', '+ Register First Animal')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔎</Text>
                <Text style={styles.emptyTitle}>No Matching Livestock</Text>
                <Text style={styles.emptySubtitle}>
                  No animals found matching &ldquo;{searchQuery || selectedSpecies}&rdquo;. Try adjusting your filters.
                </Text>
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedSpecies('All');
                  }}
                >
                  <Text style={styles.clearFilterBtnText}>Reset Search Filters</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  topControlSection: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  headerSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    ...shadows.sm,
  },
  addButtonText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.light.textMuted,
  },
  speciesList: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.round,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginRight: spacing.xs,
  },
  filterChipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textSecondary,
  },
  filterChipTextSelected: {
    color: colors.light.textInverse,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.light.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  details: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nameText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    flex: 1,
    marginRight: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  tagText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  milkYieldText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primary,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 24,
    color: colors.light.textMuted,
    marginLeft: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.light.dangerBg,
    margin: spacing.base,
    padding: spacing.md,
    borderRadius: radii.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  retryButtonText: {
    color: colors.light.danger,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.base,
  },
  emptyAddBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  emptyAddBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  clearFilterBtn: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  clearFilterBtnText: {
    color: colors.light.textSecondary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
  },
});
