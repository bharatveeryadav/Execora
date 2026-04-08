import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Customer } from "@execora/shared";
import { COLORS } from "../../../lib/constants";

export interface CustomerSectionProps {
  selectedCustomer: Customer | null;
  customerQuery: string;
  showCustSuggest: boolean;
  searchingCustomers: boolean;
  customerSuggestions: Customer[];
  outstandingBalance: number;
  createWalkInPending: boolean;
  inr: (n: number) => string;
  onCreateWalkIn: () => void;
  onChangeCustomer: () => void;
  onCustomerQueryChange: (query: string) => void;
  onCustomerInputFocus: () => void;
  onCustomerInputBlur: () => void;
  onSelectSuggestion: (customer: Customer) => void;
  onAddNewCustomer: (name: string) => void;
}

export function CustomerSection({
  selectedCustomer,
  customerQuery,
  showCustSuggest,
  searchingCustomers,
  customerSuggestions,
  outstandingBalance,
  createWalkInPending,
  inr,
  onCreateWalkIn,
  onChangeCustomer,
  onCustomerQueryChange,
  onCustomerInputFocus,
  onCustomerInputBlur,
  onSelectSuggestion,
  onAddNewCustomer,
}: CustomerSectionProps) {
  return (
    <View className="mt-2 mb-2">
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="person-outline" size={14} color={COLORS.slate[500]} />
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Customer
          </Text>
        </View>
        {!selectedCustomer && (
          <TouchableOpacity
            onPress={onCreateWalkIn}
            disabled={createWalkInPending}
            className="flex-row items-center gap-1 px-2 py-1 rounded-lg border border-primary/40 bg-primary/10"
          >
            {createWalkInPending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="cart-outline" size={14} color={COLORS.primary} />
            )}
            <Text className="text-xs font-semibold text-primary">Walk-in</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedCustomer ? (
        <View className="flex-row items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-3">
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-800">
              {selectedCustomer.name}
            </Text>
            {selectedCustomer.phone && (
              <Text className="text-xs text-slate-500 mt-0.5">
                {selectedCustomer.phone}
              </Text>
            )}
            {outstandingBalance > 0 && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Ionicons name="warning-outline" size={12} color={COLORS.warning} />
                <Text className="text-xs font-semibold text-amber-600">
                  ₹{inr(outstandingBalance)} outstanding
                </Text>
              </View>
            )}
            {outstandingBalance < 0 && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={12}
                  color={COLORS.success}
                />
                <Text className="text-xs font-semibold text-green-600">
                  ₹{inr(Math.abs(outstandingBalance))} advance credit
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={onChangeCustomer}
            className="border border-slate-300 rounded-lg px-3 py-2 ml-2"
          >
            <Text className="text-xs text-slate-500 font-medium">Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View className="flex-row items-center border border-slate-200 rounded-xl bg-white px-3">
            <Ionicons
              name="search"
              size={18}
              color={COLORS.slate[400]}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={customerQuery}
              onChangeText={onCustomerQueryChange}
              onFocus={onCustomerInputFocus}
              onBlur={onCustomerInputBlur}
              placeholder="Search customer… (blank = Walk-in)"
              placeholderTextColor={COLORS.slate[400]}
              className="flex-1 h-12 text-sm text-slate-800"
            />
            {searchingCustomers && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
          </View>

          {showCustSuggest && customerQuery.length >= 1 && (
            <View className="border border-slate-200 rounded-xl mt-1 bg-white shadow-sm overflow-hidden">
              {customerSuggestions.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => onSelectSuggestion(c)}
                  className="flex-row items-center px-3 py-3 border-b border-slate-100 last:border-0"
                >
                  <Text className="text-sm font-medium text-slate-800 flex-1">
                    {c.name}
                  </Text>
                  {c.phone && (
                    <Text className="text-xs text-slate-500">{c.phone}</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => onAddNewCustomer(customerQuery.trim())}
                className="flex-row items-center px-3 py-3 border-t border-slate-100 bg-primary/10"
              >
                <Text className="text-sm text-primary font-semibold">
                  ➕ Add "{customerQuery}" as new customer
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {customerQuery.length === 0 && (
            <Text className="text-xs text-slate-400 mt-1 pl-1">
              Leave blank → Walk-in customer
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
