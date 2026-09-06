import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Mock Data
const MOCK_ANIMALS = [
  { id: '1', name: 'Bessie', species: 'Cow', risk_level: 'LOW' },
  { id: '2', name: 'Thunder', species: 'Horse', risk_level: 'MEDIUM' },
  { id: '3', name: 'Daisy', species: 'Goat', risk_level: 'HIGH' }
];

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'LOW': return '#4CAF50';
    case 'MEDIUM': return '#FFC107';
    case 'HIGH': return '#FF5722';
    case 'CRITICAL': return '#F44336';
    default: return '#9E9E9E';
  }
};

export default function MyAnimalsScreen() {
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.species}>{item.species}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getRiskColor(item.risk_level) }]}>
          <Text style={styles.badgeText}>{item.risk_level}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={MOCK_ANIMALS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<Text style={styles.title}>My Livestock</Text>}
      />
      
      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // For FAB
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 100, // Large tap target
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  species: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }
});
