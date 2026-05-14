import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { usePools } from "../src/hooks/useData";
import { useStore } from "../src/lib/store";
import { api } from "../src/lib/api";
import { COLORS, FONTS, RADIUS } from "../src/lib/theme";

interface Message {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  ts:      string;
}

const STARTER_PROMPTS = [
  "My pool water is green — what do I do?",
  "Chlorine is high but pH looks fine, still cloudy",
  "Salt cell showing low output, how do I fix it?",
  "Filter pressure keeps rising every few days",
  "Pool losing about 1 inch of water per week",
  "White scale buildup on tiles and waterline",
];

export default function DiagnosticScreen() {
  const company    = useStore((s) => s.company);
  const { data: poolsData } = usePools();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [poolId,    setPoolId]    = useState<number | null>(null);
  const [loading,   setLoading]   = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const pools = poolsData?.pools ?? [];

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id:      Date.now().toString(),
      role:    "user",
      content,
      ts:      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post<{ reply: string; sessionId: string }>(
        "/api/diagnostic",
        {
          sessionId,
          message:   content,
          poolId,
          companyId: company?.id,
          context:   "tech",
        }
      );

      if (!sessionId) setSessionId(res.sessionId);

      const aiMsg: Message = {
        id:      (Date.now() + 1).toString(),
        role:    "assistant",
        content: res.reply,
        ts:      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      const errMsg: Message = {
        id:      (Date.now() + 1).toString(),
        role:    "assistant",
        content: `Sorry, I couldn't connect to the AI service. Check your connection and try again.\n\n(${err.message ?? "Unknown error"})`,
        ts:      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setSessionId(null);
    setPoolId(null);
    setInput("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>AI Diagnostic</Text>
              <Text style={styles.sub}>Powered by Claude · Pool expert</Text>
            </View>
            {messages.length > 0 && (
              <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetBtnText}>New Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Pool selector */}
        {pools.length > 0 && (
          <View style={styles.poolBar}>
            <Text style={styles.poolBarLabel}>Pool context:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.poolChip, !poolId && styles.poolChipActive]}
                onPress={() => setPoolId(null)}
              >
                <Text style={[styles.poolChipText, !poolId && styles.poolChipTextActive]}>General</Text>
              </TouchableOpacity>
              {pools.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.poolChip, poolId === p.id && styles.poolChipActive]}
                  onPress={() => setPoolId(p.id)}
                >
                  <Text style={[styles.poolChipText, poolId === p.id && styles.poolChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>🤖</Text>
              <Text style={styles.emptyChatTitle}>Pool AI Diagnostic</Text>
              <Text style={styles.emptyChatSub}>
                Ask me anything about water chemistry, equipment issues, algae, or maintenance.
                I have deep knowledge of PoolPal Protocol compliance ranges.
              </Text>

              <Text style={styles.starterLabel}>Common issues:</Text>
              <View style={styles.starters}>
                {STARTER_PROMPTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.starterBtn}
                    onPress={() => send(p)}
                  >
                    <Text style={styles.starterText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === "user" ? styles.bubbleUser : styles.bubbleAI,
                ]}
              >
                {msg.role === "assistant" && (
                  <Text style={styles.bubbleLabel}>🤖 AI</Text>
                )}
                <Text style={[
                  styles.bubbleText,
                  msg.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAI,
                ]}>
                  {msg.content}
                </Text>
                <Text style={[
                  styles.bubbleTs,
                  msg.role === "user" ? styles.bubbleTsUser : styles.bubbleTsAI,
                ]}>
                  {msg.ts}
                </Text>
              </View>
            ))
          )}

          {loading && (
            <View style={[styles.bubble, styles.bubbleAI]}>
              <Text style={styles.bubbleLabel}>🤖 AI</Text>
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>Analyzing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe the pool issue..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText:         { color: COLORS.primary, fontSize: FONTS.sm, fontWeight: "600", marginBottom: 6 },
  headerRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title:            { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text },
  sub:              { fontSize: 12, color: COLORS.textSecond, marginTop: 2 },
  resetBtn:         { backgroundColor: COLORS.borderLight, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  resetBtnText:     { fontSize: FONTS.sm, fontWeight: "600", color: COLORS.textSecond },
  poolBar:          { flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingVertical: 8, gap: 8, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  poolBarLabel:     { fontSize: 11, fontWeight: "600", color: COLORS.textLight },
  poolChip:         { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, backgroundColor: "#fff" },
  poolChipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  poolChipText:     { fontSize: 12, color: COLORS.textSecond, fontWeight: "600" },
  poolChipTextActive:{ color: "#fff" },
  chatArea:         { flex: 1 },
  chatContent:      { padding: 16, paddingBottom: 8 },
  emptyChat:        { alignItems: "center", paddingTop: 24 },
  emptyChatEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyChatTitle:   { fontSize: FONTS.xl, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  emptyChatSub:     { fontSize: FONTS.sm, color: COLORS.textSecond, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  starterLabel:     { alignSelf: "flex-start", fontSize: FONTS.sm, fontWeight: "700", color: COLORS.textSecond, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  starters:         { width: "100%", gap: 8 },
  starterBtn:       { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  starterText:      { fontSize: FONTS.sm, color: COLORS.text },
  bubble:           { borderRadius: RADIUS.lg, padding: 12, marginBottom: 10, maxWidth: "85%" },
  bubbleUser:       { backgroundColor: COLORS.primary, alignSelf: "flex-end" },
  bubbleAI:         { backgroundColor: "#fff", alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.borderLight, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  bubbleLabel:      { fontSize: 11, fontWeight: "700", color: COLORS.textSecond, marginBottom: 4 },
  bubbleText:       { fontSize: FONTS.base, lineHeight: 22 },
  bubbleTextUser:   { color: "#fff" },
  bubbleTextAI:     { color: COLORS.text },
  bubbleTs:         { fontSize: 10, marginTop: 4 },
  bubbleTsUser:     { color: "rgba(255,255,255,0.6)", textAlign: "right" },
  bubbleTsAI:       { color: COLORS.textLight },
  typingRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText:       { fontSize: FONTS.sm, color: COLORS.textSecond },
  inputRow:         { flexDirection: "row", gap: 8, padding: 12, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: "flex-end" },
  input:            { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: FONTS.base, color: COLORS.text, maxHeight: 100 },
  sendBtn:          { width: 44, height: 44, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled:  { opacity: 0.4 },
  sendBtnText:      { color: "#fff", fontSize: 20, fontWeight: "700" },
});
