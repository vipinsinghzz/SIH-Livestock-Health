/**
 * PashuCare - Kisan Saathi AI Types
 * File: mobile/src/types/kisanSaathi.ts
 * 
 * Defines strong TypeScript models for the Kisan Saathi AI conversational assistant,
 * matching the backend POST /api/kisan-saathi/consult contract.
 */

export type KisanSaathiLanguage = 'en' | 'hi' | 'mr';

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Pending';

export interface KisanSaathiAnimalContext {
  name?: string;
  species?: string;
  breed?: string;
  age?: number;
  gender?: string;
  healthStatus?: string;
  milkYield?: number | string;
}

export interface KisanSaathiHistoryMessage {
  sender: 'user' | 'saathi';
  text: string;
}

export interface KisanSaathiConsultRequest {
  query: string;
  language: string;
  animalId?: string;
  animal?: KisanSaathiAnimalContext;
  diagnosis?: unknown;
  symptoms?: string[];
  district?: string;
  state?: string;
  lat?: number;
  lng?: number;
  conversationHistory?: KisanSaathiHistoryMessage[];
}

export interface KisanSaathiConsultResponse {
  success: boolean;
  reply: string;
  riskLevel?: RiskLevel;
  keyAdvice?: string[];
  intent?: string;
  model?: string;
  isAIPowered?: boolean;
  suggestedActions?: string[];
  timestamp?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'saathi';
  text: string;
  timestamp: string;
  riskLevel?: RiskLevel;
  keyAdvice?: string[];
  suggestedActions?: string[];
  isAIPowered?: boolean;
  model?: string;
  intent?: string;
}
