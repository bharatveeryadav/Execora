/**
 * FeedbackScreen — NPS (0–10) + optional text feedback.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { feedbackApi } from "../lib/api";
import { Button } from "../components/ui/Button";

const NPS_LABELS: Record<number, string> = {
  0: "Not at all likely",
  5: "Neutral",
  10: "Extremely likely",
};

export function FeedbackScreen() {
  const navigation = useNavigation();
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () =>
      feedbackApi.submit({
        npsScore: npsScore!,
        text: text.trim() || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      Alert.alert("Error", err?.message ?? "Failed to submit feedback");
    },
  });

  const handleSubmit = () => {
    if (npsScore === null) {
      Alert.alert("Select a score", "Please select how likely you are to recommend Execora (0–10).");
      return;
    }
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🙏</Text>
          <Text className="text-xl font-bold text-slate-800 text-center mb-2">
            Thank you for your feedback!
          </Text>
          <Text className="text-slate-500 text-center mb-6">
            We value your input and use it to make Execora better.
          </Text>
          <Button onPress={() => navigation.goBack()} variant="outline">
            Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Feedback</Text>
      </View>

      <View className="px-6 py-6">
        <Text className="text-sm text-slate-600 mb-6">
          How likely are you to recommend Execora to a friend or colleague?
        </Text>

        {/* NPS 0–10 */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setNpsScore(n)}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                npsScore === n ? "bg-primary" : "bg-slate-100"
              }`}
            >
              <Text className={npsScore === n ? "text-white font-semibold" : "text-slate-600 font-semibold"}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {npsScore !== null && NPS_LABELS[npsScore] && (
          <Text className="text-center text-xs text-slate-500 mb-6">{NPS_LABELS[npsScore]}</Text>
        )}

        {/* Optional text */}
        <Text className="text-sm font-medium text-slate-600 mb-2">Anything else? (optional)</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What do you love? What could be better?"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          maxLength={2000}
          className="border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white min-h-[100px]"
          textAlignVertical="top"
        />
        <Text className="text-xs text-slate-400 mb-6">{text.length}/2000</Text>

        <Button
          onPress={handleSubmit}
          loading={submitMutation.isPending}
          disabled={npsScore === null}
        >
          Submit Feedback
        </Button>
      </View>
    </SafeAreaView>
  );
}
