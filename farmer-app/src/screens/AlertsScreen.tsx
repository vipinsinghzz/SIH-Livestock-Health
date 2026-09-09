import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_ALERTS = [
  { id: '1', type: 'VACCINATION_DUE', title: 'Vaccination Due', message: 'Bessie is due for FMD vaccination in 3 days.', time: '2 hours ago', isRead: false },
  { id: '2', type: 'CASE_UPDATED', title: 'Vet Case Updated', message: 'Dr. Smith reviewed Daisy\'s screening.', time: '1 day ago', isRead: true },
];

export default function AlertsScreen() {
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, !item.isRead && styles.unreadCard]}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.type === 'VACCINATION_DUE' ? 'medical' : 'notifications'} size={24} color="#3B82F6" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={MOCK_ALERTS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<Text style={styles.headerTitle}>Alerts & Notifications</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  listContainer: { padding: 20 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#1F2937', marginBottom: 20, marginTop: 10 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  contentContainer: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
  unreadText: { fontWeight: 'bold', color: '#111827' },
  message: { fontSize: 16, color: '#6B7280', marginBottom: 8, lineHeight: 22 },
  time: { fontSize: 12, color: '#9CA3AF' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', alignSelf: 'center' }
});
